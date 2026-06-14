"""Silver ingestion pipeline: MinIO Bronze JSON -> Supabase Postgres silver schema.

Design goals:
- Idempotent object processing using silver.ingestion_ledger.
- Type 1 upsert (latest snapshot wins) on (source, canonical_url).
- Deterministic change detection using row_hash over material fields.
- Quarantine invalid rows while allowing DAG success.
- Optional copy-to-processed archive in MinIO without deleting Bronze raw data.
"""

import hashlib
import json
import logging
import math
import os
import re
import socket
from datetime import datetime, timezone
from pathlib import Path
from time import perf_counter
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

import boto3
import psycopg2
from psycopg2 import errors as pg_errors
from psycopg2.extras import Json

logger = logging.getLogger(__name__)

S3_ENDPOINT = os.environ.get("MINIO_ENDPOINT", "http://host.docker.internal:9000")
AWS_ACCESS_KEY = os.environ.get("MINIO_ACCESS_KEY", "minioadmin")
AWS_SECRET_KEY = os.environ.get("MINIO_SECRET_KEY", "minioadmin")
BUCKET_NAME = os.environ.get("MINIO_BRONZE_BUCKET", "bronze")
ARCHIVE_PROCESSED = os.environ.get("SILVER_ARCHIVE_PROCESSED", "true").lower() == "true"
MAX_OBJECTS_DEFAULT = int(os.environ.get("SILVER_MAX_OBJECTS", "0"))

# DB session tuning for long-running ETL statements.
DB_CONNECT_TIMEOUT_SECONDS = int(
    os.environ.get("SILVER_DB_CONNECT_TIMEOUT_SECONDS", "15")
)
DB_STATEMENT_TIMEOUT_MS = int(os.environ.get("SILVER_DB_STATEMENT_TIMEOUT_MS", "0"))
DB_LOCK_TIMEOUT_MS = int(os.environ.get("SILVER_DB_LOCK_TIMEOUT_MS", "0"))
DB_IDLE_IN_TX_TIMEOUT_MS = int(
    os.environ.get("SILVER_DB_IDLE_IN_TX_TIMEOUT_MS", "600000")
)
LOG_PROGRESS_EVERY = int(os.environ.get("SILVER_LOG_PROGRESS_EVERY", "200"))
SLOW_STAGE_SECONDS = float(os.environ.get("SILVER_SLOW_STAGE_SECONDS", "30"))


def _get_s3_client():
    from botocore.config import Config

    config = Config(connect_timeout=10, read_timeout=30, retries={"max_attempts": 3})

    return boto3.client(
        "s3",
        endpoint_url=S3_ENDPOINT,
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY,
        config=config,
    )


def _postgres_conn_params() -> Dict[str, Any]:
    """Resolve Supabase/Postgres connection from env vars."""
    db_url = (
        os.environ.get("SUPABASE_POOLER_URL")
        or os.environ.get("SUPABASE_DB_URL")
        or os.environ.get("DATABASE_URL")
    )
    if db_url:
        return {"dsn": db_url}

    host = os.environ.get("SUPABASE_DB_HOST") or os.environ.get("SUPABASE_HOST")
    if host and "://" in host:
        parsed_host = urlparse(host).hostname
        host = parsed_host or host
    port = int(
        os.environ.get("SUPABASE_DB_PORT") or os.environ.get("SUPABASE_PORT") or "5432"
    )
    dbname = os.environ.get("SUPABASE_DB_NAME") or os.environ.get("SUPABASE_DATABASE")
    user = os.environ.get("SUPABASE_DB_USER") or os.environ.get("SUPABASE_USER")
    password = os.environ.get("SUPABASE_DB_PASSWORD") or os.environ.get(
        "SUPABASE_PASSWORD"
    )

    missing = [
        name
        for name, value in [
            ("SUPABASE_DB_HOST/SUPABASE_HOST", host),
            ("SUPABASE_DB_NAME/SUPABASE_DATABASE", dbname),
            ("SUPABASE_DB_USER/SUPABASE_USER", user),
            ("SUPABASE_DB_PASSWORD/SUPABASE_PASSWORD", password),
        ]
        if not value
    ]
    if missing:
        raise ValueError(f"Missing Supabase connection env vars: {', '.join(missing)}")

    return {
        "host": host,
        "port": port,
        "dbname": dbname,
        "user": user,
        "password": password,
        "sslmode": os.environ.get("SUPABASE_SSLMODE", "require"),
    }


