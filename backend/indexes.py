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

    # dueToday(): ESR order — Equality (user_id, passed), Sort (_id), Range
    # (repeat_on). Sort before the range field is what keeps the sort in the
    # index instead of an in-memory sort of the whole match.
    await problems.create_index(
        [("user_id", 1), ("passed", 1), ("_id", -1), ("repeat_on", 1)]
    )

    # One Google account maps to exactly one user. unique=True is the DB-level
    # backstop in case two concurrent logins race past the upsert.
    await users.create_index("google_sub", unique=True)
