from fastapi import APIRouter, Depends, HTTPException, status

from dependencies import valid_id
from problemModels import LeetcodeAdd, LeetcodeEdit, LeetcodeRead
import problemMethods

problemRouter = APIRouter(prefix="/problems", tags=["problems"])


@problemRouter.post("", response_model=LeetcodeRead, status_code=status.HTTP_201_CREATED)
async def create_problem(data: LeetcodeAdd):
    return await problemMethods.addProblem(data)


@problemRouter.get("", response_model=list[LeetcodeRead])
async def list_problems():
    return await problemMethods.listProblems()


@problemRouter.get("/today", response_model=list[LeetcodeRead])
async def problems_due_today():
    return await problemMethods.dueToday()


@problemRouter.get("/{id}", response_model=LeetcodeRead)
async def read_problem(id: str = Depends(valid_id)):
    problem = await problemMethods.getProblem(id)
    if problem is None:
        raise HTTPException(status_code=404, detail="Problem not found")
    return problem


@problemRouter.patch("/{id}", response_model=LeetcodeRead)
async def update_problem(data: LeetcodeEdit, id: str = Depends(valid_id)):
    problem = await problemMethods.editProblem(id, data)
    if problem is None:
        raise HTTPException(status_code=404, detail="Problem not found")
    return problem


@problemRouter.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_problem(id: str = Depends(valid_id)):
    if not await problemMethods.deleteProblem(id):
        raise HTTPException(status_code=404, detail="Problem not found")
