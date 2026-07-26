"""Login, logout, and current-user endpoints."""

from fastapi import APIRouter, Depends, Response, status

from auth import authMethods, authSession
from auth.authModels import GoogleCredential, UserRead
from dependencies import current_user

authRouter = APIRouter(prefix="/auth", tags=["auth"])


@authRouter.post("/google", response_model=UserRead)
async def login_with_google(data: GoogleCredential, response: Response):
    """Trade a Google ID token for our own session cookie."""
    claims = await authMethods.verify_google_credential(data.credential)
    user = await authMethods.upsert_user(claims)
    authSession.set_session_cookie(
        response, authMethods.issue_session_token(str(user["_id"]))
    )
    return user


@authRouter.get("/me", response_model=UserRead)
async def read_current_user(user: dict = Depends(current_user)):
    """Who is logged in. 401 when the session is missing or expired."""
    return user


@authRouter.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response):
    """Drop the session cookie."""
    authSession.clear_session_cookie(response)
