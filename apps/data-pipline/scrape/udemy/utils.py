"""
Utility functions for the Udemy scraper.

Common helpers are imported from the shared module.
Only Udemy-specific helpers are defined here.
"""

from shared.utils import (
    clean_text,
    extract_number,
    generate_course_id,
    slugify,
    truncate_text,
    validate_url,
    categorize_level,
    calculate_popularity_score,
    deduplicate_courses,
    RateLimiter,
)

import re
from typing import Optional
from datetime import datetime

__all__ = [
    # Re-exported from shared
    "clean_text",
    "extract_number",
    "generate_course_id",
    "slugify",
    "truncate_text",
    "validate_url",
    "categorize_level",
    "calculate_popularity_score",
    "deduplicate_courses",
    "RateLimiter",
    # Udemy-specific
    "extract_price",
    "extract_duration",
    "parse_date",
]


# ---------------------------------------------------------------------------
# Udemy-specific helpers
# ---------------------------------------------------------------------------


def extract_price(text: str) -> Optional[float]:
    """Extract price from text, handling different currency formats."""
    if not text:
        return None
    if "free" in text.lower():
        return 0.0
    match = re.search(r"[\d,]+\.?\d*", text.replace(",", ""))
    if match:
        try:
            return float(match.group().replace(",", ""))
        except ValueError:
            return None
    return None


def extract_duration(text: str) -> float:
    """Extract duration in hours from text."""
    if not text:
        return 0.0
    hours = 0.0
    hours_match = re.search(r"([\d.]+)\s*(?:hour|hr|h)", text, re.IGNORECASE)
    if hours_match:
        hours += float(hours_match.group(1))
    minutes_match = re.search(r"([\d.]+)\s*(?:minute|min|m)", text, re.IGNORECASE)
    if minutes_match:
        hours += float(minutes_match.group(1)) / 60
    return hours


def parse_date(date_str: str) -> Optional[datetime]:
    """Parse date string to datetime object."""
    if not date_str:
        return None
    formats = ["%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%B %Y", "%b %Y", "%Y"]
    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt)
        except ValueError:
            continue
    if "ago" in date_str.lower():
        from datetime import timedelta
        if "day" in date_str:
            match = re.search(r"(\d+)", date_str)
            if match:
                return datetime.now() - timedelta(days=int(match.group(1)))
        elif "month" in date_str:
            match = re.search(r"(\d+)", date_str)
            if match:
                return datetime.now() - timedelta(days=int(match.group(1)) * 30)
    return None
