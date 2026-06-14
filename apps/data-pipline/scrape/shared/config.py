"""
Shared configuration constants for all platform scrapers.
Platform-specific configs import from here and extend with their own values.
"""

# Selenium settings
SELENIUM_TIMEOUT = 20  # WebDriverWait timeout in seconds
PAGE_LOAD_TIMEOUT = 40  # Full page load timeout
IMPLICIT_WAIT = 10  # Implicit wait for element searches

# Retry settings
MAX_RETRIES = 3
RETRY_DELAY = 5

# Rate limiting — random delay between page loads
MIN_REQUEST_DELAY = 3
MAX_REQUEST_DELAY = 7

# Pagination
MIN_PAGES_PERCENTAGE = 0.5  # Get at least 50% of pages
MAX_PAGES_LIMIT = 30  # Global max pages limit for all scrapers

# Extra Chrome arguments (on top of undetected-chromedriver defaults)
CHROME_EXTRA_ARGS = [
    "--disable-blink-features=AutomationControlled",
    "--disable-infobars",
    "--disable-popup-blocking",
    "--no-first-run",
    "--no-service-autorun",
    "--password-store=basic",
    # Docker / headless essentials
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--window-size=1920,1080",
]
