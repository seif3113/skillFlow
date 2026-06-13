"""
Khan Academy Course Scraper Package

A Selenium-based web scraper for extracting course data from Khan Academy.
"""

from .scraper import KhanAcademyScraper, Course
from shared.browser_factory import BrowserFactory
from shared.proxy_manager import ProxyManager, Proxy
from .exporter import DataExporter, StreamingCSVExporter
from .config import CATEGORIES

__version__ = "1.0.0"
__all__ = [
    "KhanAcademyScraper",
    "Course",
    "BrowserFactory",
    "ProxyManager",
    "Proxy",
    "DataExporter",
    "StreamingCSVExporter",
    "CATEGORIES",
]
