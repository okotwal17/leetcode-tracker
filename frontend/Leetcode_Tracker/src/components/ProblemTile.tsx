// One row in a list of problems (used on both the Feed and All Problems pages).
// The whole tile is clickable to open the detail card; the delete button sits on
// top and stops the click from bubbling so deleting never also opens the card.
import DifficultyBadge from "./DifficultyBadge";
import { TrashIcon, CheckIcon, CalendarIcon } from "./icons";
import { useApp } from "../app/appContext";
import { useDeleteProblem } from "../hooks/useDeleteProblem";
import { formatDate, relativeDueLabel, todayISO } from "../utils/date";
import type { Problem } from "../types";

interface Props {
  problem: Problem;
  // The feed shows a relative label ("Overdue by 2 days"); the full list shows
  // the plain date. This flag toggles between them.
  showRelativeDue?: boolean;
}

export default function ProblemTile({ problem, showRelativeDue }: Props) {
  const { openDetail } = useApp();
  const remove = useDeleteProblem();

  const due = showRelativeDue
    ? relativeDueLabel(problem.repeat_on)
    : formatDate(problem.repeat_on);
  const overdue = problem.repeat_on !== null && problem.repeat_on < todayISO();

  return (
    <div
      className="tile"
      role="button"
      tabIndex={0}
      onClick={() => openDetail(problem)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openDetail(problem);
        }
      }}
    >
      <div className="tile-main">
        <span className="tile-title">{problem.title}</span>
        <div className="tile-meta">
          <DifficultyBadge difficulty={problem.difficulty} />
          {due && (
            <span className={`tile-due ${overdue ? "is-overdue" : ""}`}>
              <CalendarIcon width={14} height={14} />
              {due}
            </span>
          )}
        </div>
      </div>

      <div className="tile-side">
        <span
          className={`status-dot ${problem.passed ? "is-passed" : "is-failed"}`}
          title={problem.passed ? "Passed" : "Not passed yet"}
        >
          {problem.passed ? <CheckIcon width={14} height={14} /> : null}
          {problem.passed ? "Passed" : "Unsolved"}
        </span>

        <button
          type="button"
          className="icon-btn icon-btn--danger"
          aria-label={`Delete ${problem.title}`}
          onClick={(e) => {
            e.stopPropagation(); // don't open the detail card
            void remove(problem);
          }}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}
