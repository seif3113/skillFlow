#!/usr/bin/env python
"""
Unified Course Scraper Runner — Udemy, Coursera, W3Schools, Khan Academy & YouTube

Runs one or more scrapers in parallel threads.  Each platform writes to
its own CSV file under scrape_output/<platform>/.  Every row includes a
``source`` column so downstream pipelines know where the data came from.

Usage:
    python run.py --platform all --search "machine learning" --max-pages 5
    python run.py --platform udemy --category development --max-pages 10
    python run.py --platform coursera --category data-science --max-pages 10
    python run.py --platform w3schools --category python
    python run.py --platform khan_academy --category computing
    python run.py --platform youtube --search "python" --api-key YOUR_KEY
    python run.py --list-categories
"""

import argparse
import logging
import sys
import threading
import time
from datetime import datetime
from pathlib import Path

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(threadName)s]  %(name)-22s  %(levelname)-7s  %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("run_scraper.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger("run")

# ---------------------------------------------------------------------------
# Per-platform helpers
# ---------------------------------------------------------------------------


def _run_udemy(args: argparse.Namespace, results: dict) -> None:
    """Scrape Udemy in the current thread."""
    from udemy.scraper import UdemyScraper, Course
    from shared.proxy_manager import ProxyManager
    from udemy.exporter import StreamingCSVExporter

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = (
        args.udemy_output or f"udemy_{args.search or args.category}_{timestamp}.csv"
    )
    output_path = Path(args.output_dir) / "udemy" / output_file

    use_proxies = not args.no_proxies

    proxy_manager = None
    if use_proxies:
        proxy_manager = ProxyManager(proxy_file=args.proxy_file, use_free_proxies=True)
        logger.info(f"[Udemy] Proxies loaded: {proxy_manager.total_count}")

    # Udemy detects headless mode — always run with a visible browser
    scraper = UdemyScraper(
        proxy_manager=proxy_manager,
        use_proxies=use_proxies,
        headless=False,
    )

    with StreamingCSVExporter(str(output_path)) as exporter:
        try:
            if args.search:
                gen = scraper.scrape_search_results(
                    args.search, max_pages=args.max_pages or 10
                )
            else:
                gen = scraper.scrape_category(
                    category=args.category,
                    subcategory=args.subcategory,
                    max_pages=args.max_pages,
                )
            for course in gen:
                if args.details:
                    course = scraper.scrape_course_details(course)
                exporter.write(course)
                if exporter.count % 50 == 0:
                    logger.info(f"[Udemy] {exporter.count} courses saved so far")
        except KeyboardInterrupt:
            logger.warning("[Udemy] Interrupted")
        except Exception as e:
            logger.error(f"[Udemy] Error: {e}")
        finally:
            scraper.close()

    results["udemy"] = {"file": str(output_path), "count": exporter.count}
    logger.info(f"[Udemy] Done — {exporter.count} courses -> {output_path}")


def _run_coursera(args: argparse.Namespace, results: dict) -> None:
    """Scrape Coursera in the current thread."""
    from coursera.scraper import CourseraScraper, Course
    from shared.proxy_manager import ProxyManager
    from coursera.exporter import StreamingCSVExporter

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = (
        args.coursera_output
        or f"coursera_{args.search or args.category}_{timestamp}.csv"
    )
    output_path = Path(args.output_dir) / "coursera" / output_file

    use_proxies = not args.no_proxies
    headless = not args.show_browser

    proxy_manager = None
    if use_proxies:
        proxy_manager = ProxyManager(proxy_file=args.proxy_file, use_free_proxies=True)
        logger.info(f"[Coursera] Proxies loaded: {proxy_manager.total_count}")

    scraper = CourseraScraper(
        proxy_manager=proxy_manager,
        use_proxies=use_proxies,
        headless=headless,
    )

    with StreamingCSVExporter(str(output_path)) as exporter:
        try:
            if args.search:
                gen = scraper.scrape_search_results(
                    args.search, max_pages=args.max_pages or 10
                )
            else:
                gen = scraper.scrape_category(
                    category=args.category,
                    subcategory=args.subcategory,
                    max_pages=args.max_pages,
                )
            for course in gen:
                if args.details:
                    course = scraper.scrape_course_details(course)
                exporter.write(course)
                if exporter.count % 50 == 0:
                    logger.info(f"[Coursera] {exporter.count} courses saved so far")
        except KeyboardInterrupt:
            logger.warning("[Coursera] Interrupted")
        except Exception as e:
            logger.error(f"[Coursera] Error: {e}")
        finally:
            scraper.close()

    results["coursera"] = {"file": str(output_path), "count": exporter.count}
    logger.info(f"[Coursera] Done — {exporter.count} courses -> {output_path}")


# ---------------------------------------------------------------------------
# List categories
# ---------------------------------------------------------------------------


def _run_w3schools(args: argparse.Namespace, results: dict) -> None:
    """Scrape W3Schools in the current thread."""
    from w3schools.scraper import W3SchoolsScraper
    from w3schools.exporter import StreamingCSVExporter
    from shared.proxy_manager import ProxyManager

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"w3schools_{args.category or 'all'}_{timestamp}.csv"
    output_path = Path(args.output_dir) / "w3schools" / output_file

    use_proxies = not args.no_proxies
    proxy_manager = None
    if use_proxies:
        proxy_manager = ProxyManager(proxy_file=args.proxy_file, use_free_proxies=True)

    scraper = W3SchoolsScraper(
        proxy_manager=proxy_manager,
        use_proxies=use_proxies,
        headless=not args.show_browser,
    )

    with StreamingCSVExporter(str(output_path)) as exporter:
        try:
            if args.category:
                gen = scraper.scrape_category(args.category, max_pages=args.max_pages)
            else:
                gen = scraper.scrape_all_categories()
            for course in gen:
                exporter.write(course)
                if exporter.count % 20 == 0:
                    logger.info(f"[W3Schools] {exporter.count} tutorials saved so far")
        except KeyboardInterrupt:
            logger.warning("[W3Schools] Interrupted")
        except Exception as e:
            logger.error(f"[W3Schools] Error: {e}")
        finally:
            scraper.close()

    results["w3schools"] = {"file": str(output_path), "count": exporter.count}
    logger.info(f"[W3Schools] Done — {exporter.count} tutorials -> {output_path}")


def _run_khan_academy(args: argparse.Namespace, results: dict) -> None:
    """Scrape Khan Academy in the current thread."""
    from khan_academy.scraper import KhanAcademyScraper
    from khan_academy.exporter import StreamingCSVExporter
    from shared.proxy_manager import ProxyManager

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    label = args.search or args.category or "all"
    output_file = f"khan_academy_{label}_{timestamp}.csv"
    output_path = Path(args.output_dir) / "khan_academy" / output_file

    use_proxies = not args.no_proxies
    proxy_manager = None
    if use_proxies:
        proxy_manager = ProxyManager(proxy_file=args.proxy_file, use_free_proxies=True)

    scraper = KhanAcademyScraper(
        proxy_manager=proxy_manager,
        use_proxies=use_proxies,
        headless=not args.show_browser,
    )

    with StreamingCSVExporter(str(output_path)) as exporter:
        try:
            if args.search:
                gen = scraper.scrape_search_results(
                    args.search, max_pages=args.max_pages or 5
                )
            elif args.category:
                gen = scraper.scrape_category(args.category, max_pages=args.max_pages)
            else:
                gen = scraper.scrape_all_categories()
            for course in gen:
                if args.details:
                    course = scraper.scrape_course_details(course)
                exporter.write(course)
                if exporter.count % 20 == 0:
                    logger.info(f"[Khan Academy] {exporter.count} courses saved so far")
        except KeyboardInterrupt:
            logger.warning("[Khan Academy] Interrupted")
        except Exception as e:
            logger.error(f"[Khan Academy] Error: {e}")
        finally:
            scraper.close()

    results["khan_academy"] = {"file": str(output_path), "count": exporter.count}
    logger.info(f"[Khan Academy] Done — {exporter.count} courses -> {output_path}")


def _run_youtube(args: argparse.Namespace, results: dict) -> None:
    """Scrape YouTube in the current thread (API-based, no browser)."""
    from youtube.scraper import YouTubeScraper
    from youtube.exporter import StreamingCSVExporter

    api_key = getattr(args, "api_key", "") or ""
    if not api_key:
        logger.error(
            "[YouTube] API key required. Pass --api-key or set YOUTUBE_API_KEY env var."
        )
        results["youtube"] = {"file": "", "count": 0}
        return

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    label = args.search or args.category or "all"
    output_file = f"youtube_{label}_{timestamp}.csv"
    output_path = Path(args.output_dir) / "youtube" / output_file

    scraper = YouTubeScraper(api_key=api_key)

    with StreamingCSVExporter(str(output_path)) as exporter:
        try:
            if args.search:
                gen = scraper.search_courses(args.search, max_pages=args.max_pages or 3)
            elif args.category:
                gen = scraper.scrape_category(args.category, max_pages=args.max_pages)
            else:
                gen = scraper.scrape_all_categories()
            for course in gen:
                exporter.write(course)
                if exporter.count % 20 == 0:
                    logger.info(f"[YouTube] {exporter.count} courses saved so far")
        except KeyboardInterrupt:
            logger.warning("[YouTube] Interrupted")
        except Exception as e:
            logger.error(f"[YouTube] Error: {e}")
        finally:
            scraper.close()

    results["youtube"] = {"file": str(output_path), "count": exporter.count}
    logger.info(f"[YouTube] Done — {exporter.count} courses -> {output_path}")


def list_categories() -> None:
    from udemy.config import CATEGORIES as U_CAT, DEVELOPMENT_SUBCATEGORIES as U_SUB
    from coursera.config import (
        CATEGORIES as C_CAT,
        DATA_SCIENCE_SUBCATEGORIES as C_DS,
        COMPUTER_SCIENCE_SUBCATEGORIES as C_CS,
    )
    from w3schools.config import CATEGORIES as W_CAT
    from khan_academy.config import CATEGORIES as K_CAT
    from youtube.config import CATEGORIES as Y_CAT

    print("\n========== Udemy Categories ==========\n")
    for slug, name in U_CAT.items():
        print(f"  {slug:35s} {name}")
    print("\n  -- Development subcategories --")
    for slug, name in U_SUB.items():
        print(f"  {slug:35s} {name}")

    print("\n========== Coursera Categories ==========\n")
    for slug, name in C_CAT.items():
        print(f"  {slug:40s} {name}")
    print("\n  -- Data Science subcategories --")
    for slug, name in C_DS.items():
        print(f"  {slug:40s} {name}")
    print("\n  -- Computer Science subcategories --")
    for slug, name in C_CS.items():
        print(f"  {slug:40s} {name}")

    print("\n========== W3Schools Categories ==========\n")
    for slug, name in W_CAT.items():
        print(f"  {slug:25s} {name}")

    print("\n========== Khan Academy Categories ==========\n")
    for slug, name in K_CAT.items():
        print(f"  {slug:35s} {name}")

    print("\n========== YouTube Categories ==========\n")
    for slug, name in Y_CAT.items():
        print(f"  {slug:25s} {name}")

    print("\nUsage:")
    print('  python run.py --platform all --search "python" --max-pages 5')
    print("  python run.py --platform udemy --category development --max-pages 10")
    print("  python run.py --platform coursera --category data-science --max-pages 10")
    print("  python run.py --platform w3schools --category python")
    print("  python run.py --platform khan_academy --category computing")
    print('  python run.py --platform youtube --search "python" --api-key YOUR_KEY\n')


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Unified Scraper Runner — Udemy, Coursera, W3Schools, Khan Academy & YouTube (threaded)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run.py --platform all --search "machine learning" --max-pages 5
  python run.py --platform udemy --category development --max-pages 10
  python run.py --platform coursera --category data-science -p 10
  python run.py --platform w3schools --category python
  python run.py --platform khan_academy --category computing
  python run.py --platform youtube --search "python" --api-key YOUR_KEY
  python run.py --list-categories
        """,
    )

    # What to scrape
    parser.add_argument(
        "--platform",
        type=str,
        choices=[
            "udemy",
            "coursera",
            "w3schools",
            "khan_academy",
            "youtube",
            "all",
            "both",
        ],
        default="all",
        help="Which platform(s) to scrape (default: all)",
    )
    parser.add_argument("--category", "-c", type=str, help="Category slug to scrape")
    parser.add_argument("--subcategory", "-s", type=str, help="Subcategory slug")
    parser.add_argument("--search", "-q", type=str, help="Search query")

    # Scraping options
    parser.add_argument(
        "--max-pages",
        "-p",
        type=int,
        default=30,
        help="Max pages per platform (default: 30)",
    )
    parser.add_argument(
        "--details",
        "-d",
        action="store_true",
        help="Fetch full course details (slower)",
    )

    # Proxy / browser
    parser.add_argument(
        "--no-proxies",
        action="store_true",
        default=True,
        help="Disable proxy rotation (default: proxies disabled)",
    )
    parser.add_argument(
        "--use-proxies",
        action="store_true",
        help="Enable free proxy rotation (often unreliable)",
    )
    parser.add_argument(
        "--proxy-file",
        type=str,
        help="Proxy list file (ip:port per line) — implies proxy usage",
    )
    parser.add_argument(
        "--show-browser", action="store_true", help="Show Chrome window"
    )

    # Output
    parser.add_argument(
        "--output-dir",
        type=str,
        default="scrape_output",
        help="Directory for output CSVs (default: scrape_output)",
    )
    parser.add_argument("--udemy-output", type=str, help="Custom Udemy output filename")
    parser.add_argument(
        "--coursera-output", type=str, help="Custom Coursera output filename"
    )

    # YouTube API
    import os as _os

    parser.add_argument(
        "--api-key",
        type=str,
        default=_os.environ.get("YOUTUBE_API_KEY", ""),
        help="YouTube Data API v3 key (or set YOUTUBE_API_KEY env var)",
    )

    # Misc
    parser.add_argument(
        "--list-categories", action="store_true", help="List all categories and exit"
    )
    parser.add_argument("--verbose", "-v", action="store_true", help="Debug logging")

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Resolve proxy mode: use-proxies or proxy-file enables proxies
    if args.use_proxies or args.proxy_file:
        args.no_proxies = False
    else:
        args.no_proxies = True

    if args.list_categories:
        list_categories()
        return 0

    # W3Schools, Khan Academy, and YouTube can run without --category
    needs_target = args.platform in ("udemy", "coursera", "both")
    if needs_target and not args.category and not args.search:
        print(
            "Error: provide --category or --search.  Use --list-categories for options."
        )
        return 1

    Path(args.output_dir).mkdir(parents=True, exist_ok=True)

    results: dict = {}
    threads: list[threading.Thread] = []

    run_all = args.platform in ("all", "both")
    run_udemy = args.platform == "udemy" or run_all
    run_coursera = args.platform == "coursera" or run_all
    run_w3schools = args.platform == "w3schools" or run_all
    run_khan = args.platform == "khan_academy" or run_all
    run_youtube = args.platform == "youtube" or run_all

    if run_udemy:
        t = threading.Thread(
            target=_run_udemy, args=(args, results), name="Udemy", daemon=True
        )
        threads.append(t)

    if run_coursera:
        t = threading.Thread(
            target=_run_coursera, args=(args, results), name="Coursera", daemon=True
        )
        threads.append(t)

    if run_w3schools:
        t = threading.Thread(
            target=_run_w3schools, args=(args, results), name="W3Schools", daemon=True
        )
        threads.append(t)

    if run_khan:
        t = threading.Thread(
            target=_run_khan_academy,
            args=(args, results),
            name="KhanAcademy",
            daemon=True,
        )
        threads.append(t)

    if run_youtube:
        t = threading.Thread(
            target=_run_youtube,
            args=(args, results),
            name="YouTube",
            daemon=True,
        )
        threads.append(t)

    logger.info(
        f"Starting {len(threads)} scraper thread(s): {[t.name for t in threads]}"
    )

    # Stagger thread starts to avoid chromedriver patching race condition
    # (both scrapers use the same chromedriver binary on disk)
    for i, t in enumerate(threads):
        t.start()
        if i < len(threads) - 1:
            time.sleep(8)  # Let first thread finish patching chromedriver

    try:
        for t in threads:
            t.join()
    except KeyboardInterrupt:
        logger.warning("Interrupted — waiting for threads to finish...")
        for t in threads:
            t.join(timeout=10)

    # Summary
    print("\n" + "=" * 60)
    print("  SCRAPING SUMMARY")
    print("=" * 60)
    for platform, info in results.items():
        print(
            f"  {platform.upper():10s}  {info['count']:>6} courses  ->  {info['file']}"
        )
    if not results:
        print("  No results collected.")
    print("=" * 60 + "\n")

    return 0


if __name__ == "__main__":
    # Suppress the harmless "WinError 6: The handle is invalid" that
    # undetected-chromedriver prints on Windows during cleanup.
    _original_del = None
    try:
        import undetected_chromedriver as _uc

        _original_del = _uc.Chrome.__del__

        def _quiet_del(self):
            try:
                _original_del(self)
            except OSError:
                pass
            except Exception:
                pass

        _uc.Chrome.__del__ = _quiet_del
    except Exception:
        pass

    sys.exit(main())
