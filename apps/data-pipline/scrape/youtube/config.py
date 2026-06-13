"""
Configuration settings for the YouTube scraper.

Uses the YouTube Data API v3 — requires an API key.
Set via YOUTUBE_API_KEY env var, --api-key CLI flag, or edit API_KEY below.
"""

import os

# ---------------------------------------------------------------------------
# API settings
# ---------------------------------------------------------------------------
API_KEY = os.environ.get("YOUTUBE_API_KEY", "")
API_BASE = "https://www.googleapis.com/youtube/v3"

# Quota: search costs 100 units, everything else 1 unit.
# Free tier = 10,000 units/day ≈ 100 searches + detail lookups.

# ---------------------------------------------------------------------------
# Search / filter settings
# ---------------------------------------------------------------------------

# Minimum video duration in seconds to count as a tutorial (10 min)
MIN_TUTORIAL_DURATION = 600

# Maximum results per API search call (max 50)
SEARCH_PAGE_SIZE = 50

# Default max search pages (each page = 1 search call = 100 quota units)
# Note: 30 pages = 3000 API quota units per search
DEFAULT_MAX_PAGES = 30

# Extra keywords appended to search queries to bias toward educational content
EDUCATIONAL_SUFFIXES = [
    "tutorial",
    "full course",
    "complete course",
]

# ---------------------------------------------------------------------------
# Educational topic categories (slug → display name)
# ---------------------------------------------------------------------------
CATEGORIES = {
    "python": "Python Programming",
    "javascript": "JavaScript",
    "java": "Java Programming",
    "web-development": "Web Development",
    "data-science": "Data Science",
    "machine-learning": "Machine Learning",
    "deep-learning": "Deep Learning",
    "sql": "SQL & Databases",
    "react": "React",
    "nodejs": "Node.js",
    "html-css": "HTML & CSS",
    "typescript": "TypeScript",
    "csharp": "C# Programming",
    "cpp": "C++ Programming",
    "go": "Go Programming",
    "rust": "Rust Programming",
    "devops": "DevOps & CI/CD",
    "docker": "Docker & Kubernetes",
    "cloud-computing": "Cloud Computing",
    "cybersecurity": "Cybersecurity",
    "data-engineering": "Data Engineering",
    "ai": "Artificial Intelligence",
    "nlp": "Natural Language Processing",
    "computer-vision": "Computer Vision",
    "algorithms": "Algorithms & Data Structures",
    "system-design": "System Design",
    "git": "Git & GitHub",
    "linux": "Linux",
    "flutter": "Flutter & Dart",
    "android": "Android Development",
    "ios": "iOS & Swift",
}

# ---------------------------------------------------------------------------
# Output settings
# ---------------------------------------------------------------------------
OUTPUT_FOLDER = os.environ.get("SCRAPE_OUTPUT_DIR", "/tmp/scrape_output/youtube")
CSV_FILENAME = "youtube_courses.csv"
