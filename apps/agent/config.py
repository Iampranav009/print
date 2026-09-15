import os
import json
from pathlib import Path
from local_settings import CONFIG_DIR, load_settings

# The installer writes this once for the signed-in shop computer.
_saved = load_settings()
if _saved:
    for _key, _value in _saved.items():
        os.environ.setdefault(_key, str(_value))

try:
    from dotenv import load_dotenv
    env_dir = os.path.dirname(__file__)
    load_dotenv(os.path.join(env_dir, ".env.local"))
    load_dotenv(os.path.join(env_dir, ".env"))
except ImportError:
    pass

API_BASE = os.environ.get("PRINTBUDDY_API_BASE", os.environ.get("API_BASE", "http://localhost:3000")).rstrip("/")
SHOP_ID = os.environ.get("SHOP_ID", "00000000-0000-0000-0000-000000000001")
AGENT_TOKEN = os.environ.get("AGENT_TOKEN", "paste_token_from_seed_output_here")
PRINTER_NAME = os.environ.get("PRINTER_NAME", "HP_LaserJet")
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "3"))

# "simulate" | "virtual" | "real"
PRINT_MODE = os.environ.get("PRINTBUDDY_PRINT_MODE", os.environ.get("PRINT_MODE", "simulate"))

# Seconds to sleep in simulate mode before reporting printed
SIMULATE_PRINT_SECONDS = int(os.environ.get("SIMULATE_PRINT_SECONDS", "3"))

# Global forced-failure: "none" | "jam" | "out_of_paper" | "offline"
SIMULATE_FAIL = os.environ.get("SIMULATE_FAIL", "none")

# How often (in minutes) to re-run capability discovery in virtual/real mode
CAPABILITY_REFRESH_MINUTES = int(os.environ.get("CAPABILITY_REFRESH_MINUTES", "30"))

# Sound-box: local override for voice announcements.
# None  → use the remote shop setting (toggled from the dashboard).
# True  → always enabled regardless of dashboard toggle.
# False → always disabled regardless of dashboard toggle.
_sound_env = os.environ.get("AGENT_SOUND_ENABLED")
AGENT_SOUND_ENABLED: "bool | None" = (
    _sound_env.lower() in ("1", "true", "yes") if _sound_env is not None else None
)