def _resolve_ipv4_hostaddr(host: str) -> Optional[str]:
    """Resolve hostname to an IPv4 address for environments without IPv6 routing."""
    try:
        infos = socket.getaddrinfo(host, None, socket.AF_INET, socket.SOCK_STREAM)
    except socket.gaierror:
        return None
    except OSError:
        return None

    for info in infos:
        sockaddr = info[4]
        if sockaddr and len(sockaddr) >= 1:
            return sockaddr[0]
    return None


def _extract_host_from_dsn(dsn: str) -> Optional[str]:
    try:
        parsed = urlparse(dsn)
    except Exception:  # noqa: BLE001
        return None
    return parsed.hostname


def _get_pg_conn():
    params = _postgres_conn_params()
    force_ipv4 = os.environ.get("SUPABASE_FORCE_IPV4", "true").lower() == "true"
    connect_timeout = DB_CONNECT_TIMEOUT_SECONDS

    def _configure_session(conn):
        with conn.cursor() as cur:
            cur.execute("SET statement_timeout = %s", (DB_STATEMENT_TIMEOUT_MS,))
            cur.execute("SET lock_timeout = %s", (DB_LOCK_TIMEOUT_MS,))
            cur.execute(
                "SET idle_in_transaction_session_timeout = %s",
                (DB_IDLE_IN_TX_TIMEOUT_MS,),
            )
        conn.commit()

    if "dsn" in params:
        dsn = params["dsn"]
        if force_ipv4:
            host = _extract_host_from_dsn(dsn)
            if host:
                hostaddr = _resolve_ipv4_hostaddr(host)
                if hostaddr:
                    logger.info("Using IPv4 hostaddr for Supabase: %s", hostaddr)
                    conn = psycopg2.connect(
                        dsn,
                        hostaddr=hostaddr,
                        connect_timeout=connect_timeout,
                    )  # nosec B608
                    _configure_session(conn)
                    return conn
        conn = psycopg2.connect(dsn, connect_timeout=connect_timeout)  # nosec B608
        _configure_session(conn)
        return conn

    if force_ipv4 and params.get("host"):
        hostaddr = _resolve_ipv4_hostaddr(str(params["host"]))
        if hostaddr:
            params["hostaddr"] = hostaddr
            logger.info("Using IPv4 hostaddr for Supabase: %s", hostaddr)

    params["connect_timeout"] = connect_timeout

    conn = psycopg2.connect(**params)
    _configure_session(conn)
    return conn


def ensure_silver_schema() -> None:
    """Idempotently create silver schema and all required tables/indexes."""
    sql_path = Path(__file__).resolve().parent / "sql" / "silver_schema.sql"
    ddl = sql_path.read_text(encoding="utf-8")

    with _get_pg_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(ddl)
        conn.commit()

    logger.info("Silver schema bootstrap completed")


def _normalize_text(value: Any, max_len: Optional[int] = None) -> Optional[str]:
    if value is None:
        return None
    if not isinstance(value, str):
        value = str(value)
    value = re.sub(r"\s+", " ", value).strip()
    if not value:
        return None
    if max_len is not None:
        return value[:max_len]
    return value


_YOUTUBE_HOST_ALIASES = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be",
}


def _canonicalize_youtube_url(parsed) -> Optional[str]:
    host = (parsed.hostname or "").lower()
    path = re.sub(r"/+", "/", parsed.path or "/")
    if path != "/":
        path = path.rstrip("/")

    if host == "youtu.be":
        video_id = _normalize_text(path.lstrip("/"), 128)
        if not video_id:
            return None
        return urlunparse(
            ("https", "www.youtube.com", "/watch", "", urlencode({"v": video_id}), "")
        )

    query_params = parse_qs(parsed.query, keep_blank_values=False)

    if path == "/watch":
        video_id = _normalize_text((query_params.get("v") or [None])[0], 128)
        playlist_id = _normalize_text((query_params.get("list") or [None])[0], 128)

        identity_params = []
        if video_id:
            identity_params.append(("v", video_id))
        if playlist_id:
            identity_params.append(("list", playlist_id))

        if not identity_params:
            return None

        query = urlencode(identity_params)
        return urlunparse(("https", "www.youtube.com", "/watch", "", query, ""))

    if path == "/playlist":
        playlist_id = _normalize_text((query_params.get("list") or [None])[0], 128)
        if not playlist_id:
            return None
        return urlunparse(
            (
                "https",
                "www.youtube.com",
                "/playlist",
                "",
                urlencode({"list": playlist_id}),
                "",
            )
        )

    return urlunparse(("https", "www.youtube.com", path, "", "", ""))


