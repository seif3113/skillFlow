"""
Course Scraper module for extracting tutorial data from W3Schools.

Navigates W3Schools tutorial pages, parses the sidebar navigation to
identify tutorial sections and their topics, and extracts metadata from
each tutorial's landing page.
"""

import random
import time
import logging
import re
from typing import List, Dict, Optional, Generator, Any
from dataclasses import dataclass, field, asdict
from datetime import datetime

import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException,
    WebDriverException,
)
from bs4 import BeautifulSoup

from shared.browser_factory import BrowserFactory
from shared.proxy_manager import ProxyManager, Proxy
from shared.utils import ensure_headline_description_fields
from .config import (
    BASE_URL,
    SELENIUM_TIMEOUT,
    MAX_RETRIES,
    RETRY_DELAY,
    MIN_REQUEST_DELAY,
    MAX_REQUEST_DELAY,
    CATEGORIES,
    CERT_CATEGORIES,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data class  (unified fields for easy cross-platform integration)
# ---------------------------------------------------------------------------


@dataclass
class Course:
    """Represents a W3Schools tutorial section."""

    id: int
    title: str
    url: str
    headline: str = ""
    description: str = ""
    rating: float = 0.0
    num_reviews: int = 0
    num_enrolled: int = 0
    price: str = "Free"
    is_free: bool = True
    instructor_name: str = "W3Schools"
    image_url: str = ""
    duration_hours: float = 0.0
    num_lessons: int = 0
    level: str = ""
    language: str = "English"
    has_certificate: bool = False
    skills: List[str] = field(default_factory=list)
    category: str = ""
    subcategory: str = ""
    objectives: List[str] = field(default_factory=list)
    source: str = "w3schools"
    scraped_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["skills"] = "|".join(self.skills) if self.skills else ""
        data["objectives"] = "|".join(self.objectives) if self.objectives else ""
        return ensure_headline_description_fields(data)


# ---------------------------------------------------------------------------
# Main scraper
# ---------------------------------------------------------------------------


class W3SchoolsScraper:
    """
    Selenium-based scraper for W3Schools tutorials.

    Navigates to a tutorial category (e.g. /python/), parses the left
    sidebar to discover sections (each ``<h2>`` heading) and the lesson
    links under each section.  Each section becomes one ``Course`` entry.
    """

    def __init__(
        self,
        proxy_manager: Optional[ProxyManager] = None,
        use_proxies: bool = False,
        headless: bool = True,
    ):
        self.proxy_manager = proxy_manager
        self.use_proxies = use_proxies
        self.headless = headless
        self._driver: Optional[uc.Chrome] = None
        self._courses_scraped = 0
        self._pages_scraped = 0

    # ---- driver lifecycle ---------------------------------------------------

    def _get_driver(self, rotate_proxy: bool = False) -> uc.Chrome:
        if self._driver and not rotate_proxy:
            return self._driver
        self._quit_driver()
        proxy = None
        if self.use_proxies and self.proxy_manager:
            proxy = self.proxy_manager.get_random_proxy()
        self._driver = BrowserFactory.create_driver(proxy=proxy, headless=self.headless)
        return self._driver

    def _quit_driver(self) -> None:
        if self._driver:
            try:
                self._driver.quit()
            except OSError:
                pass
            except Exception:
                pass
            self._driver = None

    def close(self) -> None:
        self._quit_driver()

    def __del__(self):
        self._quit_driver()

    # ---- helpers ------------------------------------------------------------

    @staticmethod
    def _random_delay() -> None:
        time.sleep(random.uniform(MIN_REQUEST_DELAY, MAX_REQUEST_DELAY))

    def _navigate(self, url: str, retries: int = MAX_RETRIES) -> Optional[str]:
        """Load *url* and return page source, retrying with fresh proxies."""
        for attempt in range(retries):
            try:
                rotate = attempt > 0
                driver = self._get_driver(rotate_proxy=rotate)
                self._random_delay()

                logger.info(f"Loading {url}  (attempt {attempt + 1}/{retries})")
                driver.get(url)

                WebDriverWait(driver, SELENIUM_TIMEOUT).until(
                    EC.presence_of_element_located((By.TAG_NAME, "body"))
                )

                time.sleep(random.uniform(1, 2))
                page_source = driver.page_source

                if self._is_blocked(page_source):
                    logger.warning("Blocked — rotating proxy")
                    self._quit_driver()
                    time.sleep(RETRY_DELAY)
                    continue

                self._pages_scraped += 1
                return page_source

            except TimeoutException:
                logger.warning(f"Timeout (attempt {attempt + 1})")
                self._quit_driver()
            except WebDriverException as e:
                logger.warning(f"WebDriver error: {e}")
                self._quit_driver()
            except Exception as e:
                logger.warning(f"Navigation error: {e}")
                self._quit_driver()

            time.sleep(RETRY_DELAY)
        return None

    @staticmethod
    def _is_blocked(html: str) -> bool:
        lower = html[:5000].lower()
        markers = [
            "access denied",
            "captcha",
            "please verify",
            "cf-browser-verification",
        ]
        return any(m in lower for m in markers)

    # ---- parsing ------------------------------------------------------------

    def _parse_tutorial_page(self, html: str, category_slug: str) -> List[Course]:
        """Parse a W3Schools tutorial page; return one Course per sidebar section."""
        courses: List[Course] = []
        soup = BeautifulSoup(html, "html.parser")
        category_name = CATEGORIES.get(category_slug, category_slug.title())

        # Locate sidebar
        sidebar = (
            soup.select_one("#leftmenuinnerinner")
            or soup.select_one("#sidenav")
            or soup.select_one('div[class*="sidenav"]')
        )

        if not sidebar:
            logger.warning(f"No sidebar found for {category_slug}")
            course = self._course_from_main_content(soup, category_slug, category_name)
            if course:
                courses.append(course)
            return courses

        # Group links by <h2> headings
        sections = self._extract_sidebar_sections(sidebar)

        if not sections:
            # No <h2> headings — treat whole sidebar as a single course
            all_links = sidebar.select("a[href]")
            topics = [
                a.get_text(strip=True) for a in all_links if a.get_text(strip=True)
            ]
            if topics:
                url = f"{BASE_URL}/{category_slug}/default.asp"
                courses.append(
                    Course(
                        id=abs(hash(url)) % 10_000_000,
                        title=f"{category_name} Tutorial",
                        url=url,
                        headline=f"Learn {category_name} with W3Schools",
                        description=self._extract_main_description(soup),
                        num_lessons=len(topics),
                        level="All Levels",
                        has_certificate=category_slug in CERT_CATEGORIES,
                        skills=topics[:50],
                        category=category_name,
                    )
                )
            return courses

        # One Course per sidebar section
        main_desc = self._extract_main_description(soup)

        for section_title, section_links in sections:
            if not section_links:
                continue

            first_href = section_links[0].get("href", "")
            section_url = self._make_absolute_url(first_href, category_slug)
            topics = [
                a.get_text(strip=True) for a in section_links if a.get_text(strip=True)
            ]

            level = "All Levels"
            tl = section_title.lower()
            if "advanced" in tl:
                level = "Advanced"
            elif "reference" in tl:
                level = "Reference"
            elif "exercise" in tl or "quiz" in tl:
                level = "Practice"

            subcategory = (
                section_title if section_title != f"{category_name} Tutorial" else ""
            )

            course = Course(
                id=abs(hash(section_url)) % 10_000_000,
                title=section_title,
                url=section_url,
                headline=f"Learn {section_title} with W3Schools",
                num_lessons=len(topics),
                level=level,
                has_certificate=category_slug in CERT_CATEGORIES,
                skills=topics[:50],
                category=category_name,
                subcategory=subcategory,
            )
            courses.append(course)

        # Attach page description to the first course
        if courses and main_desc:
            courses[0].description = main_desc

        return courses

    def _extract_sidebar_sections(self, sidebar) -> List[tuple]:
        """Return [(section_title, [<a> links]), ...] from sidebar."""
        h2s = sidebar.find_all("h2")
        if not h2s:
            return []

        sections: List[tuple] = []
        for h2 in h2s:
            title = h2.get_text(strip=True)
            if not title:
                continue

            links: list = []
            el = h2.next_sibling
            while el:
                if el.name == "h2":
                    break
                if el.name == "a" and el.get("href"):
                    links.append(el)
                elif hasattr(el, "find_all"):
                    links.extend(el.find_all("a", href=True))
                el = el.next_sibling

            # Drop nav arrows
            links = [
                a
                for a in links
                if a.get_text(strip=True)
                and not a.get_text(strip=True).startswith("❮")
                and not a.get_text(strip=True).startswith("❯")
            ]
            sections.append((title, links))

        return sections

    def _extract_main_description(self, soup: BeautifulSoup) -> str:
        """Pull a description from the first few <p> tags of the main area."""
        main = (
            soup.select_one("#main")
            or soup.select_one('div[class*="w3-main"]')
            or soup.select_one("main")
        )
        if not main:
            return ""

        parts: list[str] = []
        for p in main.find_all("p", limit=5):
            text = p.get_text(strip=True)
            if text and len(text) > 20:
                parts.append(text)
            if len(" ".join(parts)) > 500:
                break
        return " ".join(parts)[:1000]

    def _course_from_main_content(
        self,
        soup: BeautifulSoup,
        category_slug: str,
        category_name: str,
    ) -> Optional[Course]:
        """Fallback when no sidebar is found."""
        title_el = soup.select_one("h1") or soup.select_one("h2")
        title = (
            title_el.get_text(strip=True) if title_el else f"{category_name} Tutorial"
        )
        url = f"{BASE_URL}/{category_slug}/default.asp"

        return Course(
            id=abs(hash(url)) % 10_000_000,
            title=title,
            url=url,
            headline=f"Learn {category_name} with W3Schools",
            description=self._extract_main_description(soup),
            level="All Levels",
            has_certificate=category_slug in CERT_CATEGORIES,
            category=category_name,
        )

    def _make_absolute_url(self, href: str, category_slug: str) -> str:
        if href.startswith("http"):
            return href
        if href.startswith("/"):
            return BASE_URL + href
        return f"{BASE_URL}/{category_slug}/{href}"

    # ---- public API ---------------------------------------------------------

    def scrape_category(
        self, category: str, max_pages: Optional[int] = None
    ) -> Generator[Course, None, None]:
        """Scrape tutorials from a W3Schools category."""
        logger.info(f"Starting W3Schools scrape for category: {category}")
        cat_url = f"{BASE_URL}/{category}/default.asp"

        html = self._navigate(cat_url)
        if not html:
            logger.error(f"Failed to load: {cat_url}")
            return

        courses = self._parse_tutorial_page(html, category)
        for course in courses:
            self._courses_scraped += 1
            yield course

        logger.info(f"Category {category}: {len(courses)} tutorials found")

    def scrape_all_categories(self) -> Generator[Course, None, None]:
        """Scrape all configured W3Schools categories."""
        for slug in CATEGORIES:
            yield from self.scrape_category(slug)

    @property
    def stats(self) -> Dict[str, int]:
        return {
            "courses_scraped": self._courses_scraped,
            "pages_scraped": self._pages_scraped,
        }
