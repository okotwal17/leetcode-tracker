// Delete is triggered from two places — the list tiles and the detail card — so
// the confirm + API + refresh flow lives here once. Returns an async function
// that resolves to `true` when a problem was actually deleted (so a caller like
// the detail modal knows to close itself).
import { useApp } from "../app/appContext";
import { deleteProblem } from "../api/problems";
import { ApiError } from "../api/client";
import type { Problem } from "../types";

export function useDeleteProblem() {
  const { refresh } = useApp();

  return async function remove(problem: Problem): Promise<boolean> {
    const ok = window.confirm(
      `Delete "${problem.title}"? This can't be undone.`,
    );
    if (!ok) return false;

    try {
      await deleteProblem(problem.id);
      refresh(); // re-fetch every list so the deleted row disappears
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.message : "Could not delete the problem.";
      window.alert(message);
      return false;
    }
  };
}
