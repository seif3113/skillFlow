"""
Bronze Ingestion DAG — scrapes educational platforms and uploads raw data to MinIO.

Each platform gets one task per category.  Selenium-based scrapers (Udemy,
Coursera, W3Schools, Khan Academy) share a single Xvfb virtual display per
worker.  YouTube uses the Data API (no browser needed).

Schedule: weekly on Sunday at 02:00 UTC.
"""

from datetime import datetime, timedelta
import os
from airflow.sdk import DAG, task

from include.bronze_ingestion import (
    scrape_udemy,
    scrape_coursera,
    scrape_w3schools,
    scrape_khan_academy,
    scrape_youtube,
)

# -- DAG defaults -----------------------------------------------------------

default_args = {
    "owner": "data-engineering",
    "retries": 1,
    "retry_delay": timedelta(minutes=10),
    "execution_timeout": timedelta(hours=2),
}

# -- Categories to scrape (subset to keep runtime manageable) ----------------

UDEMY_CATEGORIES = [
    ("development", None),
    ("business", None),
    ("it-and-software", None),
    ("design", None),
    ("marketing", None),
]

COURSERA_CATEGORIES = [
    ("data-science", None),
    ("computer-science", None),
    ("business", None),
    ("information-technology", None),
]

W3SCHOOLS_CATEGORIES = [
    "python",
    "js",
    "sql",
    "java",
    "html",
    "css",
    "react",
    "nodejs",
    "typescript",
    "cpp",
]

KHAN_CATEGORIES = [
    "math",
    "science",
    "computing",
    "economics-finance-domain",
]

YOUTUBE_CATEGORIES = [
    "python",
    "data-science",
    "machine-learning",
    "web-development",
    "sql",
    "devops",
]


def _parse_csv_list_env(name: str, fallback: list[str]) -> list[str]:
    raw = os.environ.get(name, "")
    if not raw.strip():
        return fallback
    parsed = [item.strip() for item in raw.split(",") if item.strip()]
    return parsed or fallback


def _parse_int_env(name: str, fallback: int, minimum: int = 1) -> int:
    raw = os.environ.get(name)
    if raw is None:
        return fallback
    try:
        return max(minimum, int(raw))
    except ValueError:
        return fallback


YOUTUBE_CATEGORIES = _parse_csv_list_env("YOUTUBE_CATEGORIES", YOUTUBE_CATEGORIES)
YOUTUBE_MAX_PAGES = _parse_int_env("YOUTUBE_MAX_PAGES", 8, minimum=1)


# -- Task factory helpers (avoid closure bugs in for-loops) ------------------


def _make_udemy_task(cat, subcat):
    tid = f"udemy_{cat}" + (f"_{subcat}" if subcat else "")

    @task(task_id=tid)
    def run(category=cat, subcategory=subcat):
        return scrape_udemy(category=category, subcategory=subcategory, max_pages=30)

    return run


def _make_coursera_task(cat, subcat):
    tid = f"coursera_{cat}" + (f"_{subcat}" if subcat else "")

    @task(task_id=tid)
    def run(category=cat, subcategory=subcat):
        return scrape_coursera(category=category, subcategory=subcategory, max_pages=30)

    return run


def _make_w3schools_task(cat):
    @task(task_id=f"w3schools_{cat}")
    def run(category=cat):
        return scrape_w3schools(category=category)

    return run


def _make_khan_task(cat):
    @task(task_id=f"khan_{cat}")
    def run(category=cat):
        return scrape_khan_academy(category=category)

    return run


def _make_youtube_task(cat):
    @task(task_id=f"youtube_{cat}")
    def run(category=cat):
        return scrape_youtube(category=category, max_pages=YOUTUBE_MAX_PAGES)

    return run


# -- DAG definition ----------------------------------------------------------

with DAG(
    dag_id="bronze_ingestion",
    description="Scrape educational platforms and ingest raw data into MinIO bronze layer",
    default_args=default_args,
    schedule="@weekly",
    start_date=datetime(2026, 3, 1),
    catchup=False,
    max_active_tasks=2,
    tags=["bronze", "scraping", "ingestion"],
) as dag:

    for cat, subcat in UDEMY_CATEGORIES:
        _make_udemy_task(cat, subcat)()

    for cat, subcat in COURSERA_CATEGORIES:
        _make_coursera_task(cat, subcat)()

    for cat in W3SCHOOLS_CATEGORIES:
        _make_w3schools_task(cat)()

    for cat in KHAN_CATEGORIES:
        _make_khan_task(cat)()

    for cat in YOUTUBE_CATEGORIES:
        _make_youtube_task(cat)()
