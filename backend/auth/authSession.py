"""How a session token travels between browser and server."""

from fastapi import Request, Response

from auth.authConfig import (
    COOKIE_DOMAIN,
    COOKIE_NAME,
    COOKIE_SAMESITE,
    COOKIE_SECURE,
    SESSION_TTL,
)


def set_session_cookie(response: Response, token: str) -> None:
    """Attach the session cookie to an outgoing response."""
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        domain=COOKIE_DOMAIN,
        max_age=int(SESSION_TTL.total_seconds()),
        path="/",
    )


def read_session_cookie(request: Request) -> str | None:
    """Pull the raw token out of an incoming request, if present."""
    return request.cookies.get(COOKIE_NAME)


def clear_session_cookie(response: Response) -> None:
    """Tell the browser to drop the cookie (logout). """
    response.delete_cookie(
        key=COOKIE_NAME,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        domain=COOKIE_DOMAIN,
        path="/",
    )
