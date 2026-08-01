from datetime import date
from enum import Enum, IntEnum
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, Field, HttpUrl

PyObjectId = Annotated[str, BeforeValidator(str)]

class Difficulty(str, Enum):
    easy = "Easy"
    medium = "Medium"
    hard = "Hard"

class Grade(IntEnum):
    """How a review went. IntEnum so signals can cap it with min() and index MOVE."""
    again = 0
    hard = 1
    good = 2
    easy = 3

class Hint(str, Enum):
    """How much help the user needed to get there."""
    none = "none"
    nudge = "nudge"
    solution = "solution"

class ProblemState(str, Enum):
    """Closed problems are retired: never in the feed, still browsable."""
    active = "active"
    closed = "closed"

class LeetcodeAdd(BaseModel):
    title: str = Field(min_length=1, max_length=200) 
    difficulty: Difficulty
    repeat_on: date | None = None
    passed: bool = False
    notes: str | None = Field(default=None, max_length=300)
    url: HttpUrl | None = None

class LeetcodeEdit(BaseModel):
    title: str = Field(default=None, min_length=1, max_length=200)
    difficulty: Difficulty = None
    passed: bool = None
    repeat_on: date | None = None
    notes: str | None = Field(default=None, max_length=300)
    url: HttpUrl | None = None

class LeetcodeRead(BaseModel):
    id: PyObjectId = Field(validation_alias="_id")
    title: str = Field(min_length=1, max_length=200)
    difficulty: Difficulty
    repeat_on: date | None = None
    passed: bool = False
    notes: str | None = Field(default=None, max_length=300)
    url: str | None = None
    rung: int = 0
    review_count: int = 0
    last_reviewed: date | None = None
    state: ProblemState = ProblemState.active

class ReviewSubmit(BaseModel):
    """What the user reports after re-attempting a problem."""
    self_rating: Grade
    hint: Hint = Hint.none
    minutes: float | None = Field(default=None, ge=0, le=600)

class ReviewRead(BaseModel):
    """The result of a review: the updated problem plus how it was actually graded."""
    problem: LeetcodeRead
    grade: Grade
    rung_before: int
    rung_after: int
    due_on: date

class ProblemPage(BaseModel):
    items: list[LeetcodeRead]
    next_cursor: str | None = None
    has_more: bool = False
