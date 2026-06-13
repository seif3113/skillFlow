"""
Configuration settings for the Khan Academy scraper.
"""

import os

from shared.config import (
    SELENIUM_TIMEOUT,
    PAGE_LOAD_TIMEOUT,
    IMPLICIT_WAIT,
    MAX_RETRIES,
    RETRY_DELAY,
    MIN_REQUEST_DELAY,
    MAX_REQUEST_DELAY,
    CHROME_EXTRA_ARGS,
)

# Base URL for Khan Academy
BASE_URL = "https://www.khanacademy.org"

# Khan Academy course categories (slug → display name)
CATEGORIES = {
    "math": "Math",
    "science": "Science",
    "computing": "Computing",
    "arts-and-humanities": "Arts & Humanities",
    "economics-finance-domain": "Economics & Finance",
    "ela": "Reading & Language Arts",
    "test-prep": "Test Prep",
    "college-careers-more": "College, Careers, & More",
    "partner-content": "Partner Content",
}

# Output settings
OUTPUT_FOLDER = os.environ.get("SCRAPE_OUTPUT_DIR", "/tmp/scrape_output/khan_academy")
CSV_FILENAME = "khan_academy_courses.csv"
