// One function per backend route. These are the *only* place the app talks to
// the server, so components never build URLs or think about HTTP verbs.
import { api } from "./client";
import type {
  Problem,
  ProblemCreate,
  ProblemPage,
  ProblemUpdate,
  ReviewResult,
  ReviewSubmit,
} from "../types";

// Cursor + page size for the paginated list endpoints. `cursor` is the opaque
// token from the previous page's `next_cursor`; omit it for the first page.
export interface PageParams {
  cursor?: string | null;
  limit?: number;
}

// Build "?limit=…&cursor=…", including only the params that are actually set.
function pageQuery({ cursor, limit }: PageParams = {}): string {
  const params = new URLSearchParams();
  if (limit != null) params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// GET /problems/today — one page of the daily feed (scheduled for today or overdue).
export const getDueToday = (params?: PageParams) =>
  api.get<ProblemPage>(`/problems/today${pageQuery(params)}`);

// GET /problems — one page of the full archive.
export const listProblems = (params?: PageParams) =>
  api.get<ProblemPage>(`/problems${pageQuery(params)}`);

// POST /problems — create a new problem.
export const createProblem = (data: ProblemCreate) =>
  api.post<Problem>("/problems", data);

// PATCH /problems/{id} — partial update; only the fields in `data` change.
export const updateProblem = (id: string, data: ProblemUpdate) =>
  api.patch<Problem>(`/problems/${id}`, data);

// GET /problems/closed — one page of retired problems.
export const listClosed = (params?: PageParams) =>
  api.get<ProblemPage>(`/problems/closed${pageQuery(params)}`);

// DELETE /problems/{id} — remove a problem.
export const deleteProblem = (id: string) => api.del(`/problems/${id}`);

// POST /problems/{id}/review — record an attempt; the server grades it, moves the
// problem along the ladder, and returns the new schedule.
export const submitReview = (id: string, data: ReviewSubmit) =>
  api.post<ReviewResult>(`/problems/${id}/review`, data);

// POST /problems/{id}/close — retire a problem from the ladder for good.
export const closeProblem = (id: string) =>
  api.post<Problem>(`/problems/${id}/close`, {});

// POST /problems/{id}/reopen — put a retired problem back at the rung it left.
export const reopenProblem = (id: string) =>
  api.post<Problem>(`/problems/${id}/reopen`, {});
