"""Rate limiting: who a request counts against, and what a rejection looks like.

Every counter here is one bucket, identified by a pair:

    (who the request is, what scope it counts against)

`rate_limit_key` answers the first half. The second is `GLOBAL_SCOPE` for the
app-wide budget, or the route's own name for a decorated route. Everything else
in this file is a consequence of that pair.

Two mechanisms, and which one a route gets is a deliberate choice:

  * `GlobalRateLimitMiddleware` applies `GLOBAL_LIMITS` to every route, under one
    shared scope. It runs before routing, so a rejected request never reaches
    `current_user` and never touches Mongo. This is the real shield.

  * `@limiter.limit(...)` gives one route a tighter limit under its own scope,
    but it wraps the endpoint function, so FastAPI has already resolved
    dependencies by the time it fires. Worse, slowapi drops a decorated route
    from its own middleware's default sweep entirely (`override_defaults=False`
    and `application_limits` do NOT change this), so under stock slowapi
    decorating trades the early shield for granularity.

That trade is only worth it on a route with no expensive dependencies. Today
that is exactly `POST /auth/google`: it takes no `Depends`, so a 429 there still
skips the Google cert fetch and the Mongo upsert in the body. Every `/problems`
route depends on `current_user`, so they stay undecorated and are covered by the
middleware instead.
"""

import logging
import os

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from limits import parse_many
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from auth.authMethods import decode_session_token
from auth.authSession import read_session_cookie

logger = logging.getLogger(__name__)


def rate_limit_key(request: Request) -> str:
    """Bucket by user when the request carries a valid session, else by IP.

    IP alone is the wrong key for logged-in traffic — a whole campus behind one
    NAT would share a bucket — and there is no user id before login, so we use
    whichever identity the request actually has.
    """
    token = read_session_cookie(request)
    if token:
        try:
            return f"user:{decode_session_token(token)}"
        except HTTPException:
            pass  # expired or forged -> falls through to the IP bucket
    return f"ip:{get_remote_address(request)}"


def _limits(env_var: str, default: str) -> str:
    """Read a limit string like "60/minute; 1000/hour" from the environment.

    Parsed here purely to validate it: a typo in the env var should fail loudly
    at boot, the way authConfig does, rather than on the first request that
    happens to hit a limit.
    """
    value = os.getenv(env_var, default)
    try:
        parse_many(value)
    except ValueError as exc:
        raise RuntimeError(
            f"{env_var} is not a valid limit string: {value!r}. "
            'Expected something like "60/minute; 1000/hour".'
        ) from exc
    return value


# Two windows per limit: the short one absorbs a burst (the UI re-fetches every
# list after each mutation, so a normal session is spiky), the long one is what
# actually stops a grinder.
GLOBAL_LIMITS = _limits("RATE_LIMIT_GLOBAL", "60/minute; 1000/hour")
LOGIN_LIMITS = _limits("RATE_LIMIT_LOGIN", "10/minute; 50/hour")

# Parsed once at import: "60/minute" -> a RateLimitItem the strategy can count.
GLOBAL_LIMIT_ITEMS = parse_many(GLOBAL_LIMITS)

GLOBAL_SCOPE = "global"

limiter = Limiter(
    key_func=rate_limit_key,
    default_limits=[],
    storage_uri=os.getenv("RATE_LIMIT_STORAGE_URI", "memory://"),
    enabled=os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true",
    swallow_errors=True,
)


class GlobalRateLimitMiddleware(BaseHTTPMiddleware):
    """Applies GLOBAL_LIMITS to every request, before routing.

    This replaces slowapi's own SlowAPIMiddleware, which is a silent no-op on
    FastAPI >= 0.139. SlowAPIMiddleware finds the endpoint by scanning
    app.routes for an object with an `.endpoint` attribute; FastAPI now keeps
    routers registered through include_router() as opaque _IncludedRouter
    objects, so the scan comes up empty, every request is treated as exempt,
    and nothing is ever limited. Silently. Both our routers are included that
    way, so stock slowapi would protect exactly nothing.

    We never needed the endpoint: the global limits are identical for every
    route, so this skips route discovery and counts them directly against
    GLOBAL_SCOPE, using the same storage and strategy the decorators use.

    Unlike slowapi, this does *not* exempt routes that carry their own
    @limiter.limit decorator — they're checked here too, and then again by the
    decorator. That's deliberate: slowapi's exemption is what would otherwise
    let a decorated route be hammered without any pre-routing check at all.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        limiter_ = request.app.state.limiter
        #Not enabled --> send request through
        if not limiter_.enabled:
            return await call_next(request)
        key = rate_limit_key(request)
        for item in GLOBAL_LIMIT_ITEMS:
            try:
                allowed = limiter_.limiter.hit(item, key, GLOBAL_SCOPE)
            except Exception:
                logger.warning("Rate limit storage unavailable, allowing request", exc_info=True)
                continue

            if not allowed:
                logger.warning("Global rate limit %s exceeded by %s", item, key)
                return rate_limit_response(item.get_expiry())

        return await call_next(request)


def rate_limit_response(retry_after: int) -> JSONResponse:
    """429 in the same shape as every other error this API returns.

    slowapi's built-in handler emits {"error": ...}; everything else here (and
    the frontend's fetch wrapper) speaks FastAPI's {"detail": ...}.

    Note that retry_after is the *window length*, not the time left in the
    current window — so it over-states the wait rather than under-stating it.
    """
    return JSONResponse(
        status_code=429,
        content={
            "detail": "You're doing that too fast. "
            f"Try again in {retry_after} second{'' if retry_after == 1 else 's'}."
        },
        headers={"Retry-After": str(retry_after)},
    )


def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """The same 429, for the decorator path — registered on the app in main.py."""
    try:
        retry_after = exc.limit.limit.get_expiry()
    except AttributeError:  # slowapi internals moved — a plain 429 still beats a 500
        retry_after = 60
    return rate_limit_response(retry_after)
