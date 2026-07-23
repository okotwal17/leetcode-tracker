// The landing page: everything due today or overdue, straight from
// GET /problems/today. This is the "what should I practice right now" view.
import ProblemList from "../components/ProblemList";
import { useProblems } from "../hooks/useProblems";
import { formatDate, todayISO } from "../utils/date";

export default function FeedPage() {
  const { status, data, error, hasMore, loadingMore, loadMore } = useProblems("today");

  return (
    <section>
      <div className="page-head">
        <div>
          <h1 className="page-title">Due Today</h1>
          <p className="page-subtitle">{formatDate(todayISO())}</p>
        </div>
        {status === "ready" && data.length > 0 && (
          <span className="count-pill">
            {data.length}
            {hasMore ? "+" : ""} problem{data.length === 1 && !hasMore ? "" : "s"}
          </span>
        )}
      </div>

      <ProblemList
        status={status}
        error={error}
        problems={data}
        showRelativeDue
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
        emptyTitle="You're all caught up 🎉"
        emptyHint="Nothing is scheduled for today. Add a problem or come back tomorrow."
      />
    </section>
  );
}
