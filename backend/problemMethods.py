from datetime import date

from problemModels import LeetcodeAdd, LeetcodeEdit, LeetcodeRead
from database import problems
from bson import ObjectId
from pymongo import ReturnDocument

# Fields where sending an explicit null is a real request.
NULLABLE_FIELDS = {"notes", "repeat_on"}


async def addProblem(data: LeetcodeAdd) -> LeetcodeRead:
    """Adds a new problem"""
    doc = data.model_dump(mode="json")
    await problems.insert_one(doc)            
    return LeetcodeRead(**doc)


async def getProblem(id: str) -> LeetcodeRead | None:
    """Gets a specific problem with id"""
    doc = await problems.find_one({"_id": ObjectId(id)})
    if doc is None:
        return None
    return LeetcodeRead(**doc)


async def listProblems() -> list[LeetcodeRead]:
    """Lists out all problems"""
    return [LeetcodeRead(**doc) async for doc in problems.find({})]

#READ OVER
async def editProblem(id: str, data: LeetcodeEdit) -> LeetcodeRead | None:
    """Updates a problem in DB"""
    updates = data.model_dump(mode="json", exclude_unset=True)
    updates = {                              
        k: v for k, v in updates.items()
        if v is not None or k in NULLABLE_FIELDS
    }
    if not updates:                          
        return await getProblem(id)

    doc = await problems.find_one_and_update(
        {"_id": ObjectId(id)},
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
    )
    if doc is None:
        return None
    return LeetcodeRead(**doc)


async def deleteProblem(id: str) -> bool:
    """Deletes a problem"""
    result = await problems.delete_one({"_id": ObjectId(id)})
    return result.deleted_count == 1


async def dueToday() -> list[LeetcodeRead]:
    """The daily feed: everything scheduled for today or overdue from before."""
    query = {
        "repeat_on": {
            "$ne": None,
            "$lte": date.today().isoformat(),
        }
    }
    return [LeetcodeRead(**doc) async for doc in problems.find(query).sort("repeat_on", 1)]
