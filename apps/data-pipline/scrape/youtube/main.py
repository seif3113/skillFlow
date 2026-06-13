#!/usr/bin/env python
"""
YouTube Educational Scraper — Main Entry Point

Uses the YouTube Data API v3 to find playlists, full courses, and
tutorials suitable for RAG / roadmap generation.

Usage:
    python main.py --search "python" --api-key YOUR_KEY
    python main.py --category python --api-key YOUR_KEY
    python main.py --all-categories --api-key YOUR_KEY --max-pages 2
    python main.py --list-categories
"""

import argparse
import logging
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from youtube.scraper import YouTubeScraper, Course
from youtube.exporter import StreamingCSVExporter
from youtube.config import CATEGORIES, OUTPUT_FOLDER

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)-22s  %(levelname)-7s  %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


def list_categories() -> None:
    print("\n=== YouTube Educational Categories ===\n")
    for slug, name in CATEGORIES.items():
        print(f"  {slug:25} - {name}")
    print()


def main():
    parser = argparse.ArgumentParser(
        description="YouTube Educational Content Scraper (API-based)"
    )
    parser.add_argument("--search", "-q", type=str, help="Free-text search query")
    parser.add_argument("--category", "-c", type=str, help="Category slug to scrape")
    parser.add_argument(
        "--all-categories",
        "-a",
        action="store_true",
        help="Scrape all configured categories",
    )
    parser.add_argument(
        "--max-pages",
        "-p",
        type=int,
        default=None,
        help="Max search result pages per query (default: 3 per suffix)",
    )
    parser.add_argument(
        "--playlists-only",
        action="store_true",
        help="Only fetch playlists (skip standalone videos)",
    )
    parser.add_argument(
        "--videos-only",
        action="store_true",
        help="Only fetch long-form videos (skip playlists)",
    )
    parser.add_argument(
        "--min-duration",
        type=int,
        default=None,
        help="Minimum video duration in seconds (default: 600 = 10 min)",
    )
    parser.add_argument(
        "--api-key",
        type=str,
        default=os.environ.get("YOUTUBE_API_KEY", ""),
        help="YouTube Data API v3 key (or set YOUTUBE_API_KEY env var)",
    )
    parser.add_argument("--list-categories", action="store_true")
    args = parser.parse_args()

    if args.list_categories:
        list_categories()
        return 0

    if not args.search and not args.category and not args.all_categories:
        print(
            "Error: provide --search, --category, or --all-categories.  "
            "Use --list-categories for options."
        )
        return 1

    if not args.api_key:
        print(
            "Error: YouTube API key required.\n"
            "  Pass --api-key YOUR_KEY  or  set YOUTUBE_API_KEY env var.\n"
            "  Get a key at https://console.cloud.google.com/ → "
            "APIs & Services → YouTube Data API v3"
        )
        return 1

    scraper = YouTubeScraper(
        api_key=args.api_key,
        min_duration=args.min_duration or 600,
    )

    include_playlists = not args.videos_only
    include_videos = not args.playlists_only
    label = args.search or args.category or "all"
    output_path = Path(OUTPUT_FOLDER) / f"youtube_{label}.csv"

    with StreamingCSVExporter(str(output_path)) as exporter:
        try:
            if args.search:
                gen = scraper.search_courses(
                    args.search,
                    max_pages=args.max_pages or 3,
                    include_playlists=include_playlists,
                    include_videos=include_videos,
                )
            elif args.all_categories:
                gen = scraper.scrape_all_categories()
            else:
                gen = scraper.scrape_category(args.category, max_pages=args.max_pages)

            for course in gen:
                exporter.write(course)
                if exporter.count % 20 == 0:
                    logger.info(f"{exporter.count} courses saved so far")
        except KeyboardInterrupt:
            logger.warning("Interrupted")
        finally:
            scraper.close()

    logger.info(f"Done — {exporter.count} courses -> {output_path}")
    stats = scraper.stats
    logger.info(f"API calls used: {stats['api_calls']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
