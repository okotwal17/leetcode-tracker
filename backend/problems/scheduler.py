"""Review scheduling: a Leitner ladder driven by a graded review outcome.

Pure on purpose — no DB, no clock, no async. The caller passes today's date in and
gets a rung and a due date back, which is what keeps every rule here unit-testable
and lets the whole algorithm be replaced behind one seam.
"""

import random
from datetime import date, timedelta
from typing import NamedTuple

# Grade and Hint live with the other wire-facing enums rather than here, so that
# problemModels can build ReviewSubmit out of them without importing this module back.
from problems.problemModels import CapReason, Difficulty, Grade, Hint

# Rung n means "come back in RUNG_DAYS[n] days". Stored 0-indexed, shown to the
# user as 1-6. Rung 5 is terminal.
RUNG_DAYS = (1, 4, 7, 14, 30, 60)
MAX_RUNG = len(RUNG_DAYS) - 1

# MOVE[current rung][grade] -> rung to move to. Row is where you are, column is how the
# review went, cell is where you land. The columns are in Grade order because Grade is an
# IntEnum, so MOVE[4][Grade.HARD] is just MOVE[4][1].
#
# A table rather than arithmetic because the ladder is multiplicative in days, so one
# fixed step means very different things at each end of it: +2 from rung 0 is a 7x jump,
# +2 from rung 3 would be 4.3x on an already-long interval.
MOVE = (
    #  Again  Hard  Good  Easy
    (0, 0, 1, 2),  # rung 0 ->  1 day
    (0, 1, 2, 3),  # rung 1 ->  4 days
    (0, 2, 3, 4),  # rung 2 ->  7 days
    (1, 2, 4, 4),  # rung 3 -> 14 days
    (2, 3, 5, 5),  # rung 4 -> 30 days
    (3, 4, 5, 5),  # rung 5 -> 60 days
)

# Ballpark solve times, used only to turn raw minutes into a ratio. Difficulty has no
# other influence: it never touches intervals or movement.
EXPECTED_MINUTES = {
    Difficulty.easy: 15.0,
    Difficulty.medium: 30.0,
    Difficulty.hard: 45.0,
}

# Taking this much longer than expected caps the grade at HARD.
SLOW_RATIO = 1.5

# Due dates are jittered by up to +/- this fraction of the interval. Without it, ten
# problems solved in one sitting all land on the same rung and come back on the same
# day, and that convoy stays welded together for good.
FUZZ = 0.15


class Outcome(NamedTuple):
    """The result of one review: how it was graded, and when it comes back."""

    grade: Grade
    rung: int
    due_on: date
    capped_by: CapReason | None = None


def _cap(
    hint: Hint = Hint.none,
    minutes: float | None = None,
    difficulty: Difficulty | None = None,
) -> tuple[Grade, CapReason | None]:
    """The ceiling the objective signals put on a grade, and which one set it."""
    # Asymmetric on purpose: users inflate self-ratings and rarely deflate them, so
    # evidence of struggle may veto optimism but evidence of speed may not override
    # a self-reported struggle.
    cap: Grade = Grade.easy
    reason: CapReason | None = None

    if hint is Hint.solution:
        cap, reason = Grade.again, CapReason.solution  # reading it isn't solving it
    elif hint is Hint.nudge:
        cap, reason = Grade.hard, CapReason.nudge

    if minutes is not None and difficulty is not None:
        # `< cap` rather than min(): a slow solve is still a solve (never "again"),
        # and on a tie the admitted hint is the more honest thing to report back.
        if minutes / EXPECTED_MINUTES[difficulty] > SLOW_RATIO and Grade.hard < cap:
            cap, reason = Grade.hard, CapReason.slow

    return cap, reason


def grade_from_signals(
    self_rating: Grade,
    hint: Hint = Hint.none,
    minutes: float | None = None,
    difficulty: Difficulty | None = None,
) -> Grade:
    """Fold objective signals into the self-rating. Signals cap it, never raise it."""
    cap, _ = _cap(hint, minutes, difficulty)
    return Grade(min(self_rating, cap))


def next_rung(rung: int, grade: Grade) -> int:
    """Look up where this grade moves the problem from its current rung."""
    return MOVE[max(0, min(MAX_RUNG, rung))][grade]


def next_due(rung: int, today: date, spread: float | None = None) -> date:
    """Due date for a rung, jittered so problems don't clump on one day."""
    days = RUNG_DAYS[max(0, min(MAX_RUNG, rung))]
    if spread is None:
        spread = random.random()
    # spread is [0,1); (2 * spread - 1) rescales it to [-1,1) so the jitter cuts both ways.
    offset = round(days * FUZZ * (2 * spread - 1))
    return today + timedelta(days=max(1, days + offset))


def rung_after_override(rung: int, manual_date: date, last_reviewed: date | None) -> int:
    """Adjust the rung when the user hand-picks a date, based on which way they moved it."""
    rung = max(0, min(MAX_RUNG, rung))
    if last_reviewed is None:
        return rung
    ladder_date = last_reviewed + timedelta(days=RUNG_DAYS[rung])
    if manual_date < ladder_date:
        return max(0, rung - 1)  # "I need this sooner" -> they're weaker than we thought
    return rung  # pushed out or unchanged: deferral is not failure


def review(
    rung: int,
    difficulty: Difficulty,
    self_rating: Grade,
    hint: Hint = Hint.none,
    minutes: float | None = None,
    today: date | None = None,
    spread: float | None = None,
) -> Outcome:
    """One review, end to end: raw signals in, new schedule out."""
    cap, reason = _cap(hint, minutes, difficulty)
    grade = Grade(min(self_rating, cap))
    moved = next_rung(rung, grade)
    # A cap that didn't actually bite isn't worth reporting: claiming "Hard" with a
    # nudge lands on Hard either way, and nothing was overridden.
    capped_by = reason if grade < self_rating else None
    return Outcome(grade, moved, next_due(moved, today or date.today(), spread), capped_by)
