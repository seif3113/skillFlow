#!/usr/bin/env python
"""
W3Schools Scraper - Main Entry Point

Usage:
    python main.py --category python
    python main.py --all-categories
    python main.py --list-categories
    python main.py --category html --show-browser
"""

import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from w3schools.scraper import W3SchoolsScraper, Course
from w3schools.exporter import StreamingCSVExporter
from w3schools.config import CATEGORIES, OUTPUT_FOLDER
from shared.proxy_manager import ProxyManager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)-22s  %(levelname)-7s  %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


def list_categories() -> None:
    print("\n=== W3Schools Categories ===\n")
    for slug, name in CATEGORIES.items():
        print(f"  {slug:20} - {name}")
    print()


def main():
    parser = argparse.ArgumentParser(description="W3Schools Tutorial Scraper")
    parser.add_argument("--category", "-c", type=str, help="Category slug to scrape")
    parser.add_argument("--all-categories", "-a", action="store_true", help="Scrape all categories")
    parser.add_argument("--max-pages", "-p", type=int, default=None)
    parser.add_argument("--list-categories", action="store_true")
    parser.add_argument("--show-browser", action="store_true", help="Show Chrome window")
    parser.add_argument("--use-proxies", action="store_true", help="Enable proxy rotation")
    parser.add_argument("--proxy-file", type=str, help="Proxy list file")
    args = parser.parse_args()

    if args.list_categories:
        list_categories()
        return 0

    if not args.category and not args.all_categories:
        print("Error: provide --category or --all-categories.  Use --list-categories for options.")
        return 1

    use_proxies = args.use_proxies or bool(args.proxy_file)
    proxy_manager = None
    if use_proxies:
        proxy_manager = ProxyManager(proxy_file=args.proxy_file, use_free_proxies=True)

    scraper = W3SchoolsScraper(
        proxy_manager=proxy_manager,
        use_proxies=use_proxies,
        headless=not args.show_browser,
    )

    label = args.category or "all"
    output_path = Path(OUTPUT_FOLDER) / f"w3schools_{label}.csv"

    with StreamingCSVExporter(str(output_path)) as exporter:
        try:
            if args.all_categories:
                gen = scraper.scrape_all_categories()
            else:
                gen = scraper.scrape_category(args.category, args.max_pages)
            for course in gen:
                exporter.write(course)
                if exporter.count % 20 == 0:
                    logger.info(f"{exporter.count} tutorials saved so far")
        except KeyboardInterrupt:
            logger.warning("Interrupted")
        finally:
            scraper.close()

    logger.info(f"Done - {exporter.count} tutorials -> {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())