def _canonicalize_url(url: Any) -> Optional[str]:
    url = _normalize_text(url)
    if not url:
        return None
    parsed = urlparse(url)
    if not parsed.scheme:
        parsed = urlparse(f"https://{url}")
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None

    host = (parsed.hostname or "").lower()
    if host in _YOUTUBE_HOST_ALIASES:
        return _canonicalize_youtube_url(parsed)

    path = re.sub(r"/+", "/", parsed.path or "/")
    if path != "/":
        path = path.rstrip("/")

    canonical = urlunparse(
        (parsed.scheme.lower(), parsed.netloc.lower(), path, "", "", "")
    )
    return canonical


def _to_float(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().lower()
    if text in {"free", "none", "nan", "n/a", "na", "unknown"}:
        return 0.0 if text == "free" else None
    text = text.replace("$", "").replace(",", "")
    match = re.search(r"-?\d+(\.\d+)?", text)
    if not match:
        return None
    try:
        return float(match.group())
    except ValueError:
        return None


def _to_int(value: Any) -> Optional[int]:
    as_float = _to_float(value)
    if as_float is None:
        return None
    return int(as_float)


def _parse_timestamp(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        text = str(value).strip().replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(text)
        except ValueError:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _normalize_level(value: Any) -> str:
    text = (_normalize_text(value, 80) or "unknown").lower()
    if any(word in text for word in ["beginner", "intro", "basic", "starter"]):
        return "Beginner"
    if any(word in text for word in ["intermediate", "mid"]):
        return "Intermediate"
    if any(word in text for word in ["advanced", "expert", "pro"]):
        return "Advanced"
    if any(word in text for word in ["all levels", "everyone", "all"]):
        return "All Levels"
    return text.title()


def _normalize_language(value: Any) -> str:
    text = (_normalize_text(value, 30) or "english").lower()
    aliases = {
        "en": "English",
        "eng": "English",
        "english": "English",
        "ar": "Arabic",
        "arabic": "Arabic",
        "fr": "French",
        "french": "French",
    }
    return aliases.get(text, text.title())


def _to_list(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        items = value
    else:
        items = str(value).split("|")
    cleaned: List[str] = []
    for item in items:
        normalized = _normalize_text(item, 200)
        if normalized:
            cleaned.append(normalized)
    # Preserve order, remove duplicates
    return list(dict.fromkeys(cleaned))


def _compute_completeness(data: Dict[str, Any], fields: List[str]) -> float:
    populated = 0
    for field in fields:
        value = data.get(field)
        if value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        if isinstance(value, list) and not value:
            continue
        populated += 1
    return round(populated / len(fields), 4) if fields else 0.0


def _engagement_proxy(
    rating: Optional[float], num_reviews: int, num_enrolled: int
) -> float:
    rating_component = ((rating or 0.0) / 5.0) * 35
    reviews_component = min(30, math.log10(max(num_reviews, 0) + 1) * 10)
    enrolled_component = min(35, math.log10(max(num_enrolled, 0) + 1) * 10)
    return round(rating_component + reviews_component + enrolled_component, 2)


def _parse_partition_date(object_key: str) -> Optional[datetime.date]:
    match = re.search(r"year=(\d{4})/month=(\d{2})/day=(\d{2})", object_key)
    if not match:
        return None
    year, month, day = match.groups()
    try:
        return datetime(int(year), int(month), int(day)).date()
    except ValueError:
        return None


def _row_hash(material: Dict[str, Any]) -> str:
    payload = json.dumps(material, sort_keys=True, ensure_ascii=True, default=str)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _clean_and_validate(
    raw: Dict[str, Any], source_from_key: str
) -> Tuple[Optional[Dict[str, Any]], List[str]]:
    reasons: List[str] = []
    source = _normalize_text(raw.get("source") or source_from_key, 80)
    title = _normalize_text(raw.get("title"), 500)
    canonical_url = _canonicalize_url(raw.get("url"))

    if not source:
        reasons.append("missing_source")
    if not title:
        reasons.append("missing_title")
    if not canonical_url:
        reasons.append("invalid_url")

    rating = _to_float(raw.get("rating"))
    if rating is not None and (rating < 0 or rating > 5):
        reasons.append("rating_out_of_range")

    num_reviews = _to_int(raw.get("num_reviews")) or 0
    num_enrolled = (
        _to_int(raw.get("num_enrolled"))
        or _to_int(raw.get("num_subscribers"))
        or _to_int(raw.get("view_count"))
        or 0
    )

    price_normalized = _to_float(raw.get("price"))
    if price_normalized is None:
        price_normalized = _to_float(raw.get("original_price"))

    is_free_raw = raw.get("is_free")
    is_free = bool(is_free_raw) if is_free_raw is not None else False
    if price_normalized is not None and price_normalized == 0:
        is_free = True

    duration_hours = _to_float(raw.get("duration_hours"))
    if duration_hours is None:
        duration_seconds = _to_float(raw.get("duration_seconds"))
        if duration_seconds is not None:
            duration_hours = round(duration_seconds / 3600.0, 2)
        else:
            duration_weeks = _to_float(raw.get("duration_weeks"))
            hours_per_week = _to_float(raw.get("hours_per_week"))
            if duration_weeks is not None and hours_per_week is not None:
                duration_hours = round(duration_weeks * hours_per_week, 2)

    skills = _to_list(raw.get("skills"))
    objectives = _to_list(raw.get("objectives"))

    scraped_at = _parse_timestamp(raw.get("scraped_at"))
    bronze_ingested_at = _parse_timestamp(raw.get("_ingested_at"))

    if rating is None:
        if source and source.lower() == "youtube":
            rating_source = "synthetic_like_ratio"
        else:
            rating_source = "unavailable"
    elif num_reviews > 0:
        rating_source = "user_reviews"
    else:
        rating_source = "unavailable"

    cleaned = {
        "source": source,
        "canonical_url": canonical_url,
        "title": title,
        "headline": _normalize_text(raw.get("headline"), 1200),
        "description": _normalize_text(raw.get("description"), 7000),
        "rating": rating,
        "rating_source": rating_source,
        "num_reviews": num_reviews,
        "num_enrolled": num_enrolled,
        "price_normalized": price_normalized,
        "is_free": is_free,
        "instructor_name": _normalize_text(raw.get("instructor_name"), 400),
        "instructor_org": _normalize_text(
            raw.get("institution") or raw.get("channel_name"), 400
        ),
        "image_url": _normalize_text(raw.get("image_url"), 2048),
        "duration_hours": duration_hours,
        "level_normalized": _normalize_level(raw.get("level")),
        "language_normalized": _normalize_language(raw.get("language")),
        "category": _normalize_text(raw.get("category"), 200),
        "subcategory": _normalize_text(raw.get("subcategory"), 200),
        "has_certificate": (
            bool(raw.get("has_certificate"))
            if raw.get("has_certificate") is not None
            else False
        ),
        "skills": skills,
        "objectives": objectives,
        "scraped_at": scraped_at,
        "bronze_ingested_at": bronze_ingested_at,
    }

    completeness_fields = [
        "title",
        "headline",
        "description",
        "rating",
        "num_reviews",
        "num_enrolled",
        "price_normalized",
        "instructor_name",
        "duration_hours",
        "level_normalized",
        "language_normalized",
        "category",
        "subcategory",
        "skills",
        "objectives",
    ]

    cleaned["title_length"] = len(cleaned["title"] or "")
    cleaned["description_length"] = len(cleaned["description"] or "")
    cleaned["completeness_score"] = _compute_completeness(cleaned, completeness_fields)
    cleaned["engagement_proxy"] = _engagement_proxy(
        cleaned["rating"], cleaned["num_reviews"], cleaned["num_enrolled"]
    )

    source_course_key = (
        f"{source.lower()}||{canonical_url}" if source and canonical_url else None
    )
    cleaned["source_course_key"] = source_course_key

    hash_payload = {
        "title": cleaned["title"],
        "headline": cleaned["headline"],
        "description": cleaned["description"],
        "rating": cleaned["rating"],
        "num_reviews": cleaned["num_reviews"],
        "num_enrolled": cleaned["num_enrolled"],
        "price_normalized": cleaned["price_normalized"],
        "is_free": cleaned["is_free"],
        "instructor_name": cleaned["instructor_name"],
        "instructor_org": cleaned["instructor_org"],
        "duration_hours": cleaned["duration_hours"],
        "level_normalized": cleaned["level_normalized"],
        "language_normalized": cleaned["language_normalized"],
        "category": cleaned["category"],
        "subcategory": cleaned["subcategory"],
        "has_certificate": cleaned["has_certificate"],
        "skills": cleaned["skills"],
        "objectives": cleaned["objectives"],
    }
    cleaned["row_hash"] = _row_hash(hash_payload)

    return (cleaned if not reasons else None), reasons


def _list_bronze_objects(s3, max_objects: int = 0) -> List[Dict[str, Any]]:
    objects: List[Dict[str, Any]] = []
    token: Optional[str] = None

    while True:
        kwargs: Dict[str, Any] = {"Bucket": BUCKET_NAME, "MaxKeys": 1000}
        if token:
            kwargs["ContinuationToken"] = token
        response = s3.list_objects_v2(**kwargs)
        for item in response.get("Contents", []):
            key = item.get("Key")
            if not key or not key.endswith(".json"):
                continue
            if key.startswith("processed/"):
                continue
            source = key.split("/", 1)[0]
            if source not in {
                "udemy",
                "coursera",
                "w3schools",
                "khan_academy",
                "youtube",
            }:
                continue
            objects.append(item)
            if max_objects > 0 and len(objects) >= max_objects:
                return objects

        if not response.get("IsTruncated"):
            break
        token = response.get("NextContinuationToken")

    return objects


def _load_already_loaded(cur) -> set:
    cur.execute(
        """
        SELECT object_key, etag
        FROM silver.ingestion_ledger
        WHERE status IN ('loaded', 'quarantined')
        """
    )
    return {(row[0], row[1]) for row in cur.fetchall()}


def _archive_processed_objects(s3, keys: List[str]) -> int:
    archived = 0
    for key in keys:
        target_key = f"processed/{key}"
        try:
            s3.head_object(Bucket=BUCKET_NAME, Key=target_key)
            continue
        except Exception:
            pass

        s3.copy_object(
            Bucket=BUCKET_NAME,
            CopySource={"Bucket": BUCKET_NAME, "Key": key},
            Key=target_key,
            ContentType="application/json",
        )
        archived += 1
    return archived


def run_silver_ingestion(
    dag_run_id: Optional[str] = None, max_objects: Optional[int] = None
) -> Dict[str, Any]:
    """Run the Silver ingestion pipeline end-to-end."""
    pipeline_started = perf_counter()

    def _log_stage(stage: str, started: float, **extra):
        elapsed = perf_counter() - started
        payload = {"stage": stage, "seconds": round(elapsed, 3), **extra}
        if elapsed >= SLOW_STAGE_SECONDS:
            logger.warning("[SILVER_TIMING] %s", payload)
        else:
            logger.info("[SILVER_TIMING] %s", payload)

    logger.info(
        "[SILVER_RUN] start dag_run_id=%s max_objects=%s",
        dag_run_id,
        max_objects,
    )

    s3 = _get_s3_client()
    max_to_read = MAX_OBJECTS_DEFAULT if max_objects is None else max_objects

    metrics = {
        "discovered_objects": 0,
        "new_objects": 0,
        "processed_objects": 0,
        "valid_rows": 0,
        "quarantined_rows": 0,
        "failed_objects": 0,
        "inserted_rows": 0,
        "updated_rows": 0,
        "unchanged_rows": 0,
        "deduped_rows": 0,
        "archived_objects": 0,
    }

    with _get_pg_conn() as conn:
        stage_started = perf_counter()
        conn.autocommit = False
        with conn.cursor() as cur:
            # Apply timeouts inside the active transaction. This is important when
            # connecting through poolers that may reset session-level settings.
            cur.execute("SET statement_timeout = %s", (DB_STATEMENT_TIMEOUT_MS,))
            cur.execute("SET lock_timeout = %s", (DB_LOCK_TIMEOUT_MS,))
            cur.execute(
                "SET idle_in_transaction_session_timeout = %s",
                (DB_IDLE_IN_TX_TIMEOUT_MS,),
            )
            logger.info(
                "[SILVER_DB_SETTINGS] statement_timeout_ms=%s lock_timeout_ms=%s idle_in_tx_timeout_ms=%s",
                DB_STATEMENT_TIMEOUT_MS,
                DB_LOCK_TIMEOUT_MS,
                DB_IDLE_IN_TX_TIMEOUT_MS,
            )

            cur.execute(
                """
                INSERT INTO silver.pipeline_runs (dag_run_id)
                VALUES (%s)
                RETURNING run_id
                """,
                (dag_run_id,),
            )
            run_id = cur.fetchone()[0]
            _log_stage("create_pipeline_run", stage_started, run_id=run_id)

            stage_started = perf_counter()
            loaded_pairs = _load_already_loaded(cur)
            discovered = _list_bronze_objects(s3, max_to_read)
            metrics["discovered_objects"] = len(discovered)

            pending = []
            for obj in discovered:
                etag = str(obj.get("ETag", "")).strip('"')
                key = obj.get("Key")
                if not key:
                    continue
                if (key, etag) in loaded_pairs:
                    continue
                pending.append(obj)

            metrics["new_objects"] = len(pending)
            _log_stage(
                "discover_and_filter_objects",
                stage_started,
                discovered=metrics["discovered_objects"],
                already_loaded=len(loaded_pairs),
                pending=metrics["new_objects"],
            )

            candidate_by_identity: Dict[Tuple[str, str], Dict[str, Any]] = {}
            quarantined_entries: List[Dict[str, Any]] = []
            failed_entries: List[Dict[str, Any]] = []
            valid_candidate_keys: set = set()

            stage_started = perf_counter()
            for idx, obj in enumerate(pending, start=1):
                key = obj["Key"]
                etag = str(obj.get("ETag", "")).strip('"')
                source_from_key = key.split("/", 1)[0]
                partition_date = _parse_partition_date(key)

                try:
                    payload = (
                        s3.get_object(Bucket=BUCKET_NAME, Key=key)["Body"]
                        .read()
                        .decode("utf-8")
                    )
                    raw = json.loads(payload)

                    cleaned, reasons = _clean_and_validate(raw, source_from_key)
                    if reasons:
                        quarantined_entries.append(
                            {
                                "source": source_from_key,
                                "object_key": key,
                                "etag": etag,
                                "partition_date": partition_date,
                                "reasons": reasons,
                                "payload": raw,
                            }
                        )
                        continue

                    assert cleaned is not None
                    identity = (cleaned["source"], cleaned["canonical_url"])
                    existing = candidate_by_identity.get(identity)
                    candidate = {
                        "record": cleaned,
                        "source": source_from_key,
                        "object_key": key,
                        "etag": etag,
                        "partition_date": partition_date,
                    }

                    if not existing:
                        candidate_by_identity[identity] = candidate
                    else:
                        prev_ts = existing["record"].get(
                            "scraped_at"
                        ) or datetime.min.replace(tzinfo=timezone.utc)
                        curr_ts = cleaned.get("scraped_at") or datetime.min.replace(
                            tzinfo=timezone.utc
                        )
                        if curr_ts >= prev_ts:
                            candidate_by_identity[identity] = candidate

                    valid_candidate_keys.add(key)
                    metrics["valid_rows"] += 1
                except Exception as exc:  # noqa: BLE001
                    failed_entries.append(
                        {
                            "source": source_from_key,
                            "object_key": key,
                            "etag": etag,
                            "partition_date": partition_date,
                            "reason": f"object_read_or_parse_failed: {exc}",
                        }
                    )

                if LOG_PROGRESS_EVERY > 0 and idx % LOG_PROGRESS_EVERY == 0:
                    logger.info(
                        "[SILVER_PROGRESS] parsed=%s/%s valid=%s quarantined=%s failed=%s",
                        idx,
                        len(pending),
                        metrics["valid_rows"],
                        len(quarantined_entries),
                        len(failed_entries),
                    )

            _log_stage(
                "parse_clean_validate",
                stage_started,
                pending=len(pending),
                valid=metrics["valid_rows"],
                quarantined=len(quarantined_entries),
                failed=len(failed_entries),
            )

            winners = list(candidate_by_identity.values())
            metrics["deduped_rows"] = max(metrics["valid_rows"] - len(winners), 0)

            winner_keys = {w["object_key"] for w in winners}
            deduped_losers = [
                obj
                for obj in pending
                if obj.get("Key") is not None
                and obj.get("Key") in valid_candidate_keys
                and obj.get("Key") not in winner_keys
            ]

            changed_courses: Dict[int, Dict[str, List[str]]] = {}
            loaded_keys_for_archive: List[str] = []

            upsert_sql = """
                INSERT INTO silver.courses (
                    source, source_course_key, canonical_url, row_hash,
                    title, headline, description, rating, rating_source,
                    num_reviews, num_enrolled, price_normalized, is_free,
                    instructor_name, instructor_org, image_url, duration_hours,
                    level_normalized, language_normalized, category, subcategory,
                    has_certificate, engagement_proxy, completeness_score,
                    title_length, description_length, scraped_at, bronze_ingested_at,
                    loaded_at, updated_at
                ) VALUES (
                    %(source)s, %(source_course_key)s, %(canonical_url)s, %(row_hash)s,
                    %(title)s, %(headline)s, %(description)s, %(rating)s, %(rating_source)s,
                    %(num_reviews)s, %(num_enrolled)s, %(price_normalized)s, %(is_free)s,
                    %(instructor_name)s, %(instructor_org)s, %(image_url)s, %(duration_hours)s,
                    %(level_normalized)s, %(language_normalized)s, %(category)s, %(subcategory)s,
                    %(has_certificate)s, %(engagement_proxy)s, %(completeness_score)s,
                    %(title_length)s, %(description_length)s, %(scraped_at)s, %(bronze_ingested_at)s,
                    NOW(), NOW()
                )
                ON CONFLICT (source, canonical_url)
                DO UPDATE SET
                    source_course_key = EXCLUDED.source_course_key,
                    row_hash = EXCLUDED.row_hash,
                    title = EXCLUDED.title,
                    headline = EXCLUDED.headline,
                    description = EXCLUDED.description,
                    rating = EXCLUDED.rating,
                    rating_source = EXCLUDED.rating_source,
                    num_reviews = EXCLUDED.num_reviews,
                    num_enrolled = EXCLUDED.num_enrolled,
                    price_normalized = EXCLUDED.price_normalized,
                    is_free = EXCLUDED.is_free,
                    instructor_name = EXCLUDED.instructor_name,
                    instructor_org = EXCLUDED.instructor_org,
                    image_url = EXCLUDED.image_url,
                    duration_hours = EXCLUDED.duration_hours,
                    level_normalized = EXCLUDED.level_normalized,
                    language_normalized = EXCLUDED.language_normalized,
                    category = EXCLUDED.category,
                    subcategory = EXCLUDED.subcategory,
                    has_certificate = EXCLUDED.has_certificate,
                    engagement_proxy = EXCLUDED.engagement_proxy,
                    completeness_score = EXCLUDED.completeness_score,
                    title_length = EXCLUDED.title_length,
                    description_length = EXCLUDED.description_length,
                    scraped_at = EXCLUDED.scraped_at,
                    bronze_ingested_at = EXCLUDED.bronze_ingested_at,
                    updated_at = NOW()
                WHERE silver.courses.row_hash IS DISTINCT FROM EXCLUDED.row_hash
                RETURNING course_sk, (xmax = 0) AS inserted
            """

            stage_started = perf_counter()
            for idx, winner in enumerate(winners, start=1):
                record = winner["record"]
                try:
                    cur.execute(upsert_sql, record)
                except pg_errors.QueryCanceled as exc:
                    logger.error(
                        "[SILVER_UPSERT_TIMEOUT] idx=%s/%s source=%s url=%s object_key=%s title=%s error=%s",
                        idx,
                        len(winners),
                        record.get("source"),
                        record.get("canonical_url"),
                        winner.get("object_key"),
                        (record.get("title") or "")[:120],
                        str(exc),
                    )
                    raise
                returned = cur.fetchone()
                if returned is None:
                    metrics["unchanged_rows"] += 1
                else:
                    course_sk, inserted = returned
                    if inserted:
                        metrics["inserted_rows"] += 1
                    else:
                        metrics["updated_rows"] += 1
                    changed_courses[course_sk] = {
                        "skills": record["skills"],
                        "objectives": record["objectives"],
                    }
                loaded_keys_for_archive.append(winner["object_key"])

                if LOG_PROGRESS_EVERY > 0 and idx % LOG_PROGRESS_EVERY == 0:
                    logger.info(
                        "[SILVER_PROGRESS] upserted=%s/%s inserted=%s updated=%s unchanged=%s",
                        idx,
                        len(winners),
                        metrics["inserted_rows"],
                        metrics["updated_rows"],
                        metrics["unchanged_rows"],
                    )

            _log_stage(
                "upsert_courses",
                stage_started,
                winners=len(winners),
                inserted=metrics["inserted_rows"],
                updated=metrics["updated_rows"],
                unchanged=metrics["unchanged_rows"],
            )

            stage_started = perf_counter()
            total_changed = len(changed_courses)
            for idx, (course_sk, attrs) in enumerate(changed_courses.items(), 1):
                cur.execute(
                    "DELETE FROM silver.course_skills WHERE course_sk = %s",
                    (course_sk,),
                )
                cur.execute(
                    "DELETE FROM silver.course_objectives WHERE course_sk = %s",
                    (course_sk,),
                )

                for skill in attrs["skills"]:
                    cur.execute(
                        "INSERT INTO silver.course_skills(course_sk, skill) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                        (course_sk, skill),
                    )

                for objective in attrs["objectives"]:
                    cur.execute(
                        """
                        INSERT INTO silver.course_objectives(course_sk, objective)
                        VALUES (%s, %s)
                        ON CONFLICT DO NOTHING
                        """,
                        (course_sk, objective),
                    )

                if idx % LOG_PROGRESS_EVERY == 0 or idx == total_changed:
                    logger.info(
                        "[SILVER_PROGRESS] child_tables=%s/%s",
                        idx,
                        total_changed,
                    )

            _log_stage(
                "refresh_child_tables",
                stage_started,
                changed_courses=len(changed_courses),
            )

            metrics["quarantined_rows"] = len(quarantined_entries)
            metrics["failed_objects"] = len(failed_entries)
            metrics["processed_objects"] = len(pending)

            stage_started = perf_counter()
            for item in quarantined_entries:
                cur.execute(
                    """
                    INSERT INTO silver.rejected_rows (
                        run_id, source, object_key, reasons, payload
                    ) VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        run_id,
                        item["source"],
                        item["object_key"],
                        Json(item["reasons"]),
                        Json(item["payload"]),
                    ),
                )

            _log_stage(
                "insert_rejected_rows",
                stage_started,
                rejected=len(quarantined_entries),
            )

            ledger_rows = []
            for winner in winners:
                ledger_rows.append(
                    (
                        winner["record"]["source"],
                        winner["object_key"],
                        winner["etag"],
                        winner["partition_date"],
                        "loaded",
                        run_id,
                        None,
                        1,
                        0,
                    )
                )

            for loser in deduped_losers:
                key = loser.get("Key")
                if not key:
                    continue
                etag = str(loser.get("ETag", "")).strip('"')
                ledger_rows.append(
                    (
                        key.split("/", 1)[0],
                        key,
                        etag,
                        _parse_partition_date(key),
                        "loaded",
                        run_id,
                        "superseded_by_newer_record_in_same_run",
                        0,
                        0,
                    )
                )

            for item in quarantined_entries:
                ledger_rows.append(
                    (
                        item["source"],
                        item["object_key"],
                        item["etag"],
                        item["partition_date"],
                        "quarantined",
                        run_id,
                        ",".join(item["reasons"]),
                        0,
                        1,
                    )
                )

            for item in failed_entries:
                ledger_rows.append(
                    (
                        item["source"],
                        item["object_key"],
                        item["etag"],
                        item["partition_date"],
                        "failed",
                        run_id,
                        item["reason"],
                        0,
                        0,
                    )
                )

            stage_started = perf_counter()
            for row in ledger_rows:
                cur.execute(
                    """
                    INSERT INTO silver.ingestion_ledger (
                        source, object_key, etag, partition_date, status,
                        run_id, reason, processed_at, rows_loaded, rows_rejected
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), %s, %s)
                    ON CONFLICT (object_key, etag)
                    DO UPDATE SET
                        source = EXCLUDED.source,
                        partition_date = EXCLUDED.partition_date,
                        status = EXCLUDED.status,
                        run_id = EXCLUDED.run_id,
                        reason = EXCLUDED.reason,
                        processed_at = NOW(),
                        rows_loaded = EXCLUDED.rows_loaded,
                        rows_rejected = EXCLUDED.rows_rejected
                    """,
                    row,
                )

            _log_stage("upsert_ledger", stage_started, rows=len(ledger_rows))

            stage_started = perf_counter()
            cur.execute(
                """
                UPDATE silver.pipeline_runs
                SET
                    finished_at = NOW(),
                    status = %s,
                    discovered_objects = %s,
                    processed_objects = %s,
                    valid_rows = %s,
                    quarantined_rows = %s,
                    failed_objects = %s,
                    inserted_rows = %s,
                    updated_rows = %s,
                    unchanged_rows = %s,
                    deduped_rows = %s
                WHERE run_id = %s
                """,
                (
                    "succeeded",
                    metrics["discovered_objects"],
                    metrics["processed_objects"],
                    metrics["valid_rows"],
                    metrics["quarantined_rows"],
                    metrics["failed_objects"],
                    metrics["inserted_rows"],
                    metrics["updated_rows"],
                    metrics["unchanged_rows"],
                    metrics["deduped_rows"],
                    run_id,
                ),
            )

            _log_stage("update_pipeline_run", stage_started, run_id=run_id)

        stage_started = perf_counter()
        conn.commit()
        _log_stage("commit_transaction", stage_started)

    if ARCHIVE_PROCESSED and loaded_keys_for_archive:
        stage_started = perf_counter()
        metrics["archived_objects"] = _archive_processed_objects(
            s3, loaded_keys_for_archive
        )
        _log_stage(
            "archive_processed_objects",
            stage_started,
            archived=metrics["archived_objects"],
        )

    _log_stage("total_run", pipeline_started, run_id=run_id)
    logger.info("Silver ingestion metrics: %s", metrics)
    return metrics
