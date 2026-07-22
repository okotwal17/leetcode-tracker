// The card that opens when you click a problem. Shows everything about it:
// title, colored difficulty, next attempt date, pass state, and notes — with a
// faded prompt in the notes area when there aren't any yet. Edit swaps this card
// for the form; Delete removes the problem and closes the card.
import DifficultyBadge from "./DifficultyBadge";
import { PencilIcon, TrashIcon, CheckIcon, XIcon } from "./icons";
import { useApp } from "../app/appContext";
import { useDeleteProblem } from "../hooks/useDeleteProblem";
import { formatDate } from "../utils/date";
import type { Problem } from "../types";

interface Props {
  problem: Problem;
  onClose: () => void; // close the whole modal (used after a delete)
}

export default function ProblemDetail({ problem, onClose }: Props) {
  const { openEdit } = useApp();
  const remove = useDeleteProblem();

  const nextAttempt = formatDate(problem.repeat_on);

  return (
    <div className="detail">
      <header className="detail-head">
        <h2 id="problem-detail-title" className="detail-title">
          {problem.title}
        </h2>
        <div className="detail-tags">
          <DifficultyBadge difficulty={problem.difficulty} />
          <span
            className={`pass-pill ${problem.passed ? "is-passed" : "is-failed"}`}
          >
            {problem.passed ? <CheckIcon width={15} height={15} /> : <XIcon width={15} height={15} />}
            {problem.passed ? "Passed" : "Not passed"}
          </span>
        </div>
      </header>

      <dl className="detail-fields">
        <div className="detail-field">
          <dt>Next attempt</dt>
          <dd>{nextAttempt ?? "Not scheduled"}</dd>
        </div>
      </dl>

      {/* Notes: real notes when present, otherwise a faded, centered nudge. */}
      <p className="notes-label">Notes</p>
      <div className={`notes-box ${problem.notes ? "" : "notes-box--empty"}`}>
        {problem.notes ? (
          <p className="notes-text">{problem.notes}</p>
        ) : (
          <p className="notes-placeholder">
            Save a few details here for safe keeping.
          </p>
        )}
      </div>

      <footer className="detail-actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => openEdit(problem)}
        >
          <PencilIcon />
          Edit
        </button>
        <button
          type="button"
          className="btn btn--danger-outline"
          onClick={async () => {
            const deleted = await remove(problem);
            if (deleted) onClose();
          }}
        >
          <TrashIcon />
          Delete
        </button>
      </footer>
    </div>
  );
}
