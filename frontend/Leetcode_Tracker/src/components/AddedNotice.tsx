// Shown once, right after a problem is created.
//
// The add form's date is when you *solved* it, and the ladder turns that into a
// review a day later — so there's no way to schedule something further out from
// this form. That's done from the review flow instead, which isn't discoverable
// on your first add. This says so at the one moment it's relevant.
import { useNavigate } from "react-router-dom";
import { formatDate } from "../utils/date";
import type { Problem } from "../types";

interface Props {
  problem: Problem;
  onClose: () => void;
}

export default function AddedNotice({ problem, onClose }: Props) {
  const navigate = useNavigate();
  const due = formatDate(problem.repeat_on);

  return (
    <div className="added-notice">
      <h2 id="added-notice-title" className="added-notice__title">
        Added
      </h2>

      <p className="added-notice__body">
        {due ? (
          <>
            <strong>{problem.title}</strong> comes back for review on{" "}
            <strong>{due}</strong>.
          </>
        ) : (
          <>
            <strong>{problem.title}</strong> has no review date yet, so it won't
            appear in your feed until you give it one.
          </>
        )}
      </p>

      <p className="added-notice__body added-notice__hint">
        Want it further out? Open <strong>All Problems</strong>, hit{" "}
        <strong>Review</strong> on its card, and pick the date you want.
      </p>

      <div className="added-notice__actions">
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Got it
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            onClose();
            navigate("/problems");
          }}
          autoFocus
        >
          Go to All Problems
        </button>
      </div>
    </div>
  );
}
