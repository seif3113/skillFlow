"""
Configuration settings for the Udemy Selenium scraper.
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
    MIN_PAGES_PERCENTAGE,
    CHROME_EXTRA_ARGS,
)

# Base URL for Udemy
BASE_URL = "https://www.udemy.com"

# Pagination
DEFAULT_PAGE_SIZE = 24

# Popular Udemy categories (slug → display name)
CATEGORIES = {
    "development": "Development",
    "business": "Business",
    "finance-and-accounting": "Finance & Accounting",
    "it-and-software": "IT & Software",
    "office-productivity": "Office Productivity",
    "personal-development": "Personal Development",
    "design": "Design",
    "marketing": "Marketing",
    "lifestyle": "Lifestyle",
    "photography-and-video": "Photography & Video",
    "health-and-fitness": "Health & Fitness",
    "music": "Music",
    "teaching-and-academics": "Teaching & Academics",
}

# Development subcategories
DEVELOPMENT_SUBCATEGORIES = {
    "web-development": "Web Development",
    "data-science": "Data Science",
    "mobile-development": "Mobile Development",
    "programming-languages": "Programming Languages",
    "game-development": "Game Development",
    "database-design-development": "Database Design & Development",
    "software-testing": "Software Testing",
    "software-engineering": "Software Engineering",
    "software-development-tools": "Software Development Tools",
    "no-code-development": "No-Code Development",
}

# Output settings
OUTPUT_FOLDER = os.environ.get("SCRAPE_OUTPUT_DIR", "/tmp/scrape_output/udemy")
CSV_FILENAME = "udemy_courses.csv"
