"""
Coursera Course Scraper Package

A Selenium-based web scraper for extracting course data from Coursera.
Features:
- OOP design with modular components
- Selenium + undetected-chromedriver to bypass bot detection
- Proxy rotation for avoiding bans
- Multiple export formats (CSV, JSON, Excel)
- ML-ready data export with feature engineering
"""

from .scraper import CourseraScraper, Course
from shared.browser_factory import BrowserFactory
from .proxy_manager import ProxyManager, Proxy
from .exporter import DataExporter, StreamingCSVExporter
from .config import (
    CATEGORIES,
    DATA_SCIENCE_SUBCATEGORIES,
    COMPUTER_SCIENCE_SUBCATEGORIES,
)

__version__ = "1.0.0"
__all__ = [
    "CourseraScraper",
    "Course",
    "BrowserFactory",
    "ProxyManager",
    "Proxy",
    "DataExporter",
    "StreamingCSVExporter",
    "CATEGORIES",
    "DATA_SCIENCE_SUBCATEGORIES",
    "COMPUTER_SCIENCE_SUBCATEGORIES",
]
