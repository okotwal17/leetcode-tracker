from bson import ObjectId
from fastapi import HTTPException


def valid_id(id: str) -> str:
    """Reject malformed ids at the HTTP edge, so the methods layer can trust them.
    A garbage id is a bad request (422), not a missing resource (404).
    """
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=422, detail="Invalid problem id")
    return id
