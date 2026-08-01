from database import problems, users


async def ensure_indexes() -> None:
    """Create the indexes our queries depend on.

    Safe to run on every boot: create_index is idempotent, so an index that
    already exists is a no-op rather than an error.
    """
    # Every problem query filters on user_id, so it leads both indexes. Anything
    # after it is only reachable once Mongo has narrowed to one user's documents.

    # listProblems(): match user_id, then walk _id descending — that single scan
    # both applies the keyset cursor ($lt) and supplies the sort order.
    await problems.create_index([("user_id", 1), ("_id", -1)])

    # dueToday(): ESR order — Equality (user_id, state), Sort (_id), Range
    # (repeat_on). 
    await problems.create_index(
        [("user_id", 1), ("state", 1), ("_id", -1), ("repeat_on", 1)]
    )

    # listClosed() reuses the index above: same equality prefix, same _id sort, and it
    # simply never touches the repeat_on range.

    # One Google account maps to exactly one user. unique=True is the DB-level
    # backstop in case two concurrent logins race past the upsert.
    await users.create_index("google_sub", unique=True)
