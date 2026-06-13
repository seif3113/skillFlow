"""
Configuration settings for the Coursera Selenium scraper.
"""

import os

from shared.config import (  # noqa: F401
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

# Base URL for Coursera
BASE_URL = "https://www.coursera.org"

# Pagination
DEFAULT_PAGE_SIZE = 12

# Popular Coursera categories (slug → display name)
CATEGORIES = {
    "data-science": "Data Science",
    "business": "Business",
    "computer-science": "Computer Science",
    "information-technology": "Information Technology",
    "language-learning": "Language Learning",
    "health": "Health",
    "personal-development": "Personal Development",
    "physical-science-and-engineering": "Physical Science and Engineering",
    "social-sciences": "Social Sciences",
    "arts-and-humanities": "Arts and Humanities",
    "math-and-logic": "Math and Logic",
}

# Data Science subcategories
DATA_SCIENCE_SUBCATEGORIES = {
    "data-analysis": "Data Analysis",
    "machine-learning": "Machine Learning",
    "probability-and-statistics": "Probability and Statistics",
    "data-management": "Data Management",
    "data-mining": "Data Mining",
}

# Computer Science subcategories
COMPUTER_SCIENCE_SUBCATEGORIES = {
    "software-development": "Software Development",
    "mobile-and-web-development": "Mobile and Web Development",
    "algorithms": "Algorithms",
    "computer-security-and-networks": "Computer Security and Networks",
    "design-and-product": "Design and Product",
}

# Course types available on Coursera
COURSE_TYPES = {
    "course": "Course",
    "specialization": "Specialization",
    "professional-certificate": "Professional Certificate",
    "guided-project": "Guided Project",
    "mastertrack": "MasterTrack Certificate",
}

# Output settings
OUTPUT_FOLDER = os.environ.get("SCRAPE_OUTPUT_DIR", "/tmp/scrape_output/coursera")
CSV_FILENAME = "coursera_courses.csv"
