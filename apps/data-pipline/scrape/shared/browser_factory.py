"""
Browser / driver factory — shared across all platform scrapers.

In Docker (detected via AIRFLOW_HOME env var):
  - Uses standard Selenium + system Chromium + Xvfb virtual display.
  - This avoids undetected-chromedriver issues in containers and
    works around sites that detect headless mode by using a virtual
    framebuffer (Xvfb) so Chromium runs in "headed" mode.

Locally:
  - Uses undetected-chromedriver as before.
"""

import os
import re
import subprocess
import platform
import logging
import threading
from typing import Optional

from .proxy_manager import Proxy
from .config import PAGE_LOAD_TIMEOUT, IMPLICIT_WAIT, CHROME_EXTRA_ARGS

logger = logging.getLogger(__name__)

# Global lock to prevent concurrent chromedriver patching (race condition)
_driver_lock = threading.Lock()

# Detect if we are running inside the Airflow Docker container
_IN_DOCKER = bool(os.environ.get("AIRFLOW_HOME"))

# Virtual display singleton (only started once per process in Docker)
_vdisplay = None


def _ensure_virtual_display():
    """Start an Xvfb virtual display if running in Docker and not already started."""
    global _vdisplay
    if not _IN_DOCKER or _vdisplay is not None:
        return
    try:
        from pyvirtualdisplay import Display
        _vdisplay = Display(visible=False, size=(1920, 1080))
        _vdisplay.start()
        logger.info("Xvfb virtual display started (1920x1080)")
    except Exception as exc:
        logger.warning(f"Could not start Xvfb virtual display: {exc}")


class BrowserFactory:
    """Creates Chrome/Chromium drivers — auto-detects Docker vs local."""

    _detected_version: Optional[int] = None

    @classmethod
    def _detect_chrome_version(cls) -> Optional[int]:
        if cls._detected_version is not None:
            return cls._detected_version

        version_str = None
        try:
            if platform.system() == "Windows":
                result = subprocess.run(
                    [
                        "reg",
                        "query",
                        r"HKEY_CURRENT_USER\Software\Google\Chrome\BLBeacon",
                        "/v",
                        "version",
                    ],
                    capture_output=True,
                    text=True,
                    timeout=5,
                )
                if result.returncode == 0:
                    match = re.search(r"(\d+)\.\d+\.\d+\.\d+", result.stdout)
                    if match:
                        version_str = match.group(1)
            else:
                for cmd in [
                    "google-chrome --version",
                    "chromium --version",
                    "chromium-browser --version",
                ]:
                    try:
                        result = subprocess.run(
                            cmd.split(),
                            capture_output=True,
                            text=True,
                            timeout=5,
                        )
                        if result.returncode == 0:
                            match = re.search(r"(\d+)\.\d+", result.stdout)
                            if match:
                                version_str = match.group(1)
                                break
                    except FileNotFoundError:
                        continue
        except Exception as exc:
            logger.debug(f"Chrome version detection failed: {exc}")

        if version_str:
            cls._detected_version = int(version_str)
            logger.info(f"Detected Chrome version: {cls._detected_version}")
        else:
            logger.warning("Could not detect Chrome version — using auto-detect")
        return cls._detected_version

    @classmethod
    def _create_docker_driver(cls, proxy=None, headless=True):
        """Create a standard Selenium ChromeDriver for running inside Docker.

        Uses Xvfb virtual display so the browser runs in headed mode
        (avoiding headless detection by sites like Udemy) while still
        having no physical screen.
        """
        _ensure_virtual_display()

        from selenium import webdriver
        from selenium.webdriver.chrome.service import Service
        from selenium.webdriver.chrome.options import Options

        options = Options()

        # Core Docker-required flags
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--disable-extensions")
        options.add_argument("--disable-software-rasterizer")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--lang=en-US,en")

        # Anti-bot evasion flags (work with standard Selenium too)
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)

        # Standard Chrome flags from shared config (skip ones already set above)
        _already_set = {
            "--disable-blink-features=AutomationControlled",
            "--disable-gpu",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--window-size=1920,1080",
        }
        for arg in CHROME_EXTRA_ARGS:
            if arg not in _already_set:
                options.add_argument(arg)

        if proxy:
            proxy_str = f"{proxy.ip}:{proxy.port}"
            options.add_argument(
                f"--proxy-server={proxy.protocol}://{proxy_str}"
            )
            logger.info(f"Using proxy: {proxy_str}")

        # Use system-installed chromium and chromedriver
        chrome_bin = os.environ.get("CHROME_BIN", "/usr/bin/chromium")
        chromedriver_path = os.environ.get(
            "CHROMEDRIVER_PATH", "/usr/bin/chromedriver"
        )
        options.binary_location = chrome_bin

        service = Service(executable_path=chromedriver_path)

        with _driver_lock:
            driver = webdriver.Chrome(service=service, options=options)

        # Remove webdriver flag from navigator
        driver.execute_cdp_cmd(
            "Page.addScriptToEvaluateOnNewDocument",
            {
                "source": """
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
                """
            },
        )

        driver.set_page_load_timeout(PAGE_LOAD_TIMEOUT)
        driver.implicitly_wait(IMPLICIT_WAIT)

        return driver

    @classmethod
    def _create_local_driver(cls, proxy=None, headless=True):
        """Create an undetected-chromedriver for local (non-Docker) runs."""
        import undetected_chromedriver as uc

        options = uc.ChromeOptions()

        for arg in CHROME_EXTRA_ARGS:
            options.add_argument(arg)

        if proxy:
            proxy_str = f"{proxy.ip}:{proxy.port}"
            options.add_argument(
                f"--proxy-server={proxy.protocol}://{proxy_str}"
            )
            logger.info(f"Using proxy: {proxy_str}")

        options.add_argument("--disable-extensions")
        options.add_argument("--disable-gpu")
        options.add_argument("--lang=en-US,en")

        ver = cls._detect_chrome_version()
        with _driver_lock:
            driver = uc.Chrome(
                options=options, version_main=ver, headless=headless
            )
        driver.set_page_load_timeout(PAGE_LOAD_TIMEOUT)
        driver.implicitly_wait(IMPLICIT_WAIT)

        return driver

    @classmethod
    def create_driver(cls, proxy=None, headless=True):
        """Create a Chrome driver — picks the right strategy automatically.

        In Docker: standard Selenium + Xvfb (avoids headless detection).
        Locally:   undetected-chromedriver.
        """
        if _IN_DOCKER:
            logger.info("Docker environment detected — using Selenium + Xvfb")
            return cls._create_docker_driver(proxy=proxy, headless=headless)
        else:
            return cls._create_local_driver(proxy=proxy, headless=headless)
