"""
YouTube educational content scraper using the YouTube Data API v3.

Searches for playlists and long-form tutorial videos, retrieves rich
metadata (descriptions, tags, playlist structure), and classifies content
type so a downstream RAG pipeline knows what kind of learning resource
each entry represents.

Content types produced:
    playlist     – A multi-video playlist (ordered curriculum)
    full_course  – A single video ≥ 60 min
    tutorial     – A single video ≥ 20 min
    lecture      – A single video ≥ 10 min
"""

import re
import time
import logging
from typing import List, Dict, Optional, Generator, Any
from dataclasses import dataclass, field, asdict
from datetime import datetime
from urllib.parse import quote_plus

import requests
from shared.utils import ensure_headline_description_fields

from .config import (
    API_KEY,
    API_BASE,
    MIN_TUTORIAL_DURATION,
    SEARCH_PAGE_SIZE,
    DEFAULT_MAX_PAGES,
    EDUCATIONAL_SUFFIXES,
    CATEGORIES,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# ISO 8601 duration parser  (PT1H30M15S → seconds)
# ---------------------------------------------------------------------------
_ISO_DUR = re.compile(
    r"P" r"(?:(\d+)D)?" r"(?:T" r"(?:(\d+)H)?" r"(?:(\d+)M)?" r"(?:(\d+)S)?" r")?"
)


def _parse_iso_duration(iso: str) -> int:
    """Return total seconds from an ISO 8601 duration like PT1H30M15S."""
    m = _ISO_DUR.match(iso or "")
    if not m:
        return 0
    days = int(m.group(1) or 0)
    hours = int(m.group(2) or 0)
    mins = int(m.group(3) or 0)
    secs = int(m.group(4) or 0)
    return days * 86400 + hours * 3600 + mins * 60 + secs


# ---------------------------------------------------------------------------
# Data class  (unified core + YouTube extras for RAG)
# ---------------------------------------------------------------------------


@dataclass
class Course:
    """Represents a YouTube educational video or playlist.

    The unified core fields match the other 4 scrapers so data can be
    merged.  YouTube-specific extras give the RAG pipeline richer context
    about content structure and quality.
    """

    # --- unified core (23 fields) ---
    id: int
    title: str
    url: str
    headline: str = ""
    description: str = ""
    rating: float = 0.0
    num_reviews: int = 0
    num_enrolled: int = 0  # view count
    price: str = "Free"
    is_free: bool = True
    instructor_name: str = ""  # channel name
    image_url: str = ""
    duration_hours: float = 0.0
    num_lessons: int = 0  # playlist item count or 1
    level: str = ""
    language: str = ""
    has_certificate: bool = False
    skills: List[str] = field(default_factory=list)  # tags
    category: str = ""
    subcategory: str = ""
    objectives: List[str] = field(default_factory=list)  # parsed from desc
    source: str = "youtube"
    scraped_at: str = field(default_factory=lambda: datetime.now().isoformat())

    # --- YouTube-specific extras ---
    video_id: str = ""
    channel_id: str = ""
    channel_name: str = ""
    published_at: str = ""
    view_count: int = 0
    like_count: int = 0
    comment_count: int = 0
    tags: List[str] = field(default_factory=list)
    content_type: str = ""  # playlist | full_course | tutorial | lecture
    playlist_id: str = ""
    playlist_item_count: int = 0
    duration_seconds: int = 0
    topics: List[str] = field(default_factory=list)  # ordered playlist item titles

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        for key in ("skills", "objectives", "tags", "topics"):
            if isinstance(data.get(key), list):
                data[key] = "|".join(data[key]) if data[key] else ""
        return ensure_headline_description_fields(data)


# ---------------------------------------------------------------------------
# Level inference
# ---------------------------------------------------------------------------
_LEVEL_PATTERNS = {
    "Beginner": re.compile(
        r"\b(beginner|beginners|intro|introduction|basics|getting started|"
        r"for beginners|learn .+ from scratch|zero to)\b",
        re.I,
    ),
    "Intermediate": re.compile(
        r"\b(intermediate|beyond basics|level up|next level)\b", re.I
    ),
    "Advanced": re.compile(
        r"\b(advanced|expert|mastery|deep dive|in[- ]depth|pro level)\b", re.I
    ),
}


def _infer_level(title: str, description: str) -> str:
    text = f"{title} {description[:500]}"
    for level, pat in _LEVEL_PATTERNS.items():
        if pat.search(text):
            return level
    return "All Levels"


# ---------------------------------------------------------------------------
# Objective extraction from description
# ---------------------------------------------------------------------------
_OBJ_HEADER = re.compile(
    r"(?:what you.?ll learn|you will learn|topics covered|"
    r"in this (?:course|tutorial|video)|curriculum|outline)"
    r"\s*[:\-—]?\s*",
    re.I,
)


def _extract_objectives(description: str) -> List[str]:
    """Pull bullet-style objectives from the description text."""
    m = _OBJ_HEADER.search(description)
    if not m:
        return []
    block = description[m.end() : m.end() + 2000]
    lines = block.splitlines()
    objectives: list[str] = []
    for line in lines:
        line = line.strip()
        if not line:
            if objectives:
                break
            continue
        cleaned = re.sub(r"^[\-\*•✅✔▶►\d\.\)]+\s*", "", line).strip()
        if cleaned and 5 < len(cleaned) < 200:
            objectives.append(cleaned)
        if len(objectives) >= 20:
            break
    return objectives


# ---------------------------------------------------------------------------
# Main scraper (API-based — no Selenium needed)
# ---------------------------------------------------------------------------


class YouTubeScraper:
    """YouTube Data API v3 scraper for educational playlists & tutorials.

    Parameters
    ----------
    api_key : str
        YouTube Data API v3 key.
    min_duration : int
        Minimum video duration in seconds to include (default 600 = 10 min).
    """

    def __init__(
        self,
        api_key: str = "",
        min_duration: int = MIN_TUTORIAL_DURATION,
    ):
        self.api_key = api_key or API_KEY
        if not self.api_key:
            raise ValueError(
                "YouTube API key required. Set YOUTUBE_API_KEY env var, "
                "pass --api-key, or edit youtube/config.py"
            )
        self.min_duration = min_duration
        self._courses_scraped = 0
        self._api_calls = 0

    # ---- low-level API helpers ---------------------------------------------

    def _api_get(self, endpoint: str, params: dict) -> Optional[dict]:
        """Make a GET request to the YouTube Data API."""
        params["key"] = self.api_key
        url = f"{API_BASE}/{endpoint}"
        try:
            resp = requests.get(url, params=params, timeout=30)
            self._api_calls += 1
            if resp.status_code == 403:
                error = resp.json().get("error", {})
                reason = ""
                for e in error.get("errors", []):
                    reason = e.get("reason", "")
                if reason == "quotaExceeded":
                    logger.error("YouTube API daily quota exceeded")
                    return None
                logger.error(f"API 403: {reason or resp.text[:200]}")
                return None
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as e:
            logger.error(f"API request failed: {e}")
            return None

    # ---- search -------------------------------------------------------------

    def _search(
        self,
        query: str,
        search_type: str = "video,playlist",
        max_pages: int = DEFAULT_MAX_PAGES,
        order: str = "relevance",
    ) -> List[dict]:
        """Run a paginated search and return raw result items."""
        items: list[dict] = []
        page_token = None

        for page in range(max_pages):
            params = {
                "part": "snippet",
                "q": query,
                "type": search_type,
                "maxResults": SEARCH_PAGE_SIZE,
                "relevanceLanguage": "en",
                "order": order,
                "safeSearch": "none",
            }
            if search_type == "video":
                params["videoDuration"] = "long"  # > 20 min
            if page_token:
                params["pageToken"] = page_token

            data = self._api_get("search", params)
            if not data:
                break

            items.extend(data.get("items", []))
            page_token = data.get("nextPageToken")
            if not page_token:
                break

            time.sleep(0.2)  # be polite

        return items

    # ---- detail enrichment --------------------------------------------------

    def _get_video_details(self, video_ids: List[str]) -> Dict[str, dict]:
        """Fetch full details for a batch of video IDs (max 50 per call)."""
        result: dict[str, dict] = {}
        for i in range(0, len(video_ids), 50):
            batch = video_ids[i : i + 50]
            data = self._api_get(
                "videos",
                {
                    "part": "snippet,contentDetails,statistics",
                    "id": ",".join(batch),
                },
            )
            if not data:
                continue
            for item in data.get("items", []):
                result[item["id"]] = item
        return result

    def _get_playlist_details(self, playlist_ids: List[str]) -> Dict[str, dict]:
        """Fetch playlist metadata for a batch of IDs."""
        result: dict[str, dict] = {}
        for i in range(0, len(playlist_ids), 50):
            batch = playlist_ids[i : i + 50]
            data = self._api_get(
                "playlists",
                {
                    "part": "snippet,contentDetails",
                    "id": ",".join(batch),
                },
            )
            if not data:
                continue
            for item in data.get("items", []):
                result[item["id"]] = item
        return result

    def _get_playlist_items(self, playlist_id: str, max_items: int = 100) -> List[str]:
        """Return ordered list of video titles in a playlist."""
        titles: list[str] = []
        page_token = None

        while len(titles) < max_items:
            params = {
                "part": "snippet",
                "playlistId": playlist_id,
                "maxResults": 50,
            }
            if page_token:
                params["pageToken"] = page_token

            data = self._api_get("playlistItems", params)
            if not data:
                break

            for item in data.get("items", []):
                t = item.get("snippet", {}).get("title", "")
                if t and t not in ("Private video", "Deleted video"):
                    titles.append(t)

            page_token = data.get("nextPageToken")
            if not page_token:
                break

        return titles

    # ---- course building ----------------------------------------------------

    def _video_to_course(self, detail: dict, category: str = "") -> Optional[Course]:
        """Convert a videos.list API response item into a Course."""
        snippet = detail.get("snippet", {})
        stats = detail.get("statistics", {})
        content = detail.get("contentDetails", {})

        duration_s = _parse_iso_duration(content.get("duration", ""))
        if duration_s < self.min_duration:
            return None

        title = snippet.get("title", "")
        description = snippet.get("description", "")
        video_id = detail.get("id", "")
        url = f"https://www.youtube.com/watch?v={video_id}"

        view_count = int(stats.get("viewCount", 0) or 0)
        like_count = int(stats.get("likeCount", 0) or 0)
        comment_count = int(stats.get("commentCount", 0) or 0)

        # Approximate rating from like ratio (0-5 scale)
        rating = 0.0
        dislike_est = max(0, (view_count * 0.04) - like_count)
        total = like_count + dislike_est
        if total > 0:
            rating = round((like_count / total) * 5, 1)

        tags = snippet.get("tags", []) or []
        thumbs = snippet.get("thumbnails", {})
        image = (
            thumbs.get("maxres", {}).get("url")
            or thumbs.get("high", {}).get("url")
            or thumbs.get("medium", {}).get("url", "")
        )

        if duration_s >= 3600:
            content_type = "full_course"
        elif duration_s >= 1200:
            content_type = "tutorial"
        else:
            content_type = "lecture"

        return Course(
            id=abs(hash(url)) % 10_000_000,
            title=title,
            url=url,
            headline=snippet.get("channelTitle", ""),
            description=description[:3000],
            rating=rating,
            num_reviews=comment_count,
            num_enrolled=view_count,
            instructor_name=snippet.get("channelTitle", ""),
            image_url=image,
            duration_hours=round(duration_s / 3600, 2),
            num_lessons=1,
            level=_infer_level(title, description),
            language=snippet.get("defaultAudioLanguage", "en"),
            skills=tags[:30],
            category=category,
            objectives=_extract_objectives(description),
            video_id=video_id,
            channel_id=snippet.get("channelId", ""),
            channel_name=snippet.get("channelTitle", ""),
            published_at=snippet.get("publishedAt", ""),
            view_count=view_count,
            like_count=like_count,
            comment_count=comment_count,
            tags=tags,
            content_type=content_type,
            duration_seconds=duration_s,
        )

    def _playlist_to_course(self, detail: dict, category: str = "") -> Optional[Course]:
        """Convert a playlists.list API response item into a Course."""
        snippet = detail.get("snippet", {})
        content = detail.get("contentDetails", {})

        title = snippet.get("title", "")
        description = snippet.get("description", "")
        playlist_id = detail.get("id", "")
        url = f"https://www.youtube.com/playlist?list={playlist_id}"
        item_count = int(content.get("itemCount", 0) or 0)

        if item_count < 2:
            return None

        thumbs = snippet.get("thumbnails", {})
        image = (
            thumbs.get("maxres", {}).get("url")
            or thumbs.get("high", {}).get("url")
            or thumbs.get("medium", {}).get("url", "")
        )

        # Fetch the ordered curriculum (video titles)
        topic_titles = self._get_playlist_items(playlist_id, max_items=100)

        return Course(
            id=abs(hash(url)) % 10_000_000,
            title=title,
            url=url,
            headline=snippet.get("channelTitle", ""),
            description=description[:3000],
            instructor_name=snippet.get("channelTitle", ""),
            image_url=image,
            num_lessons=item_count,
            level=_infer_level(title, description),
            language=snippet.get("defaultLanguage", "en"),
            skills=_extract_objectives(description) or [],
            category=category,
            objectives=_extract_objectives(description),
            video_id="",
            channel_id=snippet.get("channelId", ""),
            channel_name=snippet.get("channelTitle", ""),
            published_at=snippet.get("publishedAt", ""),
            content_type="playlist",
            playlist_id=playlist_id,
            playlist_item_count=item_count,
            topics=topic_titles,
        )

    # ---- public API ---------------------------------------------------------

    def search_courses(
        self,
        query: str,
        max_pages: int = DEFAULT_MAX_PAGES,
        include_playlists: bool = True,
        include_videos: bool = True,
        order: str = "relevance",
    ) -> Generator[Course, None, None]:
        """Search YouTube for educational content matching *query*.

        Searches multiple times with educational suffixes to bias results
        toward tutorials and courses rather than entertainment.

        Parameters
        ----------
        query : str
            Search terms (e.g. "python", "data science").
        max_pages : int
            Max pages of search results per suffix (each page = 50 results).
        include_playlists : bool
            Search for playlists (highly valuable for RAG — ordered curriculum).
        include_videos : bool
            Search for long-form individual videos.
        """
        seen_ids: set[str] = set()

        # Build search queries: original + with educational suffixes
        queries = [query]
        for suffix in EDUCATIONAL_SUFFIXES:
            combined = f"{query} {suffix}"
            if combined not in queries:
                queries.append(combined)

        for q in queries:
            # --- Playlists ---
            if include_playlists:
                raw_items = self._search(
                    q,
                    search_type="playlist",
                    max_pages=max_pages,
                    order=order,
                )
                playlist_ids = []
                for item in raw_items:
                    pid = item.get("id", {}).get("playlistId", "")
                    if pid and pid not in seen_ids:
                        playlist_ids.append(pid)
                        seen_ids.add(pid)

                if playlist_ids:
                    details = self._get_playlist_details(playlist_ids)
                    for pid in playlist_ids:
                        if pid in details:
                            course = self._playlist_to_course(
                                details[pid], category=query
                            )
                            if course:
                                self._courses_scraped += 1
                                yield course

            # --- Videos ---
            if include_videos:
                raw_items = self._search(
                    q,
                    search_type="video",
                    max_pages=max_pages,
                    order=order,
                )
                video_ids = []
                for item in raw_items:
                    vid = item.get("id", {}).get("videoId", "")
                    if vid and vid not in seen_ids:
                        video_ids.append(vid)
                        seen_ids.add(vid)

                if video_ids:
                    details = self._get_video_details(video_ids)
                    for vid in video_ids:
                        if vid in details:
                            course = self._video_to_course(details[vid], category=query)
                            if course:
                                self._courses_scraped += 1
                                yield course

        logger.info(
            f"Search '{query}': {self._courses_scraped} courses yielded "
            f"({self._api_calls} API calls)"
        )

    def scrape_category(
        self,
        category: str,
        max_pages: Optional[int] = None,
        include_playlists: bool = True,
        include_videos: bool = True,
        order: str = "relevance",
    ) -> Generator[Course, None, None]:
        """Scrape a pre-defined category (maps to a search query)."""
        display_name = CATEGORIES.get(category, category.replace("-", " ").title())
        logger.info(f"Scraping YouTube category: {display_name}")
        yield from self.search_courses(
            display_name,
            max_pages=max_pages or DEFAULT_MAX_PAGES,
            include_playlists=include_playlists,
            include_videos=include_videos,
            order=order,
        )

    def scrape_all_categories(self) -> Generator[Course, None, None]:
        """Scrape all configured YouTube categories."""
        for slug in CATEGORIES:
            yield from self.scrape_category(slug)

    def close(self) -> None:
        """No-op — included for interface compatibility with Selenium scrapers."""
        pass

    @property
    def stats(self) -> Dict[str, int]:
        return {
            "courses_scraped": self._courses_scraped,
            "api_calls": self._api_calls,
        }
