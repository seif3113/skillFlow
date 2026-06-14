"""
YouTube Course/Tutorial Scraper Package

Uses the YouTube Data API v3 to find educational playlists and long-form
tutorial videos, collecting rich metadata suitable for RAG pipelines.
"""

from .scraper import YouTubeScraper, Course
from .exporter import DataExporter, StreamingCSVExporter
from .config import CATEGORIES

__version__ = "1.0.0"
__all__ = [
    "YouTubeScraper",
    "Course",
    "DataExporter",
    "StreamingCSVExporter",
    "CATEGORIES",
]
