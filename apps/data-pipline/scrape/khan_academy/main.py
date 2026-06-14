#!/usr/bin/env python
"""
Khan Academy Scraper - Main Entry Point

Usage:
    python main.py --category computing
    python main.py --all-categories
    python main.py --search "algebra"
    python main.py --list-categories
    python main.py --category math --details --show-browser
"""

import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from khan_academy.scraper import KhanAcademyScraper, Course
from khan_academy.exporter import StreamingCSVExporter
from khan_academy.config import CATEGORIES, OUTPUT_FOLDER
from shared.proxy_manager import ProxyManager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)-22s  %(levelname)-7s  %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


def list_categories() -> None:
    print("\n=== Khan Academy Categories ===\n")
    for slug, name in CATEGORIES.items():
        print(f"  {slug:30} - {name}")
    print()


def main():
    parser = argparse.ArgumentParser(description="Khan Academy Course Scraper")
    parser.add_argument("--category", "-c", type=str, help="Category slug to scrape")
    parser.add_argument("--all-categories", "-a", action="store_true", help="Scrape all categories")
    parser.add_argument("--search", "-q", type=str, help="Search query")
    parser.add_argument("--max-pages", "-p", type=int, default=None)
    parser.add_argument("--details", "-d", action="store_true", help="Fetch full course details (slower)")
    parser.add_argument("--list-categories", action="store_true")
    parser.add_argument("--show-browser", action="store_true", help="Show Chrome window")
    parser.add_argument("--use-proxies", action="store_true", help="Enable proxy rotation")
    parser.add_argument("--proxy-file", type=str, help="Proxy list file")
    args = parser.parse_args()

    if args.list_categories:
        list_categories()
        return 0

    if not args.category and not args.all_categories and not args.search:
        print("Error: provide --category, --all-categories, or --search.  Use --list-categories for options.")
        return 1

    use_proxies = args.use_proxies or bool(args.proxy_file)
    proxy_manager = None
    if use_proxies:
        proxy_manager = ProxyManager(proxy_file=args.proxy_file, use_free_proxies=True)

    scraper = KhanAcademyScraper(
        proxy_manager=proxy_manager,
        use_proxies=use_proxies,
        headless=not args.show_browser,
    )

    label = args.search or args.category or "all"
    output_path = Path(OUTPUT_FOLDER) / f"khan_academy_{label}.csv"

    with StreamingCSVExporter(str(output_path)) as exporter:
        try:
            if args.search:
                gen = scraper.scrape_search_results(args.search, max_pages=args.max_pages or 5)
            elif args.all_categories:
                gen = scraper.scrape_all_categories()
            else:
                gen = scraper.scrape_category(args.category, args.max_pages)

            for course in gen:
                if args.details:
                    course = scraper.scrape_course_details(course)
                exporter.write(course)
                if exporter.count % 20 == 0:
                    logger.info(f"{exporter.count} courses saved so far")
        except KeyboardInterrupt:
            logger.warning("Interrupted")
        finally:
            scraper.close()

    logger.info(f"Done - {exporter.count} courses -> {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())