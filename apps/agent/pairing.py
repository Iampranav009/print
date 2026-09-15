"""Parse a private one-time link and exchange it only with the trusted PrintBuddy host."""
import re
from urllib.parse import urlparse
import requests

TRUSTED_HOST = "print-kro-five.vercel.app"


def parse_link(link: str) -> tuple[str, str]:
    url = urlparse(link.strip())
    if (url.scheme != "https" or url.hostname != TRUSTED_HOST or url.port not in (None, 443)
            or url.username or url.password or url.path != "/agent/connect" or url.query
            or not re.fullmatch(r"[a-f0-9]{64}", url.fragment)):
        raise ValueError("Paste the complete connection link from your PrintBuddy dashboard.")
    return f"https://{TRUSTED_HOST}", url.fragment


def redeem_link(link: str) -> dict:
    origin, token = parse_link(link)
    response = requests.post(f"{origin}/api/agent/pair", json={"token": token}, timeout=20, allow_redirects=False)
    if response.status_code != 200:
        try:
            message = response.json().get("error", "Connection failed. Try a new link.")
        except ValueError:
            message = "Connection service is unavailable. Try again shortly."
        raise RuntimeError(message)
    data = response.json()
    if not data.get("agentToken") or not data.get("shopId"):
        raise RuntimeError("Incomplete connection response. Generate a new link.")
    return {"PRINTBUDDY_API_BASE": origin, "AGENT_TOKEN": data["agentToken"], "SHOP_ID": data["shopId"],
            "SHOP_NAME": data.get("shopName", "Your shop"), "PRINTBUDDY_PRINT_MODE": "real", "PRINTER_NAME": ""}
