"""
Course Scraper module for extracting course data from Udemy using Selenium.

Uses undetected-chromedriver to bypass Cloudflare / bot detection,
with built-in proxy rotation, random delays, and scroll-based
lazy-load handling.
"""

import random
import time
import logging
import json
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
    NoSuchElementException,
    WebDriverException,
    StaleElementReferenceException,
)
from bs4 import BeautifulSoup

from shared.browser_factory import BrowserFactory
from shared.utils import ensure_headline_description_fields
from .proxy_manager import ProxyManager, Proxy
from .config import (
    BASE_URL,
    SELENIUM_TIMEOUT,
    PAGE_LOAD_TIMEOUT,
    IMPLICIT_WAIT,
    MAX_RETRIES,
    RETRY_DELAY,
    MIN_REQUEST_DELAY,
    MAX_REQUEST_DELAY,
    DEFAULT_PAGE_SIZE,
    MIN_PAGES_PERCENTAGE,
    CHROME_EXTRA_ARGS,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Data class
# ---------------------------------------------------------------------------


@dataclass
class Course:
    """Represents a Udemy course with all relevant information."""

    id: int
    title: str
    url: str
    headline: str = ""
    description: str = ""
    rating: float = 0.0
    num_reviews: int = 0
    num_subscribers: int = 0
    price: str = ""
    original_price: str = ""
    is_paid: bool = True
    instructor_name: str = ""
    instructor_title: str = ""
    image_url: str = ""
    duration_hours: float = 0.0
    num_lectures: int = 0
    num_articles: int = 0
    num_resources: int = 0
    level: str = ""
    language: str = ""
    has_certificate: bool = False
    last_updated: str = ""
    category: str = ""
    subcategory: str = ""
    topics: List[str] = field(default_factory=list)
    objectives: List[str] = field(default_factory=list)
    requirements: List[str] = field(default_factory=list)
    target_audience: List[str] = field(default_factory=list)
    source: str = "udemy"
    scraped_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        """Convert course to dictionary (lists → pipe-separated strings)."""
        data = asdict(self)
        data["topics"] = "|".join(self.topics) if self.topics else ""
        data["objectives"] = "|".join(self.objectives) if self.objectives else ""
        data["requirements"] = "|".join(self.requirements) if self.requirements else ""
        data["target_audience"] = (
            "|".join(self.target_audience) if self.target_audience else ""
        )
        return ensure_headline_description_fields(data)


# ---------------------------------------------------------------------------
# Main scraper
# ---------------------------------------------------------------------------


class UdemyScraper:
    """
    Selenium-based scraper for Udemy course listings.

    Features
    --------
    * Uses ``undetected-chromedriver`` to avoid bot detection.
    * Rotates proxies between page loads.
    * Scrolls the page to trigger lazy-loaded course cards.
    * Extracts title, link, rating, description, instructor, price,
      duration, lectures, level, and more.
    """

    def __init__(
        self,
        proxy_manager: Optional[ProxyManager] = None,
        use_proxies: bool = True,
        headless: bool = True,
    ):
        self.proxy_manager = proxy_manager or ProxyManager(use_free_proxies=use_proxies)
        self.use_proxies = use_proxies
        self.headless = headless
        self._driver: Optional[uc.Chrome] = None
        self._courses_scraped = 0
        self._pages_scraped = 0

    # ---- driver lifecycle ---------------------------------------------------

    def _get_driver(self, rotate_proxy: bool = False) -> uc.Chrome:
        """Return the current driver or create a new one (with optional proxy rotation)."""
        if self._driver and not rotate_proxy:
            return self._driver

        self._quit_driver()

        proxy = None
        if self.use_proxies:
            proxy = self.proxy_manager.get_random_proxy()

        self._driver = BrowserFactory.create_driver(
            proxy=proxy,
            headless=self.headless,
        )
        return self._driver

    def _quit_driver(self) -> None:
        """Safely close the current driver."""
        if self._driver:
            try:
                self._driver.quit()
            except OSError:
                pass  # Windows handle cleanup race condition
            except Exception:
                pass
            self._driver = None

    def close(self) -> None:
        """Public alias — tear down the browser."""
        self._quit_driver()

    def __del__(self):
        self._quit_driver()

    # ---- helpers ------------------------------------------------------------

    @staticmethod
    def _random_delay() -> None:
        time.sleep(random.uniform(MIN_REQUEST_DELAY, MAX_REQUEST_DELAY))

    def _scroll_to_load_all(self, driver: uc.Chrome) -> None:
        """Scroll down the page gradually to trigger lazy-loading of course cards."""
        last_height = driver.execute_script("return document.body.scrollHeight")
        for _ in range(15):
            driver.execute_script("window.scrollBy(0, window.innerHeight * 0.8);")
            time.sleep(random.uniform(0.6, 1.2))
            new_height = driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                break
            last_height = new_height

    def _navigate(self, url: str, retries: int = MAX_RETRIES) -> Optional[str]:
        """
        Navigate to *url* and return the page source, retrying with fresh
        proxies on failure.
        """
        for attempt in range(retries):
            try:
                rotate = attempt > 0  # rotate proxy after first failure
                driver = self._get_driver(rotate_proxy=rotate)
                self._random_delay()

                logger.info(f"Loading {url}  (attempt {attempt + 1}/{retries})")
                driver.get(url)

                # Wait until <body> is present
                WebDriverWait(driver, SELENIUM_TIMEOUT).until(
                    EC.presence_of_element_located((By.TAG_NAME, "body"))
                )

                # Short wait for JS to render
                time.sleep(random.uniform(2, 4))

                # Scroll to load lazy content
                self._scroll_to_load_all(driver)

                page_source = driver.page_source

                # Detect blocks / captchas
                if self._is_blocked(page_source):
                    logger.warning("Blocked / captcha detected — rotating proxy")
                    self._quit_driver()
                    time.sleep(RETRY_DELAY)
                    continue

                return page_source

            except TimeoutException:
                logger.warning(f"Page load timeout (attempt {attempt + 1})")
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
        """Heuristic check for Cloudflare / access-denied pages."""
        lower = html[:5000].lower()
        # Hard blocks — definitely blocked
        hard_markers = [
            "access denied",
            "captcha",
            "please verify you are a human",
            "cf-browser-verification",
        ]
        if any(m in lower for m in hard_markers):
            return True
        # Soft markers — only blocked if no course content found
        soft_markers = [
            "just a moment",
            "checking your browser",
        ]
        has_soft = any(m in lower for m in soft_markers)
        has_content = "course-card" in lower or "udemy" in lower or "course" in lower
        return has_soft and not has_content

    # ---- URL builders -------------------------------------------------------

    @staticmethod
    def _build_category_url(category: str, subcategory: Optional[str] = None) -> str:
        if subcategory:
            return f"{BASE_URL}/courses/{category}/{subcategory}/"
        return f"{BASE_URL}/courses/{category}/"

    # ---- HTML → Course list --------------------------------------------------

    def _extract_courses_from_html(self, html: str, category: str) -> List[Course]:
        """Parse rendered HTML and return a list of Course objects."""
        courses: List[Course] = []
        soup = BeautifulSoup(html, "html.parser")

        # ---- Strategy 1: DOM course cards (most reliable for Udemy 2024/2025) ----
        # Udemy wraps every course in a container div with class containing
        # "course-card_container" and data-purpose="container".
        cards = soup.select('div[class*="course-card_container"]')
        if not cards:
            # Fallback: anything that contains a course-title-url
            title_h3s = soup.select('[data-purpose="course-title-url"]')
            for h3 in title_h3s:
                # Walk up to find a suitable card wrapper
                parent = h3
                for _ in range(5):
                    if parent.parent and parent.parent.name not in (
                        "body",
                        "html",
                        "[document]",
                    ):
                        parent = parent.parent
                        cls = " ".join(parent.get("class", []))
                        if "course-card" in cls or "course-unit" in cls:
                            break
                cards.append(parent)

        for card in cards:
            c = self._course_from_card(card, category)
            if c:
                courses.append(c)

        if courses:
            return courses

        # ---- Strategy 2: JSON-LD (some pages embed structured data) ----
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                blob = json.loads(script.string or "")
                if isinstance(blob, dict) and blob.get("@type") == "ItemList":
                    for item in blob.get("itemListElement", []):
                        c = self._course_from_jsonld(item.get("item", item), category)
                        if c:
                            courses.append(c)
                elif isinstance(blob, list):
                    for item in blob:
                        if isinstance(item, dict) and item.get("@type") == "Course":
                            c = self._course_from_jsonld(item, category)
                            if c:
                                courses.append(c)
                elif isinstance(blob, dict) and blob.get("@type") == "Course":
                    c = self._course_from_jsonld(blob, category)
                    if c:
                        courses.append(c)
            except (json.JSONDecodeError, TypeError):
                continue

        if courses:
            return courses

        # ---- Strategy 3: __NEXT_DATA__ fallback ----
        next_data = soup.find("script", id="__NEXT_DATA__")
        if next_data and next_data.string:
            try:
                jdata = json.loads(next_data.string)
                courses = self._courses_from_next_data(jdata, category)
            except (json.JSONDecodeError, TypeError):
                pass

        return courses

    # ---- individual parsers -------------------------------------------------

    def _course_from_jsonld(self, data: Dict, category: str) -> Optional[Course]:
        try:
            agg = data.get("aggregateRating") or {}
            creator = data.get("creator") or data.get("author") or {}
            if isinstance(creator, list):
                creator = creator[0] if creator else {}
            instructor = (
                creator.get("name", "") if isinstance(creator, dict) else str(creator)
            )

            url = data.get("url", "")
            if url and not url.startswith("http"):
                url = BASE_URL + url

            return Course(
                id=abs(hash(url)) % 10_000_000,
                title=data.get("name", ""),
                url=url,
                description=data.get("description", ""),
                rating=float(agg.get("ratingValue", 0) or 0),
                num_reviews=int(agg.get("reviewCount", 0) or 0),
                instructor_name=instructor,
                image_url=data.get("image", ""),
                category=category,
            )
        except Exception as e:
            logger.debug(f"JSON-LD parse error: {e}")
            return None

    def _courses_from_next_data(self, jdata: Dict, category: str) -> List[Course]:
        """Walk __NEXT_DATA__ looking for course arrays."""
        courses: List[Course] = []

        def _walk(obj):
            """Recursively look for dicts that look like course records."""
            if isinstance(obj, dict):
                # Udemy's internal API objects usually contain 'title' & 'url'
                if "title" in obj and ("url" in obj or "published_title" in obj):
                    c = self._course_from_api_obj(obj, category)
                    if c:
                        courses.append(c)
                for v in obj.values():
                    _walk(v)
            elif isinstance(obj, list):
                for item in obj:
                    _walk(item)

        try:
            props = jdata.get("props", {}).get("pageProps", {})
            _walk(props)
        except Exception:
            pass
        return courses

    def _course_from_api_obj(self, d: Dict, category: str) -> Optional[Course]:
        """Build a Course from a Udemy internal JSON object."""
        try:
            title = d.get("title", "")
            if not title:
                return None

            url = d.get("url", "") or f"/course/{d.get('published_title', '')}/"
            if url and not url.startswith("http"):
                url = BASE_URL + url

            instructors = d.get("visible_instructors") or d.get("instructors") or []
            instr_name = instructors[0].get("display_name", "") if instructors else ""

            rating = float(d.get("rating", 0) or 0)
            num_reviews = int(d.get("num_reviews", 0) or 0)
            num_subscribers = int(d.get("num_subscribers", 0) or 0)

            price_detail = d.get("price_detail") or {}
            price = str(d.get("price", "")) or str(price_detail.get("price_string", ""))
            headline = d.get("headline", "")
            description = (
                d.get("description", "")
                or d.get("short_description", "")
                or d.get("snippet", "")
            )
            if not description and headline:
                description = headline

            return Course(
                id=int(d.get("id", 0) or abs(hash(url)) % 10_000_000),
                title=title,
                url=url,
                headline=headline,
                description=description,
                rating=rating,
                num_reviews=num_reviews,
                num_subscribers=num_subscribers,
                price=price,
                instructor_name=instr_name,
                image_url=d.get("image_480x270", "") or d.get("image_240x135", ""),
                num_lectures=int(d.get("num_lectures", 0) or 0),
                duration_hours=round(
                    float(
                        d.get("content_info_short", "0").split()[0]
                        if d.get("content_info_short")
                        else 0
                    ),
                    2,
                ),
                level=d.get("instructional_level_simple", "")
                or d.get("instructional_level", ""),
                is_paid=d.get("is_paid", True),
                category=category,
            )
        except Exception as e:
            logger.debug(f"API obj parse error: {e}")
            return None

    def _course_from_card(self, card, category: str) -> Optional[Course]:
        """Parse a single course-card DOM element (Udemy 2025 structure)."""
        try:
            # ---- Title + Link ----
            title_h3 = card.select_one('[data-purpose="course-title-url"]')
            if not title_h3:
                return None

            link_el = title_h3.select_one("a[href]") or title_h3.find("a")
            if not link_el:
                return None

            url = link_el.get("href", "")
            if url and not url.startswith("http"):
                url = BASE_URL + url
            if not url:
                return None

            # Title is the direct text of the <a>, excluding the hidden seo div
            title = ""
            for child in link_el.children:
                if isinstance(child, str):
                    title += child.strip()
                elif hasattr(child, "name"):
                    if "sr-only" not in " ".join(child.get("class", [])):
                        title += child.get_text(strip=True)
            title = title.strip()
            if not title:
                title = link_el.get_text(strip=True)[:120]

            course_id = abs(hash(url)) % 10_000_000

            # ---- SEO hidden spans inside the link (data-testid="seo-*") ----
            seo = {}
            for span in link_el.select("span[data-testid]"):
                key = span.get("data-testid", "")
                seo[key] = span.get_text(strip=True)

            # Headline
            headline = seo.get("seo-headline", "")
            if not headline:
                hl = card.select_one(
                    '[data-purpose="safely-set-inner-html:course-card:course-headline"]'
                )
                headline = hl.get_text(strip=True) if hl else ""
            description = headline

            # Rating
            rating = 0.0
            r_el = card.select_one('[data-purpose="rating-number"]')
            if r_el:
                try:
                    rating = float(r_el.get_text(strip=True))
                except ValueError:
                    pass
            if not rating and seo.get("seo-rating"):
                m = re.search(r"([\d.]+)", seo["seo-rating"])
                if m:
                    rating = float(m.group(1))

            # Reviews
            num_reviews = 0
            if seo.get("seo-num-reviews"):
                m = re.search(r"([\d,]+)", seo["seo-num-reviews"].replace(",", ""))
                if m:
                    num_reviews = int(m.group(1))
            if not num_reviews:
                rev_el = card.select_one(
                    'span[class*="course-card-ratings_reviews-text"]'
                )
                if rev_el:
                    m = re.search(r"[\d,]+", rev_el.get_text().replace(",", ""))
                    if m:
                        num_reviews = int(m.group())

            # Duration
            duration_hours = 0.0
            if seo.get("seo-content-info"):
                dm = re.search(
                    r"([\d.]+)\s*(?:total\s*)?hours?", seo["seo-content-info"], re.I
                )
                if dm:
                    duration_hours = float(dm.group(1))

            # Lectures
            num_lectures = 0
            if seo.get("seo-num-lectures"):
                lm = re.search(r"(\d+)", seo["seo-num-lectures"])
                if lm:
                    num_lectures = int(lm.group(1))

            # Level
            level = ""
            if seo.get("seo-instructional-level"):
                level = seo["seo-instructional-level"]

            # Price
            price = ""
            if seo.get("seo-current-price"):
                price = seo["seo-current-price"].replace("Current price:", "").strip()
            if not price:
                price_el = card.select_one('[data-purpose="course-price-text"]')
                if price_el:
                    # Get non-sr-only span
                    for sp in price_el.select("span"):
                        if "sr-only" not in " ".join(sp.get("class", [])):
                            txt = sp.get_text(strip=True)
                            if txt:
                                price = txt
                                break

            # Original price
            original_price = ""
            if seo.get("seo-original-price"):
                original_price = (
                    seo["seo-original-price"].replace("Original price:", "").strip()
                )
            if not original_price:
                old_el = card.select_one('[data-purpose="course-old-price-text"]')
                if old_el:
                    for sp in old_el.select("span"):
                        if "sr-only" not in " ".join(sp.get("class", [])):
                            txt = sp.get_text(strip=True)
                            if txt:
                                original_price = txt
                                break

            # Instructor
            inst_el = card.select_one(
                '[data-purpose="safely-set-inner-html:course-card:visible-instructors"]'
            )
            instructor_name = inst_el.get_text(strip=True) if inst_el else ""

            # Image
            img_el = card.select_one("img")
            image_url = ""
            if img_el:
                image_url = img_el.get("src", "") or img_el.get("data-src", "")

            # Meta info fallback (duration / lectures / level from visible text)
            meta_el = card.select_one('[data-purpose="course-meta-info"]')
            if meta_el:
                meta_text = meta_el.get_text()
                if not duration_hours:
                    dm = re.search(r"([\d.]+)\s*(?:total\s*)?hours?", meta_text, re.I)
                    if dm:
                        duration_hours = float(dm.group(1))
                if not num_lectures:
                    lm = re.search(r"(\d+)\s*lectures?", meta_text, re.I)
                    if lm:
                        num_lectures = int(lm.group(1))
                if not level:
                    lv = re.search(
                        r"(All Levels|Beginner|Intermediate|Expert|Advanced)",
                        meta_text,
                        re.I,
                    )
                    if lv:
                        level = lv.group(1)

            return Course(
                id=course_id,
                title=title,
                url=url,
                headline=headline,
                description=description,
                rating=rating,
                num_reviews=num_reviews,
                instructor_name=instructor_name,
                price=price,
                original_price=original_price,
                image_url=image_url,
                duration_hours=duration_hours,
                num_lectures=num_lectures,
                level=level,
                category=category,
            )
        except Exception as e:
            logger.debug(f"Card parse error: {e}")
            return None

    # ---- pagination ---------------------------------------------------------

    def _get_total_pages(self, html: str) -> int:
        soup = BeautifulSoup(html, "html.parser")

        # Pagination buttons
        pag = soup.select_one('[data-purpose="pagination"]') or soup.select_one(
            'nav[aria-label*="aginat"]'
        )
        if pag:
            nums = [
                int(b.get_text(strip=True))
                for b in pag.select("a, button")
                if b.get_text(strip=True).isdigit()
            ]
            if nums:
                return max(nums)

        # "10,000 results" banner
        res_el = soup.select_one(
            '[class*="filter-panel--num-results"]'
        ) or soup.select_one('[data-purpose="search-result-count"]')
        if res_el:
            m = re.search(r"([\d,]+)\s*results?", res_el.get_text(), re.I)
            if m:
                total = int(m.group(1).replace(",", ""))
                return (total + DEFAULT_PAGE_SIZE - 1) // DEFAULT_PAGE_SIZE

        # __NEXT_DATA__ may expose pagination
        nd = soup.find("script", id="__NEXT_DATA__")
        if nd and nd.string:
            try:
                j = json.loads(nd.string)

                def _find_pagination(obj):
                    if isinstance(obj, dict):
                        if "num_pages" in obj:
                            return int(obj["num_pages"])
                        if "count" in obj and isinstance(obj["count"], int):
                            return (
                                obj["count"] + DEFAULT_PAGE_SIZE - 1
                            ) // DEFAULT_PAGE_SIZE
                        for v in obj.values():
                            r = _find_pagination(v)
                            if r:
                                return r
                    elif isinstance(obj, list):
                        for item in obj:
                            r = _find_pagination(item)
                            if r:
                                return r
                    return None

                p = _find_pagination(j)
                if p:
                    return p
            except Exception:
                pass

        return 1

    # ---- public API ---------------------------------------------------------

    def scrape_category(
        self,
        category: str,
        subcategory: Optional[str] = None,
        min_pages_percentage: float = MIN_PAGES_PERCENTAGE,
        max_pages: Optional[int] = None,
    ) -> Generator[Course, None, None]:
        """
        Scrape courses from a Udemy category, yielding each course as it is found.

        Navigates at least ``min_pages_percentage`` of all available pages
        (or ``max_pages`` if provided).
        """
        logger.info(
            f"Starting scrape for category: {category}"
            + (f"/{subcategory}" if subcategory else "")
        )

        category_url = self._build_category_url(category, subcategory)

        # Page 1
        html = self._navigate(category_url)
        if not html:
            logger.error(f"Failed to load category page: {category_url}")
            return

        total_pages = self._get_total_pages(html)
        logger.info(f"Detected {total_pages} total pages")

        if max_pages:
            pages_to_scrape = min(max_pages, total_pages)
        else:
            pages_to_scrape = max(1, int(total_pages * min_pages_percentage))

        logger.info(
            f"Will scrape {pages_to_scrape} pages ({pages_to_scrape / max(total_pages, 1) * 100:.0f}%)"
        )

        # Yield courses from page 1
        courses = self._extract_courses_from_html(html, category)
        for c in courses:
            self._courses_scraped += 1
            yield c
        self._pages_scraped = 1
        logger.info(f"Page 1: {len(courses)} courses")

        # Remaining pages
        for page in range(2, pages_to_scrape + 1):
            page_url = f"{category_url}?p={page}"
            html = self._navigate(page_url)
            if not html:
                logger.warning(f"Skipping page {page} (load failed)")
                continue

            courses = self._extract_courses_from_html(html, category)
            if not courses:
                logger.warning(f"No courses found on page {page}")
                continue

            for c in courses:
                self._courses_scraped += 1
                yield c
            self._pages_scraped += 1
            logger.info(f"Page {page}/{pages_to_scrape}: {len(courses)} courses")

        logger.info(
            f"Scraping complete — {self._courses_scraped} courses from {self._pages_scraped} pages"
        )

    def scrape_course_details(self, course: Course) -> Course:
        """Navigate to a course page and enrich the Course with extra fields."""
        if not course.url:
            return course

        html = self._navigate(course.url)
        if not html:
            return course

        soup = BeautifulSoup(html, "html.parser")

        # Description
        desc = soup.select_one(
            '[data-purpose="course-description"]'
        ) or soup.select_one('[class*="course-description"]')
        if desc:
            course.description = desc.get_text(strip=True)[:2000]

        # Objectives
        obj_box = soup.select_one(
            '[data-purpose="course-objectives"]'
        ) or soup.select_one('[class*="what-you-will-learn"]')
        if obj_box:
            course.objectives = [
                li.get_text(strip=True) for li in obj_box.select("li")[:10]
            ]

        # Requirements
        req_box = soup.select_one(
            '[data-purpose="course-requirements"]'
        ) or soup.select_one('[class*="requirements"]')
        if req_box:
            course.requirements = [
                li.get_text(strip=True) for li in req_box.select("li")[:10]
            ]

        # Target audience
        aud_box = soup.select_one('[data-purpose="target-audience"]')
        if aud_box:
            course.target_audience = [
                li.get_text(strip=True) for li in aud_box.select("li")[:10]
            ]

        # Subscribers
        enr = soup.select_one('[data-purpose="enrollment"]')
        if enr:
            m = re.search(r"([\d,]+)", enr.get_text().replace(",", ""))
            if m:
                course.num_subscribers = int(m.group(1))

        # Last updated
        upd = soup.select_one('[data-purpose="last-update-date"]')
        if upd:
            course.last_updated = upd.get_text(strip=True)

        # Language
        lang = soup.select_one('[data-purpose="lead-course-locale"]')
        if lang:
            course.language = lang.get_text(strip=True)

        return course

    def scrape_search_results(
        self,
        query: str,
        max_pages: int = 20,
    ) -> Generator[Course, None, None]:
        """Scrape courses from Udemy search results."""
        logger.info(f"Searching for: {query}")

        for page in range(1, max_pages + 1):
            url = f"{BASE_URL}/courses/search/?q={query}&p={page}"
            html = self._navigate(url)
            if not html:
                logger.warning(f"Search page {page} failed")
                continue

            courses = self._extract_courses_from_html(html, f"search:{query}")
            if not courses:
                logger.info(f"No more results at page {page}")
                break

            for c in courses:
                yield c
            logger.info(f"Search page {page}: {len(courses)} courses")

    @property
    def stats(self) -> Dict[str, int]:
        return {
            "courses_scraped": self._courses_scraped,
            "pages_scraped": self._pages_scraped,
            "available_proxies": self.proxy_manager.available_count,
            "total_proxies": self.proxy_manager.total_count,
        }
