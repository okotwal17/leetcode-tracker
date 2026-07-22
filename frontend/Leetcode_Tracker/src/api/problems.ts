// One function per backend route. These are the *only* place the app talks to
// the server, so components never build URLs or think about HTTP verbs.
import { api } from "./client";
import type { Problem, ProblemCreate, ProblemUpdate } from "../types";

// GET /problems/today — the daily feed (scheduled for today or overdue).
export const getDueToday = () => api.get<Problem[]>("/problems/today");

// GET /problems — every problem the user has logged.
export const listProblems = () => api.get<Problem[]>("/problems");

// POST /problems — create a new problem.
export const createProblem = (data: ProblemCreate) =>
  api.post<Problem>("/problems", data);

// PATCH /problems/{id} — partial update; only the fields in `data` change.
export const updateProblem = (id: string, data: ProblemUpdate) =>
  api.patch<Problem>(`/problems/${id}`, data);

// DELETE /problems/{id} — remove a problem.
export const deleteProblem = (id: string) => api.del(`/problems/${id}`);
