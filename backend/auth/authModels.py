"""Request/response shapes for the auth endpoints."""

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, EmailStr, Field

# Mongo hands back _id as an ObjectId, which isn't JSON-serialisable.
PyObjectId = Annotated[str, BeforeValidator(str)]


class GoogleCredential(BaseModel):
    """What the frontend POSTs to /auth/google: the ID token Google handed it."""
    credential: str = Field(min_length=1)


class UserRead(BaseModel):
    """The safe, public view of a user — what we send back to the browser.

    Deliberately a *subset* of the Mongo document. `google_sub` stays server-side:
    the frontend has no use for it, and not shipping identifiers you don't need is
    free risk reduction.
    """

    id: PyObjectId = Field(validation_alias="_id")
    email: EmailStr
    name: str | None = None
    picture: str | None = None
    created_at: datetime | None = None
