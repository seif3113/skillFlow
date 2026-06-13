"""
Utility functions for the Coursera scraper.
Shared utilities are imported from shared.utils; only Coursera-specific
functions are defined here.
"""

from shared.utils import (  # noqa: F401
    clean_text,
    extract_number,
    generate_course_id,
    slugify,
    truncate_text,
    validate_url,
    categorize_level,
    calculate_popularity_score,
    deduplicate_courses,
    parse_enrollment_count,
    RateLimiter,
)

import re


def extract_duration_weeks(text: str) -> float:
    """Extract duration in weeks from text like '4 weeks', '3 months', etc."""
    if not text:
        return 0.0

    # Match weeks
    weeks_match = re.search(r"([\d.]+)\s*week", text, re.IGNORECASE)
    if weeks_match:
        return float(weeks_match.group(1))

    # Match months (convert to weeks)
    months_match = re.search(r"([\d.]+)\s*month", text, re.IGNORECASE)
    if months_match:
        return float(months_match.group(1)) * 4

    # Match hours (convert to weeks assuming ~10 hr/week)
    hours_match = re.search(r"([\d.]+)\s*hour", text, re.IGNORECASE)
    if hours_match:
        return round(float(hours_match.group(1)) / 10.0, 1)

    return 0.0


def extract_hours_per_week(text: str) -> float:
    """Extract hours per week commitment from text."""
    if not text:
        return 0.0

    match = re.search(
        r"([\d.]+)\s*[-–to]+\s*([\d.]+)\s*hours?\s*/?\s*week", text, re.IGNORECASE
    )
    if match:
        low = float(match.group(1))
        high = float(match.group(2))
        return round((low + high) / 2.0, 1)

    match = re.search(r"([\d.]+)\s*hours?\s*/?\s*week", text, re.IGNORECASE)
    if match:
        return float(match.group(1))

    return 0.0
