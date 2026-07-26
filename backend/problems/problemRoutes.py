from fastapi import APIRouter, Depends, HTTPException, Query, status

from dependencies import current_user, valid_id, valid_cursor
from .problemModels import LeetcodeAdd, LeetcodeEdit, LeetcodeRead, ProblemPage
from . import problemMethods

problemRouter = APIRouter(prefix="/problems", tags=["problems"])


@problemRouter.post("", response_model=LeetcodeRead, status_code=status.HTTP_201_CREATED)
async def create_problem(
    data: LeetcodeAdd,
    user: dict = Depends(current_user),
):
    return await problemMethods.addProblem(user["_id"], data)


@problemRouter.get("", response_model=ProblemPage)
async def list_problems(
    limit: int = Query(20, ge=1, le=100),
    cursor: str | None = Depends(valid_cursor),
    user: dict = Depends(current_user),
):
    return await problemMethods.listProblems(user["_id"], limit=limit, cursor=cursor)


@problemRouter.get("/today", response_model=ProblemPage)
async def problems_due_today(
    limit: int = Query(20, ge=1, le=100),
    cursor: str | None = Depends(valid_cursor),
    user: dict = Depends(current_user),
):
    return await problemMethods.dueToday(user["_id"], limit=limit, cursor=cursor)


@problemRouter.get("/{id}", response_model=LeetcodeRead)
async def read_problem(
    id: str = Depends(valid_id),
    user: dict = Depends(current_user),
):
    problem = await problemMethods.getProblem(user["_id"], id)
    if problem is None:
        raise HTTPException(status_code=404, detail="Problem not found")
    return problem


@problemRouter.patch("/{id}", response_model=LeetcodeRead)
async def update_problem(
    data: LeetcodeEdit,
    id: str = Depends(valid_id),
    user: dict = Depends(current_user),
):
    problem = await problemMethods.editProblem(user["_id"], id, data)
    if problem is None:
        raise HTTPException(status_code=404, detail="Problem not found")
    return problem


@problemRouter.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_problem(
    id: str = Depends(valid_id),
    user: dict = Depends(current_user),
):
    if not await problemMethods.deleteProblem(user["_id"], id):
        raise HTTPException(status_code=404, detail="Problem not found")
