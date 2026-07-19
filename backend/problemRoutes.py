from fastapi import APIRouter, HTTPException, status

from problemModels import LeetcodeAdd, LeetcodeEdit, LeetcodeRead
import problemMethods

router = APIRouter(prefix="/problems", tags=["problems"])


@router.post("", response_model=LeetcodeRead, status_code=status.HTTP_201_CREATED)
async def create_problem(data: LeetcodeAdd):
    return await problemMethods.addProblem(data)


@router.get("", response_model=list[LeetcodeRead])
async def list_problems():
    return await problemMethods.listProblems()


@router.get("/today", response_model=list[LeetcodeRead])
async def problems_due_today():
    return await problemMethods.dueToday()


@router.get("/{id}", response_model=LeetcodeRead)
async def read_problem(id: str):
    problem = await problemMethods.getProblem(id)
    if problem is None:
        raise HTTPException(status_code=404, detail="Problem not found")
    return problem


@router.patch("/{id}", response_model=LeetcodeRead)
async def update_problem(id: str, data: LeetcodeEdit):
    problem = await problemMethods.editProblem(id, data)
    if problem is None:
        raise HTTPException(status_code=404, detail="Problem not found")
    return problem


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_problem(id: str):
    if not await problemMethods.deleteProblem(id):
        raise HTTPException(status_code=404, detail="Problem not found")
