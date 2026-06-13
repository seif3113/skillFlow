"""
Shared utility functions for all platform scrapers.
Platform-specific utils import from here and add their own functions.
"""

import re
import hashlib
import math
import time
from typing import Optional, List, Dict, Any
from datetime import datetime
import unicodedata


def clean_text(text: str) -> str:
    """Clean and normalize text content."""
    if not text:
        return ""
    text = unicodedata.normalize("NFKD", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


MISSING_TEXT_TOKENS = {"none", "null", "nan", "n/a", "na", "undefined"}


def normalize_optional_text(value: Any, max_len: Optional[int] = None) -> str:
    """Normalize text-like values and coerce missing tokens to empty string."""
    if value is None:
        return ""
    text = clean_text(str(value))
    if not text:
        return ""
    if text.lower() in MISSING_TEXT_TOKENS:
        return ""
    if max_len is not None:
        return text[:max_len]
    return text


def _first_sentence(text: str, max_len: int = 1200) -> str:
    if not text:
        return ""
    first = re.split(r"(?<=[.!?])\s+", text, maxsplit=1)[0]
    return normalize_optional_text(first, max_len=max_len)


def ensure_headline_description_fields(data: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure at least one of headline/description is always populated."""
    normalized = dict(data)

    title = normalize_optional_text(normalized.get("title"), max_len=500)
    headline = normalize_optional_text(normalized.get("headline"), max_len=1200)
    description = normalize_optional_text(normalized.get("description"), max_len=7000)

    if not headline and description:
        headline = _first_sentence(description, max_len=1200)
    if not headline and title:
        headline = title

    if not description:
        provider = normalize_optional_text(
            normalized.get("instructor_name")
            or normalized.get("institution")
            or normalized.get("channel_name"),
            max_len=220,
        )
        category = normalize_optional_text(normalized.get("category"), max_len=120)
        parts: List[str] = []

        if headline:
            parts.append(f"{headline.rstrip('.')}.")
        elif title:
            parts.append(f"{title.rstrip('.')}.")

        if provider:
            parts.append(f"Provider: {provider}.")
        if category:
            parts.append(f"Category: {category}.")

        description = normalize_optional_text(" ".join(parts), max_len=7000)

    if not description and headline:
        description = headline

    normalized["headline"] = headline
    normalized["description"] = description
    return normalized


def extract_number(text: str) -> int:
    """Extract a number from text."""
    if not text:
        return 0
    text = text.replace(",", "")
    match = re.search(r"[\d.]+", text)
    if match:
        try:
            return int(float(match.group()))
        except ValueError:
            return 0
    return 0


def generate_course_id(url: str, pattern: str = r"/course/([^/]+)") -> int:
    """Generate a unique course ID from URL using a regex pattern to extract the slug."""
    if not url:
        return 0
    match = re.search(pattern, url)
    slug = match.group(1) if match else url
    hash_obj = hashlib.md5(slug.encode())
    return int(hash_obj.hexdigest()[:8], 16)


def slugify(text: str) -> str:
    """Convert text to URL-safe slug."""
    if not text:
        return ""
    text = text.lower().replace(" ", "-")
    text = re.sub(r"[^a-z0-9-]", "", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


def truncate_text(text: str, max_length: int = 500, suffix: str = "...") -> str:
    """Truncate text to a maximum length."""
    if not text or len(text) <= max_length:
        return text or ""
    truncated = text[: max_length - len(suffix)]
    last_space = truncated.rfind(" ")
    if last_space > max_length * 0.7:
        truncated = truncated[:last_space]
    return truncated + suffix


def validate_url(url: str) -> bool:
    """Validate if a URL is properly formatted."""
    if not url:
        return False
    pattern = re.compile(
        r"^https?://"
        r"(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|"
        r"localhost|"
        r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})"
        r"(?::\d+)?"
        r"(?:/?|[/?]\S+)$",
        re.IGNORECASE,
    )
    return bool(pattern.match(url))


def categorize_level(level: str) -> str:
    """Normalize course level to standard categories."""
    if not level:
        return "Unknown"
    level_lower = level.lower()
    if any(w in level_lower for w in ["beginner", "introductory", "basic", "start"]):
        return "Beginner"
    elif any(w in level_lower for w in ["intermediate", "middle"]):
        return "Intermediate"
    elif any(w in level_lower for w in ["advanced", "expert", "professional"]):
        return "Advanced"
    elif any(w in level_lower for w in ["mixed", "all", "everyone", "any"]):
        return "All Levels"
    return level.title()


def calculate_popularity_score(
    rating: float = 0,
    num_reviews: int = 0,
    num_enrolled: int = 0,
) -> float:
    """Calculate a popularity score (0-100) from rating, reviews, and enrollment."""
    rating_score = (rating / 5.0) * 30
    reviews_score = min(30, math.log10(num_reviews + 1) * 10)
    enrolled_score = min(40, math.log10(num_enrolled + 1) * 10)
    return round(rating_score + reviews_score + enrolled_score, 2)


def deduplicate_courses(
    courses: List[Dict[str, Any]], key: str = "url"
) -> List[Dict[str, Any]]:
    """Remove duplicate courses based on a key field."""
    seen = set()
    unique = []
    for course in courses:
        value = course.get(key)
        if value and value not in seen:
            seen.add(value)
            unique.append(course)
    return unique


def parse_enrollment_count(text: str) -> int:
    """Parse enrollment count from text like '1.2M', '500K', '10,000'."""
    if not text:
        return 0
    text = text.strip().replace(",", "")
    match = re.search(r"([\d.]+)\s*[Mm]", text)
    if match:
        return int(float(match.group(1)) * 1_000_000)
    match = re.search(r"([\d.]+)\s*[Kk]", text)
    if match:
        return int(float(match.group(1)) * 1_000)
    match = re.search(r"([\d]+)", text)
    if match:
        return int(match.group(1))
    return 0


class RateLimiter:
    """Simple rate limiter using token bucket algorithm."""

    def __init__(self, rate: float = 1.0, per: float = 1.0):
        self.rate = rate
        self.per = per
        self.tokens = rate
        self.last_update = datetime.now()

    def acquire(self) -> float:
        now = datetime.now()
        elapsed = (now - self.last_update).total_seconds()
        self.tokens = min(self.rate, self.tokens + elapsed * (self.rate / self.per))
        self.last_update = now
        wait_time = 0.0
        if self.tokens < 1:
            wait_time = (1 - self.tokens) * (self.per / self.rate)
            time.sleep(wait_time)
            self.tokens = 1
        self.tokens -= 1
        return wait_time
