// Renders the four states a fetched list can be in — loading, error, empty, and
// populated — so neither page has to repeat that branching. Both the Feed and
// All Problems pages hand it their fetch result and an empty-state message.
import ProblemTile from "./ProblemTile";
import type { Problem } from "../types";

interface Props {
  status: "loading" | "ready" | "error";
  error: string | null;
  problems: Problem[];
  emptyTitle: string;
  emptyHint: string;
  showRelativeDue?: boolean;
}

export default function ProblemList({
  status,
  error,
  problems,
  emptyTitle,
  emptyHint,
  showRelativeDue,
}: Props) {
  if (status === "loading") {
    // Placeholder rows that match the tile height so the layout doesn't jump
    // when the real data arrives.
    return (
      <div className="list">
        {[0, 1, 2].map((i) => (
          <div key={i} className="tile tile--skeleton" />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="state state--error">
        <p className="state-title">Couldn't load your problems</p>
        <p className="state-hint">{error}</p>
      </div>
    );
  }

  if (problems.length === 0) {
    return (
      <div className="state">
        <p className="state-title">{emptyTitle}</p>
        <p className="state-hint">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="list">
      {problems.map((p) => (
        <ProblemTile key={p.id} problem={p} showRelativeDue={showRelativeDue} />
      ))}
    </div>
  );
}
