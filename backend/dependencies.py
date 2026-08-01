from datetime import date, datetime
from zoneinfo import ZoneInfo

from bson import ObjectId
from fastapi import Header, HTTPException, Request, status

from auth.authMethods import decode_session_token
from auth.authSession import read_session_cookie
from database import users


async def current_user(request: Request) -> dict:
    """Resolve the logged-in user from the session cookie, or 401."""
    token = read_session_cookie(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )

    user_id = valid_id(decode_session_token(token))

    # Re-read the user every request so a deleted account stops working immediately
    # rather than lingering until the token expires. Costs one indexed _id lookup.
    user = await users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session is no longer valid. Please sign in again.",
        )
    return user


def client_today(x_timezone: str | None = Header(default=None)) -> date:
    """Today's date where the caller is standing; server-local if it won't say."""
    # An unknown or malformed zone is not worth a 400: the caller still gets a
    # coherent day, just the server's, which is exactly the old behaviour.
    if x_timezone:
        try:
            return datetime.now(ZoneInfo(x_timezone)).date()
        except (KeyError, ValueError):
            pass
    return date.today()


def valid_id(id: str) -> str:
    """Reject malformed ids at the HTTP edge, so the methods layer can trust them.
    A garbage id is a bad request (422), not a missing resource (404).
    """
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=422, detail="Invalid id")
    return id


def valid_cursor(cursor: str | None = None) -> str | None:
    """Validate the optional keyset cursor at the HTTP edge."""
    if cursor is not None and not ObjectId.is_valid(cursor):
        raise HTTPException(status_code=422, detail="Invalid cursor")
    return cursor
