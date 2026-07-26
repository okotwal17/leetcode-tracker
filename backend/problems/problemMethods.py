from datetime import date

from problems.problemModels import LeetcodeAdd, LeetcodeEdit, LeetcodeRead, ProblemPage
from database import problems
from bson import ObjectId
from pymongo import ReturnDocument


async def addProblem(user_id: ObjectId, data: LeetcodeAdd) -> LeetcodeRead:
    """Adds a new problem owned by this user"""
    doc = data.model_dump(mode="json") | {"user_id": user_id}
    await problems.insert_one(doc)
    return LeetcodeRead(**doc)


async def getProblem(user_id: ObjectId, id: str) -> LeetcodeRead | None:
    """Gets one of this user's problems by id"""
    doc = await problems.find_one({"_id": ObjectId(id), "user_id": user_id})
    return LeetcodeRead(**doc) if doc else None


async def _page(query: dict, limit: int) -> ProblemPage:
    """Run a keyset query and package it as one ProblemPage."""
    limit = min(limit, 100)                    # ceiling the client cannot exceed
    docs = [doc async for doc in problems.find(query).sort("_id", -1).limit(limit + 1)]
    has_more = len(docs) > limit
    docs = docs[:limit]                        # drop the peeked "is there more?" row
    next_cursor = str(docs[-1]["_id"]) if has_more and docs else None
    return ProblemPage(
        items=[LeetcodeRead(**doc) for doc in docs],
        next_cursor=next_cursor,
        has_more=has_more,
    )


async def listProblems(
    user_id: ObjectId, limit: int = 20, cursor: str | None = None
) -> ProblemPage:
    """One page of this user's archive, newest first."""
    query: dict = {"user_id": user_id}
    if cursor:
        query["_id"] = {"$lt": ObjectId(cursor)}
    return await _page(query, limit)


async def editProblem(
    user_id: ObjectId, id: str, data: LeetcodeEdit
) -> LeetcodeRead | None:
    """Updates one of this user's problems in DB"""
    updates = data.model_dump(mode="json", exclude_unset=True)
    if not updates:
        return await getProblem(user_id, id)

    doc = await problems.find_one_and_update(
        {"_id": ObjectId(id), "user_id": user_id},
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
    )
    return LeetcodeRead(**doc) if doc else None


async def deleteProblem(user_id: ObjectId, id: str) -> bool:
    """Deletes one of this user's problems"""
    result = await problems.delete_one({"_id": ObjectId(id), "user_id": user_id})
    return result.deleted_count == 1


async def dueToday(
    user_id: ObjectId, limit: int = 20, cursor: str | None = None
) -> ProblemPage:
    """The daily feed: this user's still-unsolved problems due today or overdue."""
    query: dict = {
        "user_id": user_id,
        "passed": False,
        "repeat_on": {
            "$ne": None,
            "$lte": date.today().isoformat(),
        },
    }
    if cursor:
        query["_id"] = {"$lt": ObjectId(cursor)}
    return await _page(query, limit)
