// Delete is triggered from two places — the list tiles and the detail card — so
// the confirm + API + refresh flow lives here once. Returns an async function
// that resolves to `true` when a problem was actually deleted (so a caller like
// the detail modal knows to close itself).
import { useApp } from "../app/appContext";
import { deleteProblem } from "../api/problems";
import { ApiError } from "../api/client";
import type { Problem } from "../types";

export function useDeleteProblem() {
  const { refresh, confirmDelete, notify } = useApp();

  return async function remove(problem: Problem): Promise<boolean> {
    const ok = await confirmDelete(problem.title);
    if (!ok) return false;

    try {
      await deleteProblem(problem.id);
      refresh(); // re-fetch every list so the deleted row disappears
      notify(`Deleted "${problem.title}"`);
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.message : "Could not delete the problem.";
      // A toast rather than an inline message: this is a hook with no UI of its
      // own, and by now the confirm dialog has closed, so there is nothing left on
      // screen belonging to the delete to hang a message off.
      notify(message, "error");
      return false;
    }
  };
}
