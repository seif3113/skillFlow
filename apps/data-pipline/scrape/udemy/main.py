#!/usr/bin/env python
"""
Udemy Course Scraper - Main Entry Point  (Selenium edition)

Usage:
    python main.py --category development --max-pages 10
    python main.py --category business --subcategory entrepreneurship
    python main.py --search "machine learning" --max-pages 10
    python main.py --list-categories
"""

import argparse
import logging
import sys
from datetime import datetime
from pathlib import Path

# Allow running with ``python main.py`` from inside the package folder
sys.path.insert(0, str(Path(__file__).parent.parent))

from udemy.scraper import UdemyScraper, Course
from udemy.proxy_manager import ProxyManager
from udemy.exporter import DataExporter, StreamingCSVExporter
from udemy.config import (
    CATEGORIES,
    DEVELOPMENT_SUBCATEGORIES,
    MIN_PAGES_PERCENTAGE,
    OUTPUT_FOLDER,
)

# ── logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)-22s  %(levelname)-7s  %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("scraper.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger(__name__)


# ── helpers ──────────────────────────────────────────────────────────────────


def list_categories() -> None:
    print("\n=== Available Udemy Categories ===\n")
    for slug, name in CATEGORIES.items():
        print(f"  {slug:30} - {name}")
    print("\n=== Development Subcategories ===\n")
    for slug, name in DEVELOPMENT_SUBCATEGORIES.items():
        print(f"  {slug:35} - {name}")
    print("\nUsage: python main.py --category <slug> [--subcategory <slug>]")
    print(
        "Example: python main.py --category development --subcategory web-development\n"
    )


# ── scrape by category ──────────────────────────────────────────────────────


def scrape_category(args: argparse.Namespace) -> None:
    category = args.category
    subcategory = args.subcategory
    max_pages = args.max_pages
    min_pct = (
        args.min_percentage / 100.0 if args.min_percentage else MIN_PAGES_PERCENTAGE
    )
    use_proxies = not args.no_proxies
    headless = not args.show_browser
    get_details = args.details
    ml_format = args.ml_format
    output_file = (
        args.output
        or f"udemy_{category}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    )

    logger.info(f"Category : {category}" + (f"/{subcategory}" if subcategory else ""))
    logger.info(f"Max pages: {max_pages or 'auto (≥50%)'}")
    logger.info(f"Proxies  : {use_proxies}")
    logger.info(f"Headless : {headless}")
    logger.info(f"Output   : {output_file}")

    # Proxy manager
    proxy_manager = None
    if use_proxies:
        proxy_manager = ProxyManager(
            proxy_file=args.proxy_file,
            use_free_proxies=True,
        )
        logger.info(
            f"Proxies loaded: {proxy_manager.total_count} total, "
            f"{proxy_manager.available_count} available"
        )

    scraper = UdemyScraper(
        proxy_manager=proxy_manager,
        use_proxies=use_proxies,
        headless=headless,
    )

    output_path = Path(OUTPUT_FOLDER) / output_file
    courses_collected: list[Course] = []

    with StreamingCSVExporter(str(output_path)) as exporter:
        try:
            for course in scraper.scrape_category(
                category=category,
                subcategory=subcategory,
                min_pages_percentage=min_pct,
                max_pages=max_pages,
            ):
                if get_details:
                    course = scraper.scrape_course_details(course)
                exporter.write(course)
                courses_collected.append(course)
                if exporter.count % 50 == 0:
                    logger.info(f"Progress: {exporter.count} courses saved")
        except KeyboardInterrupt:
            logger.warning("Interrupted by user")
        finally:
            scraper.close()

    logger.info(f"=== Done === {len(courses_collected)} courses → {output_path}")

    if ml_format and courses_collected:
        ml_file = DataExporter(OUTPUT_FOLDER).export_for_ml(
            courses_collected,
            f"udemy_{category}_ml_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
        )
        logger.info(f"ML-ready export → {ml_file}")

    stats = scraper.stats
    logger.info(f"Pages scraped : {stats['pages_scraped']}")
    logger.info(f"Courses found : {stats['courses_scraped']}")
    if use_proxies:
        logger.info(
            f"Proxies alive : {stats['available_proxies']}/{stats['total_proxies']}"
        )


# ── scrape by search ────────────────────────────────────────────────────────


def scrape_search(args: argparse.Namespace) -> None:
    query = args.search
    max_pages = args.max_pages or 10
    use_proxies = not args.no_proxies
    headless = not args.show_browser
    output_file = (
        args.output
        or f"udemy_search_{query.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    )

    logger.info(f"Search query : {query}")

    proxy_manager = ProxyManager(use_free_proxies=True) if use_proxies else None
    scraper = UdemyScraper(
        proxy_manager=proxy_manager,
        use_proxies=use_proxies,
        headless=headless,
    )

    output_path = Path(OUTPUT_FOLDER) / output_file

    with StreamingCSVExporter(str(output_path)) as exporter:
        try:
            for course in scraper.scrape_search_results(query, max_pages):
                exporter.write(course)
                if exporter.count % 50 == 0:
                    logger.info(f"Progress: {exporter.count} courses found")
        except KeyboardInterrupt:
            logger.warning("Interrupted by user")
        finally:
            scraper.close()

    logger.info(f"Search done. {exporter.count} courses → {output_path}")


# ── CLI ─────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(
        description="Udemy Selenium Scraper — extract course data for ML training",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py --category development --max-pages 20
  python main.py --category development --subcategory web-development
  python main.py --category business -o business.csv --show-browser
  python main.py --search "machine learning" --max-pages 10
  python main.py --category development --ml-format
  python main.py --list-categories
        """,
    )

    parser.add_argument("--category", "-c", type=str, help="Category slug")
    parser.add_argument("--subcategory", "-s", type=str, help="Subcategory slug")
    parser.add_argument("--search", "-q", type=str, help="Search query")

    parser.add_argument(
        "--max-pages", "-p", type=int, default=None, help="Max pages to scrape"
    )
    parser.add_argument(
        "--min-percentage",
        type=float,
        default=50.0,
        help="Min %% of pages (default 50)",
    )
    parser.add_argument(
        "--details",
        "-d",
        action="store_true",
        help="Fetch full course details (slower)",
    )

    parser.add_argument(
        "--no-proxies", action="store_true", help="Disable proxy rotation"
    )
    parser.add_argument(
        "--proxy-file", type=str, help="File with proxy list (ip:port per line)"
    )

    parser.add_argument("--output", "-o", type=str, help="Output CSV filename")
    parser.add_argument(
        "--ml-format", action="store_true", help="Also export ML-ready CSV"
    )

    parser.add_argument(
        "--show-browser",
        action="store_true",
        help="Show Chrome window (disable headless)",
    )
    parser.add_argument(
        "--list-categories", action="store_true", help="List categories and exit"
    )
    parser.add_argument("--verbose", "-v", action="store_true", help="Debug logging")

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    if args.list_categories:
        list_categories()
        return 0

    if not args.category and not args.search:
        print("Error: supply --category or --search.  Use --list-categories or --help.")
        return 1

    try:
        if args.search:
            scrape_search(args)
        else:
            scrape_category(args)
        return 0
    except Exception as e:
        logger.error(f"Fatal: {e}")
        if args.verbose:
            import traceback

            traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
