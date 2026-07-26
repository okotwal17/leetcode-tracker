from database import problems, users


async def ensure_indexes() -> None:
    """Create the indexes our queries depend on.

    Safe to run on every boot: create_index is idempotent, so an index that
    already exists is a no-op rather than an error.
    """
    # dueToday() filters on passed (equality) + repeat_on (range) and sorts on
    # repeat_on.
    await problems.create_index([("passed", 1), ("repeat_on", 1)])

    # One Google account maps to exactly one user. unique=True is the DB-level
    # backstop in case two concurrent logins race past the upsert.
    await users.create_index("google_sub", unique=True)