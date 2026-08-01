"""Google token verification, user upsert, and session token mint/decode."""

import asyncio
from datetime import datetime, timezone

import jwt
from fastapi import HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from pymongo import ReturnDocument

from auth.authConfig import GOOGLE_CLIENT_ID, JWT_ALGORITHM, JWT_SECRET, SESSION_TTL
from database import users


async def verify_google_credential(credential: str) -> dict:
    """Verify a Google ID token and return its claims."""
    # Checks signature, aud == our client id, iss, and exp. Blocking + may hit the
    # network for Google's certs, so it runs off the event loop.
    try:
        claims = await asyncio.to_thread(
            google_id_token.verify_oauth2_token,
            credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not verify Google sign-in. Please try again.",
        ) from exc

    if not claims.get("email_verified"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your Google account's email address is not verified.",
        )

    return claims


async def upsert_user(claims: dict) -> dict:
    """Find or create the user behind a Google account."""
    # Keyed on `sub` (permanent) rather than email (reassignable). One atomic call,
    # so two simultaneous logins can't create duplicate users.
    now = datetime.now(timezone.utc)
    return await users.find_one_and_update(
        {"google_sub": claims["sub"]},
        {
            "$set": {
                "email": claims.get("email"),
                "name": claims.get("name"),
                "picture": claims.get("picture"),
                "last_login_at": now,
            },
            "$setOnInsert": {"google_sub": claims["sub"], "created_at": now},
        },
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )


def issue_session_token(user_id: str) -> str:
    """Mint a signed session token for this user."""
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": user_id, "iat": now, "exp": now + SESSION_TTL},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


def decode_session_token(token: str) -> str:
    """Validate one of our tokens and return the user id inside it."""
    try:
        # algorithms is a whitelist we supply, never read from the token — that's
        # what blocks the `{"alg": "none"}` forgery.
        claims = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        # Separate from "invalid": this is the normal end of a session.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired. Please sign in again.",
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session. Please sign in again.",
        ) from exc

    return claims["sub"]


