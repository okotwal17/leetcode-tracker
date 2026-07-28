// The card that opens when you click a problem. Shows everything about it: title,
// colored difficulty, where it sits on the ladder, next review date, and notes —
// with a faded prompt in the notes area when there aren't any yet. Review records an
// attempt; Retire takes it off the ladder for good (and back on, from the Retired page).
import { useState } from "react";
import DifficultyBadge from "./DifficultyBadge";
import { PencilIcon, TrashIcon, CheckIcon, XIcon, RepeatIcon, ArchiveIcon } from "./icons";
import { useApp } from "../app/appContext";
import { useDeleteProblem } from "../hooks/useDeleteProblem";
import { closeProblem, reopenProblem } from "../api/problems";
import { ApiError } from "../api/client";
import { formatDate } from "../utils/date";
import { RUNG_COUNT, type Problem } from "../types";

interface Props {
  problem: Problem;
  onClose: () => void; // close the whole modal (used after a delete)
}

export default function ProblemDetail({ problem, onClose }: Props) {
  const { openEdit, openReview, refresh } = useApp();
  const remove = useDeleteProblem();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const retired = problem.state === "closed";

  async function toggleRetired() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await (retired ? reopenProblem : closeProblem)(problem.id);
      refresh();
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof ApiError ? err.message : "Could not update the problem.",
      );
      setBusy(false);
    }
  }

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
          {retired && <span className="pass-pill is-retired">Retired</span>}
        </div>
      </header>

      <dl className="detail-fields">
        <div className="detail-field">
          <dt>Next review</dt>
          <dd>{formatDate(problem.repeat_on) ?? "Not scheduled"}</dd>
        </div>
        <div className="detail-field">
          <dt>Ladder</dt>
          <dd>
            {problem.review_count === 0
              ? "Not reviewed yet"
              : `Rung ${problem.rung + 1} of ${RUNG_COUNT}`}
          </dd>
        </div>
        <div className="detail-field">
          <dt>Reviews</dt>
          <dd>
            {problem.review_count}
            {problem.last_reviewed && ` · last ${formatDate(problem.last_reviewed)}`}
          </dd>
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

      {error && <p className="form-error">{error}</p>}

      <footer className="detail-actions">
        {!retired && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => openReview(problem)}
          >
            <RepeatIcon />
            Review
          </button>
        )}
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => openEdit(problem)}
        >
          <PencilIcon />
          Edit
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={toggleRetired}
          disabled={busy}
        >
          <ArchiveIcon />
          {retired ? "Put back" : "Retire"}
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
