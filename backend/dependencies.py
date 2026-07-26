from bson import ObjectId
from fastapi import HTTPException, Request, status

from auth.authMethods import decode_session_token, get_user_by_id
from auth.authSession import read_session_cookie


async def current_user(request: Request) -> dict:
    """Resolve the logged-in user from the session cookie, or 401."""
    token = read_session_cookie(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )

    user_id = decode_session_token(token)

    # Re-read the user every request so a deleted account stops working immediately
    # rather than lingering until the token expires. Costs one indexed _id lookup.
    user = await get_user_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session is no longer valid. Please sign in again.",
        )
    return user


def valid_id(id: str) -> str:
    """Reject malformed ids at the HTTP edge, so the methods layer can trust them.
    A garbage id is a bad request (422), not a missing resource (404).
    """
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=422, detail="Invalid problem id")
    return id


def valid_cursor(cursor: str | None = None) -> str | None:
    """Validate the optional keyset cursor at the HTTP edge."""
    if cursor is not None and not ObjectId.is_valid(cursor):
        raise HTTPException(status_code=422, detail="Invalid cursor")
    return cursor
