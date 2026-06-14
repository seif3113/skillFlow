"""
Configuration settings for the W3Schools scraper.
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

# Base URL for W3Schools
BASE_URL = "https://www.w3schools.com"

# W3Schools tutorial categories (slug → display name)
CATEGORIES = {
    "html": "HTML",
    "css": "CSS",
    "js": "JavaScript",
    "python": "Python",
    "java": "Java",
    "sql": "SQL",
    "php": "PHP",
    "c": "C",
    "cpp": "C++",
    "cs": "C#",
    "r": "R",
    "react": "React",
    "nodejs": "Node.js",
    "typescript": "TypeScript",
    "django": "Django",
    "bootstrap": "Bootstrap",
    "xml": "XML",
    "mysql": "MySQL",
    "mongodb": "MongoDB",
    "ai": "Artificial Intelligence",
    "ml": "Machine Learning",
    "datascience": "Data Science",
    "pandas": "Pandas",
    "numpy": "NumPy",
}

# Categories that offer a paid W3Schools certificate
CERT_CATEGORIES = {
    "html",
    "css",
    "js",
    "python",
    "jquery",
    "sql",
    "php",
    "java",
    "cpp",
    "cs",
    "react",
    "xml",
    "bootstrap",
}

# Output settings
OUTPUT_FOLDER = os.environ.get("SCRAPE_OUTPUT_DIR", "/tmp/scrape_output/w3schools")
CSV_FILENAME = "w3schools_courses.csv"
