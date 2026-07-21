from datetime import date
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, Field

PyObjectId = Annotated[str, BeforeValidator(str)]

class Difficulty(str, Enum):
    easy = "Easy"
    medium = "Medium"
    hard = "Hard"

class LeetcodeAdd(BaseModel):
    title: str = Field(min_length=1, max_length=200) 
    difficulty: Difficulty
    repeat_on: date | None = None
    passed: bool = False
    notes: str | None = Field(default=None, max_length=300)

class LeetcodeEdit(BaseModel):
    # All fields are OPTIONAL (= default), so any can be omitted in a PATCH.
    # Only repeat_on and notes are NULLABLE (| None) — sending null there means
    # "clear this". title/difficulty/passed reject a null with a 422, so a bad
    # client can't wipe them. This is why editProblem needs no null-filter.
    title: str = Field(default=None, min_length=1, max_length=200)
    difficulty: Difficulty = None
    passed: bool = None
    repeat_on: date | None = None
    notes: str | None = Field(default=None, max_length=300)

class LeetcodeRead(BaseModel):
    id: PyObjectId = Field(validation_alias="_id")
    title: str = Field(min_length=1, max_length=200)
    difficulty: Difficulty
    repeat_on: date | None = None
    passed: bool = False
    notes: str | None = Field(default=None, max_length=300)