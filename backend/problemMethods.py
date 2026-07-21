from datetime import date

from problemModels import LeetcodeAdd, LeetcodeEdit, LeetcodeRead
from database import problems
from bson import ObjectId
from pymongo import ReturnDocument


async def addProblem(data: LeetcodeAdd) -> LeetcodeRead:
    """Adds a new problem"""
    doc = data.model_dump(mode="json")
    await problems.insert_one(doc)
    return LeetcodeRead(**doc)


async def getProblem(id: str) -> LeetcodeRead | None:
    """Gets a specific problem with id"""
    doc = await problems.find_one({"_id": ObjectId(id)})
    return LeetcodeRead(**doc) if doc else None


async def listProblems(limit: int = 200) -> list[LeetcodeRead]:
    """Lists out all problems"""
    limit = min(limit, 500)                    # ceiling the client cannot exceed
    cursor = problems.find({}).limit(limit)
    return [LeetcodeRead(**doc) async for doc in cursor]


async def editProblem(id: str, data: LeetcodeEdit) -> LeetcodeRead | None:
    """Updates a problem in DB"""
    updates = data.model_dump(mode="json", exclude_unset=True)
    if not updates:
        return await getProblem(id)

    doc = await problems.find_one_and_update(
        {"_id": ObjectId(id)},
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
    )
    return LeetcodeRead(**doc) if doc else None


async def deleteProblem(id: str) -> bool:
    """Deletes a problem"""
    result = await problems.delete_one({"_id": ObjectId(id)})
    return result.deleted_count == 1


async def dueToday(limit: int = 100) -> list[LeetcodeRead]:
    """The daily feed: everything scheduled for today or overdue from before."""
    limit = min(limit, 500)                    # ceiling the client cannot exceed
    query = {
        "repeat_on": {
            "$ne": None,
            "$lte": date.today().isoformat(),
        }
    }
    cursor = problems.find(query).sort("repeat_on", 1).limit(limit)
    return [LeetcodeRead(**doc) async for doc in cursor]
