"""Proxy management - delegates to shared module."""
from shared.proxy_manager import ProxyManager, NoProxyManager, Proxy

__all__ = ["ProxyManager", "NoProxyManager", "Proxy"]
