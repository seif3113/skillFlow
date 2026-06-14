"""
Shared utilities package for the multi-platform course scraper.

Provides common components used by all platform scrapers:
- BrowserFactory: undetected-chromedriver management
- ProxyManager: proxy rotation and health checking
- StreamingCSVExporter: streaming CSV writer
- Utility functions: text cleaning, rate limiting, etc.
- Shared configuration constants
"""

from .proxy_manager import ProxyManager, NoProxyManager, Proxy
from .browser_factory import BrowserFactory
from .exporter import StreamingCSVExporter
from .config import (
    SELENIUM_TIMEOUT,
    PAGE_LOAD_TIMEOUT,
    IMPLICIT_WAIT,
    MAX_RETRIES,
    RETRY_DELAY,
    MIN_REQUEST_DELAY,
    MAX_REQUEST_DELAY,
    MIN_PAGES_PERCENTAGE,
    MAX_PAGES_LIMIT,
    CHROME_EXTRA_ARGS,
)
