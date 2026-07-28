// Submitting a review touches every list (the problem gets a new due date, so it
// leaves the feed), so the refresh lives here rather than in the modal. Errors are
// re-thrown for the caller to render inline — unlike delete, there's a form to put
// the message next to.
import { useApp } from "../app/appContext";
import { submitReview } from "../api/problems";
import type { ReviewResult, ReviewSubmit } from "../types";

export function useSubmitReview() {
  const { refresh } = useApp();

  return async function submit(
    id: string,
    data: ReviewSubmit,
  ): Promise<ReviewResult> {
    const result = await submitReview(id, data);
    refresh();
    return result;
  };
}
