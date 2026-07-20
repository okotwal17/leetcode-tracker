from database import problems


async def ensure_indexes() -> None:
    """Create the indexes our queries depend on.

    Safe to run on every boot: create_index is idempotent, so an index that
    already exists is a no-op rather than an error.
    """
    # dueToday() both filters ($lte) and sorts on repeat_on, so one index
    # serves both and keeps the sort out of memory.
    await problems.create_index("repeat_on")
