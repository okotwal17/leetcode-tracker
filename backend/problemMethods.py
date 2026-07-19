from datetime import date

from problemModels import LeetcodeAdd, LeetcodeEdit, LeetcodeRead
from database import problems
from bson import ObjectId
from pymongo import ReturnDocument

# Fields where sending an explicit null is a real request ("clear this").
# For every other field a null is nonsense, so we drop it instead of wiping good data.
NULLABLE_FIELDS = {"notes", "repeat_on"}


def to_object_id(id: str) -> ObjectId | None:
    if ObjectId.is_valid(id):
        return ObjectId(id)
    return None


def to_read(doc: dict) -> LeetcodeRead:
    """Turn a stored Mongo document into the API's Read model (_id -> id)."""
    doc["id"] = str(doc["_id"])
    return LeetcodeRead(**doc)


async def addProblem(data: LeetcodeAdd) -> LeetcodeRead:
    doc = data.model_dump(mode="json")        # model -> dict (date->ISO string, enum->str)
    result = await problems.insert_one(doc)   # store it; Mongo assigns the _id
    doc["id"] = str(result.inserted_id)       # ObjectId -> str for the API
    return LeetcodeRead(**doc)


async def getProblem(id: str) -> LeetcodeRead | None:
    oid = to_object_id(id)
    if oid is None:
        return None
    doc = await problems.find_one({"_id": oid})
    if doc is None:
        return None
    return to_read(doc)


async def listProblems() -> list[LeetcodeRead]:
    results: list[LeetcodeRead] = []
    async for doc in problems.find({}):       # find() returns an async cursor
        results.append(to_read(doc))
    return results


async def editProblem(id: str, data: LeetcodeEdit) -> LeetcodeRead | None:
    oid = to_object_id(id)
    if oid is None:
        return None

    updates = data.model_dump(mode="json", exclude_unset=True)  # only fields the user sent
    updates = {                               # ...minus nulls that would wipe a field
        k: v for k, v in updates.items()
        if v is not None or k in NULLABLE_FIELDS
    }
    if not updates:                           # nothing to change -> return current state
        return await getProblem(id)

    doc = await problems.find_one_and_update(
        {"_id": oid},
        {"$set": updates},
        return_document=ReturnDocument.AFTER,  # hand back the updated doc, not the old one
    )
    if doc is None:                           # id was valid but no such problem exists
        return None
    return to_read(doc)


async def deleteProblem(id: str) -> bool:
    oid = to_object_id(id)
    if oid is None:
        return False
    result = await problems.delete_one({"_id": oid})
    return result.deleted_count == 1          # True if something was deleted, else False


async def dueToday() -> list[LeetcodeRead]:
    """The daily feed: everything scheduled for today or overdue from before."""
    query = {
        "repeat_on": {
            "$ne": None,                      # unscheduled problems are not part of the feed
            "$lte": date.today().isoformat(),
        }
    }
    results: list[LeetcodeRead] = []
    async for doc in problems.find(query).sort("repeat_on", 1):   # most overdue first
        results.append(to_read(doc))
    return results
