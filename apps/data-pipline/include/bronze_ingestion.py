"""
Bronze layer ingestion — scrapes courses and uploads raw JSON to MinIO.

Each scraper runs as an Airflow task, scrapes its platform for a single
category, converts each course to a dict, and uploads it as a JSON object
to the MinIO "bronze" bucket using Hive-style partitioning:

    <source>/year=YYYY/month=MM/day=DD/<uuid5>.json
"""

import uuid
import json
import inspect
import logging
import sys
import os
from collections import Counter
from datetime import datetime
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Ensure the scrape package is importable
# ---------------------------------------------------------------------------
SCRAPE_PKG_DIR = os.environ.get("SCRAPE_PKG_DIR", "/usr/local/airflow/scrape")
if SCRAPE_PKG_DIR not in sys.path:
    sys.path.insert(0, SCRAPE_PKG_DIR)

# --- CONFIGURATION ---
# Use the Docker Compose service name for container-to-container networking.
S3_ENDPOINT = os.environ.get("MINIO_ENDPOINT", "http://host.docker.internal:9000")
AWS_ACCESS_KEY = os.environ.get("MINIO_ACCESS_KEY", "minioadmin")
AWS_SECRET_KEY = os.environ.get("MINIO_SECRET_KEY", "minioadmin")
BUCKET_NAME = "bronze"


def _get_s3_client():
    """Return a boto3 S3 client pointing at MinIO."""
    return boto3.client(
        "s3",
        endpoint_url=S3_ENDPOINT,
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY,
    )


def _ensure_bucket(s3):
    """Create the bronze bucket if it doesn't exist."""
    try:
        s3.head_bucket(Bucket=BUCKET_NAME)
    except ClientError:
        try:
            s3.create_bucket(Bucket=BUCKET_NAME)
            logger.info(f"Created bucket: {BUCKET_NAME}")
        except ClientError:
            pass


def generate_uuid5(url: str) -> str:
    """Deterministic UUID from course URL for idempotency."""
    return str(uuid.uuid5(uuid.NAMESPACE_URL, url))


def _upload_course(s3, source_name: str, course_dict: dict, now: datetime) -> str:
    """Upload a single course dict to MinIO. Returns 'SAVED' or 'SKIPPED'."""
    url = course_dict.get("url", "")
    if not url:
        return "SKIPPED"

    resource_id = generate_uuid5(url)
    file_path = (
        f"{source_name}/"
        f"year={now.year}/month={now.strftime('%m')}/day={now.strftime('%d')}/"
        f"{resource_id}.json"
    )

    # Idempotency check
    try:
        s3.head_object(Bucket=BUCKET_NAME, Key=file_path)
        logger.info(f"[SKIP] {resource_id} already exists — {url}")
        return "SKIPPED"
    except ClientError:
        pass

    # Enrich with ingestion metadata
    course_dict["_bronze_id"] = resource_id
    course_dict["_ingested_at"] = now.isoformat()

    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=file_path,
        Body=json.dumps(course_dict, ensure_ascii=False),
        ContentType="application/json",
    )
    logger.info(f"[SAVED] {file_path}")
    return "SAVED"


# ---------------------------------------------------------------------------
# Per-platform scrape + upload functions (called by Airflow tasks)
# ---------------------------------------------------------------------------


def scrape_udemy(category: str, subcategory: str = None, max_pages: int = 3, **kwargs):
    """Scrape a Udemy category and upload each course to MinIO."""
    from udemy.scraper import UdemyScraper

    s3 = _get_s3_client()
    _ensure_bucket(s3)
    now = datetime.now()

    scraper = UdemyScraper(use_proxies=False, headless=True)
    saved, skipped = 0, 0

    try:
        for course in scraper.scrape_category(
            category=category,
            subcategory=subcategory,
            max_pages=max_pages,
        ):
            result = _upload_course(s3, "udemy", course.to_dict(), now)
            if result == "SAVED":
                saved += 1
            else:
                skipped += 1
    finally:
        scraper.close()

    logger.info(f"[UDEMY] {category}: {saved} saved, {skipped} skipped")
    return {"saved": saved, "skipped": skipped}


def scrape_coursera(
    category: str, subcategory: str = None, max_pages: int = 3, **kwargs
):
    """Scrape a Coursera category and upload each course to MinIO."""
    from coursera.scraper import CourseraScraper

    s3 = _get_s3_client()
    _ensure_bucket(s3)
    now = datetime.now()

    scraper = CourseraScraper(use_proxies=False, headless=True)
    saved, skipped = 0, 0

    try:
        for course in scraper.scrape_category(
            category=category,
            subcategory=subcategory,
            max_pages=max_pages,
        ):
            result = _upload_course(s3, "coursera", course.to_dict(), now)
            if result == "SAVED":
                saved += 1
            else:
                skipped += 1
    finally:
        scraper.close()

    logger.info(f"[COURSERA] {category}: {saved} saved, {skipped} skipped")
    return {"saved": saved, "skipped": skipped}


