from datetime import date

from problems import scheduler
from problems.problemModels import (
    Difficulty,
    Grade,
    LeetcodeAdd,
    LeetcodeEdit,
    LeetcodeRead,
    ProblemPage,
    ProblemState,
    ReviewRead,
    ReviewSubmit,
)
from database import problems, reviews
from bson import ObjectId
from pymongo import ReturnDocument


# Fields every problem starts with. A new problem sits at rung 0 and off the ladder
# until its first review moves it.
NEW_SCHEDULING = {
    "rung": 0,
    "review_count": 0,
    "last_reviewed": None,
    "state": ProblemState.active.value,
}


async def addProblem(user_id: ObjectId, data: LeetcodeAdd) -> LeetcodeRead:
    """Adds a new problem owned by this user"""
    doc = data.model_dump(mode="json") | NEW_SCHEDULING | {"user_id": user_id}
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


async def listClosed(
    user_id: ObjectId, limit: int = 20, cursor: str | None = None
) -> ProblemPage:
    """One page of the problems this user has retired."""
    query: dict = {"user_id": user_id, "state": ProblemState.closed.value}
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

    # A hand-picked date is a signal, not just a value. Pulling it *earlier* than the
    # ladder wanted means the user is telling us they're weaker than we thought, so the
    # rung drops with it; pushing it out is deferral, which we don't punish.
    if updates.get("repeat_on"):
        current = await problems.find_one({"_id": ObjectId(id), "user_id": user_id})
        if current is None:
            return None
        updates["rung"] = scheduler.rung_after_override(
            current.get("rung", 0),
            date.fromisoformat(updates["repeat_on"]),
            date.today(),
        )

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


async def setState(
    user_id: ObjectId, id: str, state: ProblemState
) -> LeetcodeRead | None:
    """Retire a problem from the ladder, or put it back on."""
    doc = await problems.find_one_and_update(
        {"_id": ObjectId(id), "user_id": user_id},
        {"$set": {"state": state.value}},
        return_document=ReturnDocument.AFTER,
    )
    return LeetcodeRead(**doc) if doc else None


async def submitReview(
    user_id: ObjectId, id: str, data: ReviewSubmit
) -> ReviewRead | None:
    """Grade one attempt, move the problem along the ladder, and log the review."""
    current = await problems.find_one({"_id": ObjectId(id), "user_id": user_id})
    if current is None:
        return None

    rung_before = current.get("rung", 0)
    outcome = scheduler.review(
        rung=rung_before,
        difficulty=Difficulty(current["difficulty"]),
        self_rating=data.self_rating,
        hint=data.hint,
        minutes=data.minutes,
    )

    today = date.today()
    doc = await problems.find_one_and_update(
        {"_id": ObjectId(id), "user_id": user_id},
        {
            "$set": {
                "rung": outcome.rung,
                "repeat_on": outcome.due_on.isoformat(),
                "passed": outcome.grade >= Grade.good,
                "last_reviewed": today.isoformat(),
            },
            "$inc": {"review_count": 1},
        },
        return_document=ReturnDocument.AFTER,
    )
    if doc is None:
        return None

    # Logged after the schedule is committed: if this insert fails we lose a row of
    # history, which is recoverable, rather than logging a review that never happened.
    await reviews.insert_one(
        {
            "user_id": user_id,
            "problem_id": ObjectId(id),
            "reviewed_on": today.isoformat(),
            "self_rating": int(data.self_rating),
            "hint": data.hint.value,
            "minutes": data.minutes,
            "grade": int(outcome.grade),
            "rung_before": rung_before,
            "rung_after": outcome.rung,
            "due_on": outcome.due_on.isoformat(),
        }
    )

    return ReviewRead(
        problem=LeetcodeRead(**doc),
        grade=outcome.grade,
        rung_before=rung_before,
        rung_after=outcome.rung,
        due_on=outcome.due_on,
    )


async def dueToday(
    user_id: ObjectId, limit: int = 20, cursor: str | None = None
) -> ProblemPage:
    """The daily feed: this user's active problems due today or overdue."""
    query: dict = {
        "user_id": user_id,
        "state": ProblemState.active.value,
        "repeat_on": {
            "$ne": None,
            "$lte": date.today().isoformat(),
        },
    }
    if cursor:
        query["_id"] = {"$lt": ObjectId(cursor)}
    return await _page(query, limit)
