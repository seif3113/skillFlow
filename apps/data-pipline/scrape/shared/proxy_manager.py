"""
Proxy Manager module for handling proxy rotation and management.
Shared across all platform scrapers.
"""

import random
import requests
import logging
from typing import List, Dict, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import threading

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class Proxy:
    """Represents a proxy server."""

    ip: str
    port: str
    protocol: str = "http"
    username: Optional[str] = None
    password: Optional[str] = None
    country: Optional[str] = None
    last_used: Optional[datetime] = None
    fail_count: int = 0
    is_working: bool = True

    @property
    def url(self) -> str:
        if self.username and self.password:
            return f"{self.protocol}://{self.username}:{self.password}@{self.ip}:{self.port}"
        return f"{self.protocol}://{self.ip}:{self.port}"

    @property
    def dict_format(self) -> Dict[str, str]:
        return {"http": self.url, "https": self.url}

    def __str__(self) -> str:
        return f"{self.ip}:{self.port}"


class ProxyManager:
    """Manages a pool of proxies with rotation, health checking, and blacklisting."""

    MAX_FAIL_COUNT = 3
    COOLDOWN_PERIOD = 300  # 5 minutes cooldown for failed proxies

    def __init__(self, proxy_file: Optional[str] = None, use_free_proxies: bool = True):
        self._proxies: List[Proxy] = []
        self._blacklist: Dict[str, datetime] = {}
        self._lock = threading.Lock()
        self._current_index = 0

        if proxy_file:
            self._load_proxies_from_file(proxy_file)
        if use_free_proxies:
            self._fetch_free_proxies()

        logger.info(f"Proxy manager initialized with {len(self._proxies)} proxies")

    def _load_proxies_from_file(self, filepath: str) -> None:
        try:
            with open(filepath, "r") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    parts = line.split(":")
                    if len(parts) >= 2:
                        proxy = Proxy(
                            ip=parts[0],
                            port=parts[1],
                            username=parts[2] if len(parts) > 2 else None,
                            password=parts[3] if len(parts) > 3 else None,
                        )
                        self._proxies.append(proxy)
            logger.info(f"Loaded {len(self._proxies)} proxies from file")
        except FileNotFoundError:
            logger.warning(f"Proxy file not found: {filepath}")
        except Exception as e:
            logger.error(f"Error loading proxies from file: {e}")

    def _fetch_free_proxies(self) -> None:
        sources = [
            self._fetch_from_free_proxy_list,
            self._fetch_from_proxy_scrape,
            self._fetch_from_geonode,
        ]
        for source in sources:
            try:
                source()
            except Exception as e:
                logger.warning(f"Failed to fetch proxies from source: {e}")

    def _fetch_from_free_proxy_list(self) -> None:
        try:
            url = "https://free-proxy-list.net/"
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                from bs4 import BeautifulSoup

                soup = BeautifulSoup(response.text, "html.parser")
                table = soup.find("table", class_="table-striped")
                if table:
                    rows = table.find_all("tr")[1:]
                    for row in rows[:50]:
                        cols = row.find_all("td")
                        if len(cols) >= 7:
                            proxy = Proxy(
                                ip=cols[0].text.strip(),
                                port=cols[1].text.strip(),
                                protocol=(
                                    "https"
                                    if cols[6].text.strip().lower() == "yes"
                                    else "http"
                                ),
                                country=cols[3].text.strip(),
                            )
                            self._proxies.append(proxy)
                logger.info("Fetched proxies from free-proxy-list.net")
        except Exception as e:
            logger.warning(f"Error fetching from free-proxy-list: {e}")

    def _fetch_from_proxy_scrape(self) -> None:
        try:
            url = "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all"
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                for line in response.text.strip().split("\n")[:50]:
                    line = line.strip()
                    if ":" in line:
                        parts = line.split(":")
                        self._proxies.append(Proxy(ip=parts[0], port=parts[1]))
                logger.info("Fetched proxies from proxyscrape.com")
        except Exception as e:
            logger.warning(f"Error fetching from proxyscrape: {e}")

    def _fetch_from_geonode(self) -> None:
        try:
            url = "https://proxylist.geonode.com/api/proxy-list?limit=50&page=1&sort_by=lastChecked&sort_type=desc"
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                for item in data.get("data", []):
                    proxy = Proxy(
                        ip=item.get("ip", ""),
                        port=str(item.get("port", "")),
                        protocol=item.get("protocols", ["http"])[0],
                        country=item.get("country", ""),
                    )
                    if proxy.ip and proxy.port:
                        self._proxies.append(proxy)
                logger.info("Fetched proxies from geonode.com")
        except Exception as e:
            logger.warning(f"Error fetching from geonode: {e}")

    def get_proxy(self) -> Optional[Proxy]:
        with self._lock:
            self._cleanup_blacklist()
            available = [
                p
                for p in self._proxies
                if p.is_working and str(p) not in self._blacklist
            ]
            if not available:
                logger.warning("No available proxies")
                return None
            self._current_index = (self._current_index + 1) % len(available)
            proxy = available[self._current_index]
            proxy.last_used = datetime.now()
            return proxy

    def get_random_proxy(self) -> Optional[Proxy]:
        with self._lock:
            self._cleanup_blacklist()
            available = [
                p
                for p in self._proxies
                if p.is_working and str(p) not in self._blacklist
            ]
            if not available:
                return None
            proxy = random.choice(available)
            proxy.last_used = datetime.now()
            return proxy

    def report_failure(self, proxy: Proxy) -> None:
        with self._lock:
            proxy.fail_count += 1
            if proxy.fail_count >= self.MAX_FAIL_COUNT:
                proxy.is_working = False
                self._blacklist[str(proxy)] = datetime.now()
                logger.warning(
                    f"Proxy {proxy} blacklisted after {proxy.fail_count} failures"
                )

    def report_success(self, proxy: Proxy) -> None:
        with self._lock:
            proxy.fail_count = 0
            proxy.is_working = True
            if str(proxy) in self._blacklist:
                del self._blacklist[str(proxy)]

    def _cleanup_blacklist(self) -> None:
        cutoff = datetime.now() - timedelta(seconds=self.COOLDOWN_PERIOD)
        expired = [p for p, t in self._blacklist.items() if t < cutoff]
        for proxy_str in expired:
            del self._blacklist[proxy_str]
            for proxy in self._proxies:
                if str(proxy) == proxy_str:
                    proxy.is_working = True
                    proxy.fail_count = 0
                    break

    def add_proxy(
        self,
        ip: str,
        port: str,
        protocol: str = "http",
        username: Optional[str] = None,
        password: Optional[str] = None,
    ) -> None:
        with self._lock:
            proxy = Proxy(
                ip=ip,
                port=port,
                protocol=protocol,
                username=username,
                password=password,
            )
            self._proxies.append(proxy)

    def test_proxy(
        self, proxy: Proxy, test_url: str = "https://httpbin.org/ip", timeout: int = 10
    ) -> bool:
        try:
            response = requests.get(
                test_url, proxies=proxy.dict_format, timeout=timeout
            )
            return response.status_code == 200
        except Exception:
            return False

    @property
    def available_count(self) -> int:
        with self._lock:
            self._cleanup_blacklist()
            return len(
                [
                    p
                    for p in self._proxies
                    if p.is_working and str(p) not in self._blacklist
                ]
            )

    @property
    def total_count(self) -> int:
        return len(self._proxies)

    def __len__(self) -> int:
        return self.available_count


class NoProxyManager:
    """Fallback manager that doesn't use proxies."""

    def get_proxy(self) -> None:
        return None

    def get_random_proxy(self) -> None:
        return None

    def report_failure(self, proxy) -> None:
        pass

    def report_success(self, proxy) -> None:
        pass

    @property
    def available_count(self) -> int:
        return 0

    @property
    def total_count(self) -> int:
        return 0