def scrape_w3schools(category: str, **kwargs):
    """Scrape a W3Schools category and upload each course to MinIO."""
    from w3schools.scraper import W3SchoolsScraper

    s3 = _get_s3_client()
    _ensure_bucket(s3)
    now = datetime.now()

    scraper = W3SchoolsScraper(use_proxies=False, headless=True)
    saved, skipped = 0, 0

    try:
        for course in scraper.scrape_category(category=category):
            result = _upload_course(s3, "w3schools", course.to_dict(), now)
            if result == "SAVED":
                saved += 1
            else:
                skipped += 1
    finally:
        scraper.close()

    logger.info(f"[W3SCHOOLS] {category}: {saved} saved, {skipped} skipped")
    return {"saved": saved, "skipped": skipped}


def scrape_khan_academy(category: str, **kwargs):
    """Scrape a Khan Academy category and upload each course to MinIO."""
    from khan_academy.scraper import KhanAcademyScraper

    s3 = _get_s3_client()
    _ensure_bucket(s3)
    now = datetime.now()

    scraper = KhanAcademyScraper(use_proxies=False, headless=True)
    saved, skipped = 0, 0

    try:
        for course in scraper.scrape_category(category=category):
            result = _upload_course(s3, "khan_academy", course.to_dict(), now)
            if result == "SAVED":
                saved += 1
            else:
                skipped += 1
    finally:
        scraper.close()

    logger.info(f"[KHAN] {category}: {saved} saved, {skipped} skipped")
    return {"saved": saved, "skipped": skipped}


def scrape_youtube(category: str, max_pages: int = 2, **kwargs):
    """Scrape a YouTube category and upload each course to MinIO."""
    import os
    from youtube.scraper import YouTubeScraper

    api_key = os.environ.get("YOUTUBE_API_KEY", "")
    if not api_key:
        logger.warning("[YOUTUBE] No YOUTUBE_API_KEY set — skipping")
        return {"saved": 0, "skipped": 0, "error": "no_api_key"}

    s3 = _get_s3_client()
    _ensure_bucket(s3)
    now = datetime.now()

    include_playlists = (
        os.environ.get("YOUTUBE_INCLUDE_PLAYLISTS", "true").strip().lower() == "true"
    )
    include_videos = (
        os.environ.get("YOUTUBE_INCLUDE_VIDEOS", "true").strip().lower() == "true"
    )
    search_order = os.environ.get("YOUTUBE_SEARCH_ORDER", "relevance").strip().lower()
    if search_order not in {"relevance", "date"}:
        logger.warning(
            "[YOUTUBE] Invalid YOUTUBE_SEARCH_ORDER='%s'. Falling back to 'relevance'.",
            search_order,
        )
        search_order = "relevance"

    scraper = YouTubeScraper(api_key=api_key)
    saved, skipped = 0, 0
    saved_by_type: Counter = Counter()
    skipped_by_type: Counter = Counter()

    scrape_kwargs = {
        "category": category,
        "max_pages": max_pages,
    }
    signature = inspect.signature(scraper.scrape_category)
    if {
        "include_playlists",
        "include_videos",
        "order",
    }.issubset(signature.parameters.keys()):
        scrape_kwargs.update(
            {
                "include_playlists": include_playlists,
                "include_videos": include_videos,
                "order": search_order,
            }
        )
    else:
        logger.warning(
            "[YOUTUBE] Legacy youtube.scraper detected; ignoring "
            "YOUTUBE_INCLUDE_PLAYLISTS/YOUTUBE_INCLUDE_VIDEOS/YOUTUBE_SEARCH_ORDER. "
            "Rebuild Astro image to use latest scrape package."
        )

    try:
        for course in scraper.scrape_category(**scrape_kwargs):
            content_type = getattr(course, "content_type", "unknown") or "unknown"
            result = _upload_course(s3, "youtube", course.to_dict(), now)
            if result == "SAVED":
                saved += 1
                saved_by_type[content_type] += 1
            else:
                skipped += 1
                skipped_by_type[content_type] += 1
    finally:
        scraper.close()

    logger.info(
        "[YOUTUBE] %s: %s saved, %s skipped, saved_by_type=%s, skipped_by_type=%s",
        category,
        saved,
        skipped,
        dict(saved_by_type),
        dict(skipped_by_type),
    )
    return {
        "saved": saved,
        "skipped": skipped,
        "saved_by_type": dict(saved_by_type),
        "skipped_by_type": dict(skipped_by_type),
        "search_order": search_order,
        "include_playlists": include_playlists,
        "include_videos": include_videos,
        "max_pages": max_pages,
    }
