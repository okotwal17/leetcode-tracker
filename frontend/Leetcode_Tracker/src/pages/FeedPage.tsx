// The landing page: everything due today or overdue, straight from
// GET /problems/today. This is the "what should I practice right now" view.
//
// The endpoint returns a union of two things — problems the ladder has scheduled for
// another look, and problems that were never finished in the first place. They're
// split apart here on `review_count`, because they call for different actions: one is
// a refresher, the other is unfinished business.
import ProblemList from "../components/ProblemList";
import { useProblems } from "../hooks/useProblems";
import { formatDate, todayISO } from "../utils/date";

export default function FeedPage() {
  const { status, data, error, hasMore, loadingMore, loadMore } = useProblems("today");

  const reviews = data.filter((p) => p.review_count > 0);
  const unfinished = data.filter((p) => p.review_count === 0);

  // Only split the view once both buckets actually have something in them — a lone
  // heading over an otherwise-empty page is just noise.
  const split = status === "ready" && reviews.length > 0 && unfinished.length > 0;

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

      {split ? (
        <>
          <h2 className="section-title">Reviews</h2>
          <ProblemList
            status={status}
            error={error}
            problems={reviews}
            showRelativeDue
            emptyTitle=""
            emptyHint=""
          />

          <h2 className="section-title">Unfinished</h2>
          {/* Infinite scroll hangs off the last list on the page, so the sentinel
              only ever exists once. */}
          <ProblemList
            status={status}
            error={error}
            problems={unfinished}
            showRelativeDue
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={loadMore}
            emptyTitle=""
            emptyHint=""
          />
        </>
      ) : (
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
      )}
    </section>
  );
}
