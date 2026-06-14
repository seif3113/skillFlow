"""
W3Schools Course Scraper Package

A Selenium-based web scraper for extracting course/tutorial data from W3Schools.
"""

from .scraper import W3SchoolsScraper, Course
from shared.browser_factory import BrowserFactory
from shared.proxy_manager import ProxyManager, Proxy
from .exporter import DataExporter, StreamingCSVExporter
from .config import CATEGORIES

__version__ = "1.0.0"
__all__ = [
    "W3SchoolsScraper",
    "Course",
    "BrowserFactory",
    "ProxyManager",
    "Proxy",
    "DataExporter",
    "StreamingCSVExporter",
    "CATEGORIES",
]
