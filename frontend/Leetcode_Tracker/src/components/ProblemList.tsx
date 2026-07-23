// Renders the four states a fetched list can be in — loading, error, empty, and
// populated — so neither page has to repeat that branching. Both the Feed and
// All Problems pages hand it their fetch result and an empty-state message.
//
// When `hasMore`/`onLoadMore` are provided it also drives infinite scroll: a
// sentinel div sits below the last tile, and an IntersectionObserver calls
// `onLoadMore` as it nears the viewport.
import { useEffect, useRef } from "react";
import ProblemTile from "./ProblemTile";
import type { Problem } from "../types";

interface Props {
  status: "loading" | "ready" | "error";
  error: string | null;
  problems: Problem[];
  emptyTitle: string;
  emptyHint: string;
  showRelativeDue?: boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

export default function ProblemList({
  status,
  error,
  problems,
  emptyTitle,
  emptyHint,
  showRelativeDue,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}: Props) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || !onLoadMore) return;

    // root: null → observe against the viewport (the document scrolls, there's no
    // inner scroll container). rootMargin prefetches the next page ~200px early.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore();
      },
      { root: null, rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // Re-observe after each append: if the sentinel is still on-screen (e.g. a
    // short page didn't fill the viewport), re-observing re-fires and pulls the
    // next page until the viewport is full or hasMore turns false.
  }, [hasMore, onLoadMore, problems.length]);

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
      {hasMore && <div ref={sentinelRef} className="list-sentinel" aria-hidden />}
      {loadingMore && <div className="list-loading-more">Loading more…</div>}
    </div>
  );
}
