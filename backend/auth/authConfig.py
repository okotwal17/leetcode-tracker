"""Auth settings, read once at import time. Make sure that env vars are set"""

import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()


def _required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(
            f"{name} is not set. Copy it into backend/.env (local) or the "
            f"platform's environment variables (prod) before starting the API."
        )
    return value


# Identifies *our* app to Google. Public by design — it's also compiled into the frontend bundle. 
GOOGLE_CLIENT_ID = _required("GOOGLE_CLIENT_ID")

# Signs our own session tokens. The one true secret in this file.
JWT_SECRET = _required("JWT_SECRET")

# HS256 = one shared secret used to both sign and verify. That's the right fit
# here because the same server does both.
JWT_ALGORITHM = "HS256"

SESSION_TTL = timedelta(days=int(os.getenv("SESSION_TTL_DAYS", "7")))

# --- Session cookie ---
COOKIE_NAME = "session"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax").lower()
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN") or None

# Browsers silently *drop* a SameSite=None cookie that isn't also Secure, which
# presents as "login works locally, nobody can stay logged in after deploy" with
# no error anywhere. Catch the misconfiguration at boot instead.
if COOKIE_SAMESITE == "none" and not COOKIE_SECURE:
    raise RuntimeError(
        'COOKIE_SAMESITE="none" requires COOKIE_SECURE="true" — browsers reject '
        "the cookie otherwise and users will never stay logged in."
    )
