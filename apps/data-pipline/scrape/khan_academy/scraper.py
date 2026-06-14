"""
Course Scraper module for extracting course data from Khan Academy.

Khan Academy is a React SPA.  Data is extracted from:
  1. ``__NEXT_DATA__`` / Apollo-state JSON embedded in the page
  2. Rendered DOM course cards (fallback)
  3. JSON-LD structured data (fallback)
"""

import random
import time
import logging
import re
import json
from typing import List, Dict, Optional, Generator, Any
from dataclasses import dataclass, field, asdict
from datetime import datetime
from urllib.parse import quote_plus

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
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data class  (unified fields for easy cross-platform integration)
# ---------------------------------------------------------------------------


@dataclass
class Course:
    """Represents a Khan Academy course/unit."""

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
    instructor_name: str = "Khan Academy"
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
    source: str = "khan_academy"
    scraped_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["skills"] = "|".join(self.skills) if self.skills else ""
        data["objectives"] = "|".join(self.objectives) if self.objectives else ""
        return ensure_headline_description_fields(data)


# ---------------------------------------------------------------------------
# Main scraper
# ---------------------------------------------------------------------------


class KhanAcademyScraper:
    """
    Selenium-based scraper for Khan Academy courses.

    Navigates subject pages, parses embedded JSON and rendered DOM to
    discover courses, then optionally drills into each course page for
    richer metadata.
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

    def _scroll_page(self, driver) -> None:
        """Scroll down to trigger lazy-loading of React content."""
        last_height = driver.execute_script("return document.body.scrollHeight")
        for _ in range(10):
            driver.execute_script("window.scrollBy(0, window.innerHeight * 0.8);")
            time.sleep(random.uniform(0.5, 1.0))
            new_height = driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                break
            last_height = new_height

    def _navigate(self, url: str, retries: int = MAX_RETRIES) -> Optional[str]:
        """Load *url* and return page source, retrying with proxy rotation."""
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

                # Extra wait for React hydration
                time.sleep(random.uniform(3, 5))
                self._scroll_page(driver)

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
        return any(m in lower for m in markers) and "khan" not in lower

    # ---- extraction strategies ----------------------------------------------

    def _extract_courses(self, html: str, category: str) -> List[Course]:
        """Try multiple extraction strategies in order of reliability."""
        soup = BeautifulSoup(html, "html.parser")
        category_name = CATEGORIES.get(category, category.replace("-", " ").title())

        # Strategy 1: embedded JSON (__NEXT_DATA__ / Apollo state)
        courses = self._extract_from_embedded_json(soup, category, category_name)
        if courses:
            return courses

        # Strategy 2: rendered DOM course cards
        courses = self._extract_from_dom(soup, category, category_name)
        if courses:
            return courses

        # Strategy 3: JSON-LD structured data
        return self._extract_from_jsonld(soup, category, category_name)

    # -- strategy 1: JSON ---

    def _extract_from_embedded_json(
        self,
        soup: BeautifulSoup,
        category: str,
        category_name: str,
    ) -> List[Course]:
        # Check __NEXT_DATA__
        next_data = soup.find("script", id="__NEXT_DATA__")
        if next_data and next_data.string:
            try:
                jdata = json.loads(next_data.string)
                courses = self._walk_json_for_courses(jdata, category, category_name)
                if courses:
                    return courses
            except (json.JSONDecodeError, TypeError):
                pass

        # Check Apollo state
        for script in soup.find_all("script"):
            text = script.string or ""
            m = re.search(
                r"window\.__APOLLO_STATE__\s*=\s*(\{.*?\});",
                text,
                re.DOTALL,
            )
            if m:
                try:
                    jdata = json.loads(m.group(1))
                    courses = self._walk_json_for_courses(
                        jdata, category, category_name
                    )
                    if courses:
                        return courses
                except (json.JSONDecodeError, TypeError):
                    pass
        return []

    def _walk_json_for_courses(
        self, jdata: Any, category: str, category_name: str
    ) -> List[Course]:
        found: list[dict] = []

        def _walk(obj, depth=0):
            if depth > 15:
                return
            if isinstance(obj, dict):
                has_title = "title" in obj or "translatedTitle" in obj
                has_slug = any(
                    k in obj for k in ("slug", "nodeSlug", "relativeUrl", "url")
                )
                kind = obj.get("kind") or obj.get("__typename") or obj.get("type", "")
                if (
                    kind in ("Course", "Topic", "Unit", "TopicPage")
                    or (has_title and has_slug)
                ) and has_title:
                    found.append(obj)
                for v in obj.values():
                    _walk(v, depth + 1)
            elif isinstance(obj, list):
                for item in obj:
                    _walk(item, depth + 1)

        _walk(jdata)

        courses: List[Course] = []
        seen: set[str] = set()

        for item in found:
            title = item.get("translatedTitle") or item.get("title", "")
            if not title or len(title) < 3:
                continue

            slug = item.get("slug") or item.get("nodeSlug") or ""
            if slug in seen:
                continue

            rel_url = item.get("relativeUrl") or item.get("url") or ""
            if not rel_url and slug:
                rel_url = f"/{category}/{slug}"
            url = rel_url
            if url and not url.startswith("http"):
                url = BASE_URL + url
            if not url:
                continue

            # Heuristic: skip items that clearly belong to a different subject
            if (
                category not in url.lower()
                and category.replace("-", "") not in url.lower()
            ):
                kind = item.get("kind") or item.get("__typename") or ""
                if kind not in ("Course", "Topic", "Unit"):
                    continue

            seen.add(slug or url)

            description = (
                item.get("translatedDescription") or item.get("description") or ""
            )
            headline = (
                item.get("translatedHeading")
                or item.get("headline")
                or item.get("subtitle")
                or ""
            )
            if not headline and description:
                headline = re.split(r"(?<=[.!?])\s+", description, maxsplit=1)[0]
            if not headline:
                headline = title
            image = item.get("imageUrl") or item.get("icon") or ""

            children = item.get("children") or item.get("childTopics") or []
            num_lessons = len(children) if isinstance(children, list) else 0
            child_count = item.get("childCount") or item.get("topicCount") or 0
            if not num_lessons and child_count:
                num_lessons = int(child_count)

            skills: list[str] = []
            if isinstance(children, list):
                for ch in children[:30]:
                    if isinstance(ch, dict):
                        ct = ch.get("translatedTitle") or ch.get("title", "")
                        if ct:
                            skills.append(ct)

            courses.append(
                Course(
                    id=abs(hash(url)) % 10_000_000,
                    title=title,
                    url=url,
                    headline=headline[:220],
                    description=description[:1000],
                    image_url=image,
                    num_lessons=num_lessons,
                    skills=skills,
                    category=category_name,
                    level="All Levels",
                )
            )

        return courses

    # -- strategy 2: DOM ---

    def _extract_from_dom(
        self,
        soup: BeautifulSoup,
        category: str,
        category_name: str,
    ) -> List[Course]:
        courses: List[Course] = []
        seen: set[str] = set()

        for link in soup.find_all("a", href=True):
            href = link["href"]
            if not href.startswith(f"/{category}/"):
                continue
            parts = href.strip("/").split("/")
            if len(parts) < 2 or len(parts) > 3:
                continue

            url = BASE_URL + href
            if url in seen:
                continue
            seen.add(url)

            heading = link.find(["h2", "h3", "h4", "span"])
            title = heading.get_text(strip=True) if heading else ""
            if not title:
                title = link.get_text(strip=True)
            if not title or len(title) < 3 or len(title) > 200:
                continue

            desc_el = link.find("p") or link.find_next_sibling("p")
            description = desc_el.get_text(strip=True)[:500] if desc_el else ""
            headline = link.get("aria-label", "")
            if not headline and description:
                headline = re.split(r"(?<=[.!?])\s+", description, maxsplit=1)[0]
            if not headline:
                headline = title

            img = link.find("img")
            image_url = ""
            if img:
                image_url = img.get("src", "") or img.get("data-src", "")

            courses.append(
                Course(
                    id=abs(hash(url)) % 10_000_000,
                    title=title,
                    url=url,
                    headline=headline[:220],
                    description=description,
                    image_url=image_url,
                    category=category_name,
                    level="All Levels",
                )
            )
        return courses

    # -- strategy 3: JSON-LD ---

    def _extract_from_jsonld(
        self,
        soup: BeautifulSoup,
        category: str,
        category_name: str,
    ) -> List[Course]:
        courses: List[Course] = []
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                blob = json.loads(script.string or "")
                items = []
                if isinstance(blob, dict):
                    if blob.get("@type") == "Course":
                        items.append(blob)
                    elif blob.get("@type") == "ItemList":
                        for el in blob.get("itemListElement", []):
                            inner = el.get("item", el)
                            if inner.get("@type") == "Course":
                                items.append(inner)
                elif isinstance(blob, list):
                    items = [
                        b
                        for b in blob
                        if isinstance(b, dict) and b.get("@type") == "Course"
                    ]
                for data in items:
                    c = self._course_from_jsonld(data, category_name)
                    if c:
                        courses.append(c)
            except (json.JSONDecodeError, TypeError):
                continue
        return courses

    def _course_from_jsonld(self, data: Dict, category_name: str) -> Optional[Course]:
        try:
            url = data.get("url", "")
            if url and not url.startswith("http"):
                url = BASE_URL + url
            title = data.get("name", "")
            if not title or not url:
                return None
            agg = data.get("aggregateRating") or {}
            description = data.get("description", "")[:1000]
            headline = data.get("headline", "")
            if not headline and description:
                headline = re.split(r"(?<=[.!?])\s+", description, maxsplit=1)[0]
            if not headline:
                headline = title
            return Course(
                id=abs(hash(url)) % 10_000_000,
                title=title,
                url=url,
                headline=headline[:220],
                description=description,
                rating=float(agg.get("ratingValue", 0) or 0),
                num_reviews=int(agg.get("reviewCount", 0) or 0),
                image_url=data.get("image", ""),
                category=category_name,
                level="All Levels",
            )
        except Exception as e:
            logger.debug(f"JSON-LD parse error: {e}")
            return None

    # ---- enrichment ---------------------------------------------------------

    def scrape_course_details(self, course: Course) -> Course:
        """Navigate to a course page and enrich with extra details."""
        if not course.url:
            return course
        html = self._navigate(course.url)
        if not html:
            return course

        soup = BeautifulSoup(html, "html.parser")

        if not course.description:
            desc = soup.select_one('[class*="description"]') or soup.select_one("p")
            if desc:
                course.description = desc.get_text(strip=True)[:1000]

        # Count video / exercise links as lessons
        unit_links = soup.select('a[href*="/v/"], a[href*="/e/"], a[href*="/a/"]')
        if unit_links:
            course.num_lessons = max(course.num_lessons, len(unit_links))

        if not course.skills:
            headings = soup.select("h3, h4")
            skills = [
                h.get_text(strip=True)
                for h in headings
                if h.get_text(strip=True) and len(h.get_text(strip=True)) > 2
            ]
            if skills:
                course.skills = skills[:30]

        return course

    # ---- public API ---------------------------------------------------------

    def scrape_category(
        self, category: str, max_pages: Optional[int] = None
    ) -> Generator[Course, None, None]:
        """Scrape courses from a Khan Academy subject area."""
        logger.info(f"Starting Khan Academy scrape for: {category}")
        cat_url = f"{BASE_URL}/{category}"

        html = self._navigate(cat_url)
        if not html:
            logger.error(f"Failed to load: {cat_url}")
            return

        courses = self._extract_courses(html, category)
        for course in courses:
            self._courses_scraped += 1
            yield course

        logger.info(f"Category {category}: {len(courses)} courses found")

    def scrape_all_categories(self) -> Generator[Course, None, None]:
        """Scrape all configured Khan Academy categories."""
        for slug in CATEGORIES:
            yield from self.scrape_category(slug)

    def scrape_search_results(
        self, query: str, max_pages: int = 5
    ) -> Generator[Course, None, None]:
        """Scrape courses from Khan Academy search results."""
        logger.info(f"Searching Khan Academy for: {query}")
        search_url = (
            f"{BASE_URL}/search?referer=%2F" f"&page_search_query={quote_plus(query)}"
        )

        html = self._navigate(search_url)
        if not html:
            logger.error("Failed to load search results")
            return

        soup = BeautifulSoup(html, "html.parser")
        seen: set[str] = set()

        skip_roots = {
            "profile",
            "login",
            "signup",
            "settings",
            "about",
            "donate",
            "khan-labs",
            "search",
        }

        for link in soup.find_all("a", href=True):
            href = link["href"]
            if not href.startswith("/"):
                continue
            parts = href.strip("/").split("/")
            if len(parts) < 2 or len(parts) > 4:
                continue
            if parts[0] in skip_roots:
                continue

            url = BASE_URL + href
            if url in seen:
                continue
            seen.add(url)

            title = link.get_text(strip=True)
            if not title or len(title) < 3 or len(title) > 200:
                continue

            cat_slug = parts[0]
            cat_name = CATEGORIES.get(cat_slug, cat_slug.replace("-", " ").title())

            self._courses_scraped += 1
            yield Course(
                id=abs(hash(url)) % 10_000_000,
                title=title,
                url=url,
                headline=title,
                category=cat_name,
                level="All Levels",
            )

    @property
    def stats(self) -> Dict[str, int]:
        return {
            "courses_scraped": self._courses_scraped,
            "pages_scraped": self._pages_scraped,
        }
