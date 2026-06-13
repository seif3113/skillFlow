"""
Course Scraper module for extracting course data from Coursera using Selenium.

Uses undetected-chromedriver to bypass bot detection,
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

from .proxy_manager import ProxyManager, Proxy
from shared.browser_factory import BrowserFactory
from shared.utils import ensure_headline_description_fields
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
    """Represents a Coursera course with all relevant information."""

    id: int
    title: str
    url: str
    headline: str = ""
    description: str = ""
    rating: float = 0.0
    num_reviews: int = 0
    num_enrolled: int = 0
    price: str = ""
    is_free: bool = False
    instructor_name: str = ""
    institution: str = ""
    image_url: str = ""
    duration_weeks: float = 0.0
    hours_per_week: float = 0.0
    num_modules: int = 0
    level: str = ""
    language: str = ""
    has_certificate: bool = True
    course_type: str = ""  # Course, Specialization, Professional Certificate, etc.
    skills: List[str] = field(default_factory=list)
    category: str = ""
    subcategory: str = ""
    objectives: List[str] = field(default_factory=list)
    prerequisites: List[str] = field(default_factory=list)
    subtitles: List[str] = field(default_factory=list)
    source: str = "coursera"
    scraped_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        """Convert course to dictionary (lists → pipe-separated strings)."""
        data = asdict(self)
        data["skills"] = "|".join(self.skills) if self.skills else ""
        data["objectives"] = "|".join(self.objectives) if self.objectives else ""
        data["prerequisites"] = (
            "|".join(self.prerequisites) if self.prerequisites else ""
        )
        data["subtitles"] = "|".join(self.subtitles) if self.subtitles else ""
        return ensure_headline_description_fields(data)


# ---------------------------------------------------------------------------
# Main scraper
# ---------------------------------------------------------------------------


class CourseraScraper:
    """
    Selenium-based scraper for Coursera course listings.

    Features
    --------
    * Uses ``undetected-chromedriver`` to avoid bot detection.
    * Rotates proxies between page loads.
    * Scrolls the page to trigger lazy-loaded course cards.
    * Extracts title, link, rating, description, instructor, institution,
      duration, level, skills, course type, and more.
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
        if self._driver and not rotate_proxy:
            return self._driver
        self._quit_driver()
        proxy = None
        if self.use_proxies:
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

    def _scroll_to_load_all(self, driver: uc.Chrome) -> None:
        last_height = driver.execute_script("return document.body.scrollHeight")
        for _ in range(20):
            driver.execute_script("window.scrollBy(0, window.innerHeight * 0.8);")
            time.sleep(random.uniform(0.6, 1.2))
            new_height = driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                break
            last_height = new_height

    def _navigate(self, url: str, retries: int = MAX_RETRIES) -> Optional[str]:
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

                time.sleep(random.uniform(2, 4))
                self._scroll_to_load_all(driver)

                page_source = driver.page_source

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
        lower = html[:5000].lower()
        hard_markers = [
            "access denied",
            "captcha",
            "please verify you are a human",
            "cf-browser-verification",
        ]
        if any(m in lower for m in hard_markers):
            return True
        soft_markers = [
            "just a moment",
            "checking your browser",
        ]
        has_soft = any(m in lower for m in soft_markers)
        has_content = "coursera" in lower or "cds-productcard" in lower
        return has_soft and not has_content

    # ---- URL builders -------------------------------------------------------

    @staticmethod
    def _build_category_url(
        category: str, subcategory: Optional[str] = None, page: int = 1
    ) -> str:
        """Build a Coursera browse URL for a given category."""
        if subcategory:
            url = f"{BASE_URL}/courses?query={subcategory}&topic={category}"
        else:
            url = f"{BASE_URL}/courses?query={category}"
        if page > 1:
            url += f"&page={page}"
        return url

    @staticmethod
    def _build_search_url(query: str, page: int = 1) -> str:
        """Build a Coursera search URL."""
        url = f"{BASE_URL}/search?query={query}"
        if page > 1:
            url += f"&page={page}"
        return url

    # ---- HTML → Course list --------------------------------------------------

    def _extract_courses_from_html(self, html: str, category: str) -> List[Course]:
        """Parse rendered HTML and return a list of Course objects."""
        courses: List[Course] = []
        soup = BeautifulSoup(html, "html.parser")

        # ---- Strategy 1: product-card-cds cards (Coursera 2025 structure) ----
        # Each card lives inside a <li class="cds-9"> containing
        # <div data-testid="product-card-cds">.  Use the <li> as the
        # top-level container so we don't accidentally match inner divs.
        cards = soup.select('li.cds-9:has(div[data-testid="product-card-cds"])')
        if not cards:
            cards = soup.select('div[data-testid="product-card-cds"]')
        if not cards:
            cards = soup.select("div.cds-ProductCard-base")

        for card in cards:
            c = self._course_from_card(card, category)
            if c:
                courses.append(c)

        # Deduplicate by URL
        if courses:
            seen_urls = set()
            unique = []
            for c in courses:
                if c.url not in seen_urls:
                    seen_urls.add(c.url)
                    unique.append(c)
            return unique

        # ---- Strategy 2: JSON-LD ----
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

        # ---- Strategy 3: __NEXT_DATA__ (Coursera is a Next.js app) ----
        next_data = soup.find("script", id="__NEXT_DATA__")
        if next_data and next_data.string:
            try:
                jdata = json.loads(next_data.string)
                courses = self._courses_from_next_data(jdata, category)
            except (json.JSONDecodeError, TypeError):
                pass

        return courses

    def _find_course_containers(self, soup: BeautifulSoup) -> list:
        """Find course containers by looking for links to course pages."""
        containers = []
        links = soup.find_all(
            "a", href=re.compile(r"/(learn|specializations|professional-certificates)/")
        )
        for link in links:
            parent = link
            for _ in range(5):
                if parent.parent and parent.parent.name not in (
                    "body",
                    "html",
                    "[document]",
                ):
                    parent = parent.parent
                    cls = " ".join(parent.get("class", []))
                    if any(
                        kw in cls.lower()
                        for kw in ["card", "product", "result", "item"]
                    ):
                        break
            containers.append(parent)
        return containers

    # ---- individual parsers -------------------------------------------------

    def _course_from_jsonld(self, data: Dict, category: str) -> Optional[Course]:
        try:
            agg = data.get("aggregateRating") or {}
            provider = data.get("provider") or data.get("creator") or {}
            if isinstance(provider, list):
                provider = provider[0] if provider else {}
            institution = (
                provider.get("name", "")
                if isinstance(provider, dict)
                else str(provider)
            )

            url = data.get("url", "")
            if url and not url.startswith("http"):
                url = BASE_URL + url

            description = data.get("description", "")
            headline = data.get("headline", "")
            if not headline and description:
                headline = re.split(r"(?<=[.!?])\s+", description, maxsplit=1)[0]

            return Course(
                id=abs(hash(url)) % 10_000_000,
                title=data.get("name", ""),
                url=url,
                headline=headline[:240],
                description=description[:2000],
                rating=float(agg.get("ratingValue", 0) or 0),
                num_reviews=int(agg.get("reviewCount", 0) or 0),
                institution=institution,
                image_url=data.get("image", ""),
                category=category,
                source="coursera",
            )
        except Exception as e:
            logger.debug(f"JSON-LD parse error: {e}")
            return None

    def _courses_from_next_data(self, jdata: Dict, category: str) -> List[Course]:
        """Walk __NEXT_DATA__ looking for course arrays."""
        courses: List[Course] = []

        def _walk(obj):
            if isinstance(obj, dict):
                # Coursera objects often have 'name' and 'slug' or 'courseId'
                if ("name" in obj or "title" in obj) and (
                    "slug" in obj or "url" in obj or "courseId" in obj or "id" in obj
                ):
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
        """Build a Course from a Coursera internal JSON object."""
        try:
            title = d.get("name", "") or d.get("title", "")
            if not title:
                return None

            slug = d.get("slug", "") or d.get("published_title", "")
            url = d.get("url", "")
            if not url and slug:
                course_type_str = (
                    d.get("productType", "") or d.get("courseType", "") or "learn"
                )
                if "specialization" in course_type_str.lower():
                    url = f"{BASE_URL}/specializations/{slug}"
                elif "professional" in course_type_str.lower():
                    url = f"{BASE_URL}/professional-certificates/{slug}"
                else:
                    url = f"{BASE_URL}/learn/{slug}"
            elif url and not url.startswith("http"):
                url = BASE_URL + url

            # Partners / Institution
            partners = d.get("partners") or d.get("partnerIds") or []
            institution = ""
            if isinstance(partners, list) and partners:
                if isinstance(partners[0], dict):
                    institution = partners[0].get("name", "")
                elif isinstance(partners[0], str):
                    institution = partners[0]

            if not institution:
                institution = d.get("partnerName", "") or d.get("universityName", "")

            # Instructor
            instructors = d.get("instructors") or d.get("instructorIds") or []
            instr_name = ""
            if isinstance(instructors, list) and instructors:
                if isinstance(instructors[0], dict):
                    instr_name = instructors[0].get("name", "") or instructors[0].get(
                        "fullName", ""
                    )
                elif isinstance(instructors[0], str):
                    instr_name = instructors[0]

            rating = float(d.get("avgRating", 0) or d.get("rating", 0) or 0)
            num_reviews = int(d.get("reviewCount", 0) or d.get("numReviews", 0) or 0)
            num_enrolled = int(d.get("enrollments", 0) or d.get("numEnrolled", 0) or 0)

            course_type = (
                d.get("productType", "") or d.get("courseType", "") or "Course"
            )

            skills = d.get("skills") or d.get("domainTypes") or []
            if isinstance(skills, list) and skills:
                if isinstance(skills[0], dict):
                    skills = [s.get("name", "") or s.get("skill", "") for s in skills]
            else:
                skills = []

            level = (
                d.get("difficulty", "")
                or d.get("level", "")
                or d.get("difficultyLevel", "")
            )

            description = (
                d.get("description", "")
                or d.get("shortDescription", "")
                or d.get("short_description", "")
            )
            headline = (
                d.get("headline", "")
                or d.get("tagline", "")
                or d.get("shortDescription", "")
            )
            if not headline and description:
                headline = re.split(r"(?<=[.!?])\s+", description, maxsplit=1)[0]

            return Course(
                id=int(
                    d.get("id", 0)
                    or d.get("courseId", 0)
                    or abs(hash(url)) % 10_000_000
                ),
                title=title,
                url=url,
                headline=headline[:240],
                description=description[:2000],
                rating=rating,
                num_reviews=num_reviews,
                num_enrolled=num_enrolled,
                instructor_name=instr_name,
                institution=institution,
                image_url=d.get("imageUrl", "")
                or d.get("photoUrl", "")
                or d.get("image", ""),
                level=level,
                course_type=course_type,
                skills=skills,
                language=d.get("language", "") or d.get("primaryLanguage", ""),
                category=category,
                source="coursera",
            )
        except Exception as e:
            logger.debug(f"API obj parse error: {e}")
            return None

    def _course_from_card(self, card, category: str) -> Optional[Course]:
        """Parse a single Coursera product-card-cds DOM element (2025 structure).

        Expected hierarchy:
            li.cds-9
              div[data-testid="product-card-cds"]
                div.cds-ProductCard-base
                  …cds-ProductCard-gridPreviewContainer  (image, status tags)
                  …cds-ProductCard-content
                    cds-ProductCard-header
                      p.cds-ProductCard-partnerNames        → institution
                      a.cds-CommonCard-titleLink             → title + URL
                    cds-RatingStat  (rating + reviews)
                    p.css-vac8rf  (meta: level · type · duration)
        """
        try:
            # ---- Title + Link ----
            link_el = card.select_one('a[class*="cds-CommonCard-titleLink"]')
            if not link_el:
                link_el = card.select_one(
                    'a[href*="/learn/"], a[href*="/specializations/"], '
                    'a[href*="/professional-certificates/"]'
                )
            if not link_el:
                return None

            url = link_el.get("href", "")
            if url and not url.startswith("http"):
                url = BASE_URL + url
            if not url:
                return None

            # Title: hidden div inside the link often has clean text
            title = ""
            inner_div = link_el.select_one("div")
            if inner_div:
                title = inner_div.get_text(strip=True)
            if not title:
                title = link_el.get("aria-label", "").split(",")[0].strip()
            if not title:
                title = link_el.get_text(strip=True)[:120]

            course_id = abs(hash(url)) % 10_000_000

            # ---- Course type from URL ----
            course_type = "Course"
            if "/specializations/" in url:
                course_type = "Specialization"
            elif "/professional-certificates/" in url:
                course_type = "Professional Certificate"

            # ---- Institution / Partner ----
            institution = ""
            partner_el = card.select_one(
                "p.cds-ProductCard-partnerNames, [class*='cds-ProductCard-partnerNames']"
            )
            if partner_el:
                institution = partner_el.get_text(strip=True)

            # ---- Rating ----
            rating = 0.0
            # The visible rating number lives in a small span like <span class="css-4s48ix">4.6</span>
            rating_stat = card.select_one('[class*="cds-RatingStat"]')
            if rating_stat:
                # First plain numeric span
                for span in rating_stat.select("span"):
                    txt = span.get_text(strip=True)
                    if re.fullmatch(r"\d\.\d", txt):
                        rating = float(txt)
                        break
                if not rating:
                    m = re.search(r"(\d\.\d)", rating_stat.get_text())
                    if m:
                        rating = float(m.group(1))

            # ---- Number of reviews ----
            num_reviews = 0
            review_el = card.select_one('[class*="cds-RatingStat"]')
            if review_el:
                review_text = review_el.get_text()
                m = re.search(r"([\d.]+)\s*[KkMm]?\s*reviews?", review_text, re.I)
                if m:
                    from .utils import parse_enrollment_count

                    num_reviews = parse_enrollment_count(
                        m.group(0).split("review")[0].strip()
                    )

            # ---- Status tag (Free Trial, etc.) ----
            is_free = False
            status_el = card.select_one('[data-testid="tag-root"]')
            if status_el:
                status_text = status_el.get_text(strip=True).lower()
                if "free" in status_text:
                    is_free = True

            # ---- Meta line: "Beginner · Course · 1 - 3 Months" ----
            level = ""
            duration_weeks = 0.0
            meta_paragraphs = card.select("p")
            for p in meta_paragraphs:
                text = p.get_text(strip=True)
                # The meta line typically contains "·" separators
                if "·" in text and any(
                    kw in text
                    for kw in [
                        "Beginner",
                        "Intermediate",
                        "Advanced",
                        "Mixed",
                        "Course",
                        "Specialization",
                        "Professional",
                        "Month",
                        "Week",
                        "Hour",
                    ]
                ):
                    # Level
                    lv = re.search(
                        r"(Beginner|Intermediate|Advanced|Mixed)", text, re.I
                    )
                    if lv:
                        level = lv.group(1)
                    # Duration
                    dur = re.search(
                        r"(\d+)\s*[-–]\s*(\d+)\s*(Month|Week|Hour)s?", text, re.I
                    )
                    if dur:
                        low, high = int(dur.group(1)), int(dur.group(2))
                        avg = (low + high) / 2.0
                        unit = dur.group(3).lower()
                        if unit.startswith("month"):
                            duration_weeks = avg * 4
                        elif unit.startswith("week"):
                            duration_weeks = avg
                        elif unit.startswith("hour"):
                            duration_weeks = round(avg / 10.0, 1)
                    else:
                        dur = re.search(r"(\d+)\s*(Month|Week|Hour)s?", text, re.I)
                        if dur:
                            val = int(dur.group(1))
                            unit = dur.group(2).lower()
                            if unit.startswith("month"):
                                duration_weeks = val * 4.0
                            elif unit.startswith("week"):
                                duration_weeks = float(val)
                            elif unit.startswith("hour"):
                                duration_weeks = round(val / 10.0, 1)
                    # Refine course type from meta if present
                    if "Specialization" in text:
                        course_type = "Specialization"
                    elif "Professional Certificate" in text:
                        course_type = "Professional Certificate"
                    elif "Guided Project" in text:
                        course_type = "Guided Project"
                    break

            # ---- Image ----
            img_el = card.select_one("img")
            image_url = ""
            if img_el:
                image_url = img_el.get("src", "") or img_el.get("data-src", "")

            # ---- Skills (sometimes shown on card) ----
            skills: List[str] = []
            skills_el = card.select('[class*="skill"], [class*="Skill"]')
            for s in skills_el[:10]:
                t = s.get_text(strip=True)
                if t:
                    skills.append(t)

            # ---- Headline / Description from card text ----
            description = ""
            for p in card.select("p"):
                txt = p.get_text(" ", strip=True)
                if not txt or len(txt) < 20:
                    continue
                lower_txt = txt.lower()
                if institution and txt == institution:
                    continue
                if "review" in lower_txt and re.search(r"\d", txt):
                    continue
                if "·" in txt and any(
                    kw in txt
                    for kw in [
                        "Beginner",
                        "Intermediate",
                        "Advanced",
                        "Mixed",
                        "Course",
                        "Specialization",
                        "Professional",
                        "Month",
                        "Week",
                        "Hour",
                    ]
                ):
                    continue
                description = txt[:2000]
                break

            headline = ""
            if description:
                headline = re.split(r"(?<=[.!?])\s+", description, maxsplit=1)[0]
            if not headline:
                headline = title

            return Course(
                id=course_id,
                title=title,
                url=url,
                headline=headline[:240],
                description=description,
                rating=rating,
                num_reviews=num_reviews,
                institution=institution,
                image_url=image_url,
                duration_weeks=duration_weeks,
                level=level,
                is_free=is_free,
                course_type=course_type,
                skills=skills,
                category=category,
                source="coursera",
            )
        except Exception as e:
            logger.debug(f"Card parse error: {e}")
            return None

    # ---- pagination ---------------------------------------------------------

    def _get_total_pages(self, html: str) -> int:
        soup = BeautifulSoup(html, "html.parser")

        # Pagination buttons / links
        pag = soup.select_one(
            '[data-testid="pagination"], nav[aria-label*="aginat"], [class*="pagination"]'
        )
        if pag:
            nums = []
            for b in pag.select("a, button, li"):
                text = b.get_text(strip=True)
                if text.isdigit():
                    nums.append(int(text))
            if nums:
                return max(nums)

        # Result count text  (e.g., "10,000 results")
        res_el = soup.select_one(
            '[class*="result-count"], [class*="numberOfResults"], [data-testid="search-result-count"]'
        )
        if res_el:
            m = re.search(r"([\d,]+)\s*results?", res_el.get_text(), re.I)
            if m:
                total = int(m.group(1).replace(",", ""))
                return (total + DEFAULT_PAGE_SIZE - 1) // DEFAULT_PAGE_SIZE

        # __NEXT_DATA__
        nd = soup.find("script", id="__NEXT_DATA__")
        if nd and nd.string:
            try:
                j = json.loads(nd.string)

                def _find_pagination(obj):
                    if isinstance(obj, dict):
                        if "numPages" in obj or "num_pages" in obj:
                            return int(obj.get("numPages") or obj.get("num_pages"))
                        if "paging" in obj and isinstance(obj["paging"], dict):
                            total = obj["paging"].get("total", 0)
                            if total:
                                return (
                                    int(total) + DEFAULT_PAGE_SIZE - 1
                                ) // DEFAULT_PAGE_SIZE
                        if (
                            "count" in obj
                            and isinstance(obj["count"], int)
                            and obj["count"] > 0
                        ):
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
        Scrape courses from a Coursera category, yielding each course as found.
        """
        logger.info(
            f"Starting scrape for category: {category}"
            + (f"/{subcategory}" if subcategory else "")
        )

        page1_url = self._build_category_url(category, subcategory, page=1)

        html = self._navigate(page1_url)
        if not html:
            logger.error(f"Failed to load category page: {page1_url}")
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
            page_url = self._build_category_url(category, subcategory, page=page)
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
        """Navigate to a course page and enrich it with extra fields."""
        if not course.url:
            return course

        html = self._navigate(course.url)
        if not html:
            return course

        soup = BeautifulSoup(html, "html.parser")

        # Description
        desc = soup.select_one('[class*="description"], [data-testid="description"]')
        if desc:
            course.description = desc.get_text(strip=True)[:2000]

        # Objectives / What you'll learn
        obj_box = soup.select_one(
            '[class*="what-you-will-learn"], [data-testid="objectives"]'
        )
        if obj_box:
            course.objectives = [
                li.get_text(strip=True) for li in obj_box.select("li")[:10]
            ]

        # Prerequisites
        prereq_box = soup.select_one('[class*="prerequisite"], [class*="requirements"]')
        if prereq_box:
            course.prerequisites = [
                li.get_text(strip=True) for li in prereq_box.select("li")[:10]
            ]

        # Skills
        skills_box = soup.select_one(
            '[class*="skills-you-will-gain"], [data-testid="skills"]'
        )
        if skills_box:
            spans = skills_box.select("span, li, a")
            course.skills = [
                s.get_text(strip=True) for s in spans[:15] if s.get_text(strip=True)
            ]

        # Enrollment count
        enr = soup.select_one(
            '[class*="enrollment"], [class*="enrolled"], [data-testid="stats"]'
        )
        if enr:
            from .utils import parse_enrollment_count

            course.num_enrolled = parse_enrollment_count(enr.get_text(strip=True))

        # Language
        lang_el = soup.select_one('[class*="language"], [data-testid="language"]')
        if lang_el:
            course.language = lang_el.get_text(strip=True)

        # Subtitles
        sub_el = soup.select_one(
            '[class*="subtitle-language"], [data-testid="subtitles"]'
        )
        if sub_el:
            course.subtitles = [
                s.strip() for s in sub_el.get_text().split(",") if s.strip()
            ][:10]

        # Number of modules
        mod_el = soup.select_one('[class*="modules"], [class*="syllabus"]')
        if mod_el:
            modules = mod_el.select('[class*="module"], [class*="week"]')
            if modules:
                course.num_modules = len(modules)

        # Institution from detail page
        inst_el = soup.select_one(
            '[class*="partner-name"], [class*="offered-by"], [data-testid="partner"]'
        )
        if inst_el and not course.institution:
            course.institution = inst_el.get_text(strip=True)

        # Instructor from detail page
        instr_el = soup.select_one(
            '[class*="instructor-name"], [data-testid="instructor"]'
        )
        if instr_el and not course.instructor_name:
            course.instructor_name = instr_el.get_text(strip=True)

        return course

    def scrape_search_results(
        self,
        query: str,
        max_pages: int = 10,
    ) -> Generator[Course, None, None]:
        """Scrape courses from Coursera search results."""
        logger.info(f"Searching for: {query}")

        for page in range(1, max_pages + 1):
            url = self._build_search_url(query, page)
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
