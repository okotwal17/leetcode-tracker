// Problems the user has retired. They never appear in the feed again, but they're
// kept here so closing something feels reversible rather than destructive — and so
// the archive stays an honest record of everything that was worked through.
import ProblemList from "../components/ProblemList";
import { useProblems } from "../hooks/useProblems";

export default function ClosedProblemsPage() {
  const { status, data, error, hasMore, loadingMore, loadMore } = useProblems("closed");

  return (
    <section>
      <div className="page-head">
        <div>
          <h1 className="page-title">Retired</h1>
          <p className="page-subtitle">Closed for good — open one to put it back.</p>
        </div>
        {status === "ready" && data.length > 0 && (
          <span className="count-pill">
            {data.length}
            {hasMore ? "+" : ""}
          </span>
        )}
      </div>

      <ProblemList
        status={status}
        error={error}
        problems={data}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
        emptyTitle="Nothing retired yet"
        emptyHint="Close a problem once you know it cold and it'll stop coming back."
      />
    </section>
  );
}
