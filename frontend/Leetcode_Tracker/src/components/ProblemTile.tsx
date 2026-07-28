// One row in a list of problems (used on the Feed, All Problems and Closed pages).
// The whole tile is clickable to open the detail card; the Review and Delete buttons
// sit on top and stop the click from bubbling so neither also opens the card.
import DifficultyBadge from "./DifficultyBadge";
import { TrashIcon, CalendarIcon, RepeatIcon } from "./icons";
import { useApp } from "../app/appContext";
import { useDeleteProblem } from "../hooks/useDeleteProblem";
import { formatDate, relativeDueLabel, todayISO } from "../utils/date";
import { RUNG_COUNT, type Problem } from "../types";

interface Props {
  problem: Problem;
  // The feed shows a relative label ("Overdue by 2 days"); the full list shows
  // the plain date. This flag toggles between them.
  showRelativeDue?: boolean;
}

export default function ProblemTile({ problem, showRelativeDue }: Props) {
  const { openDetail, openReview } = useApp();
  const remove = useDeleteProblem();

  const due = showRelativeDue
    ? relativeDueLabel(problem.repeat_on)
    : formatDate(problem.repeat_on);
  const overdue = problem.repeat_on !== null && problem.repeat_on < todayISO();
  const closed = problem.state === "closed";

  return (
    <div
      className={`tile ${closed ? "tile--closed" : ""}`}
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
        {/* A never-reviewed problem has no position on the ladder yet, so it reads as
            "New" rather than showing a misleading rung 1. */}
        <span
          className={`rung-pill ${closed ? "is-closed" : ""}`}
          title={
            closed
              ? "Retired — never appears in the feed"
              : problem.review_count === 0
                ? "Not reviewed yet"
                : `Reviewed ${problem.review_count} time${problem.review_count === 1 ? "" : "s"}`
          }
        >
          {closed
            ? "Retired"
            : problem.review_count === 0
              ? "New"
              : `Rung ${problem.rung + 1}/${RUNG_COUNT}`}
        </span>

        {!closed && (
          <button
            type="button"
            className="icon-btn icon-btn--accent"
            aria-label={`Review ${problem.title}`}
            title="Review"
            onClick={(e) => {
              e.stopPropagation(); // don't open the detail card
              openReview(problem);
            }}
          >
            <RepeatIcon />
          </button>
        )}

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
