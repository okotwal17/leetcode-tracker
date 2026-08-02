import { useState } from "react";
import ProblemList from "../components/ProblemList";
import SearchBar from "../components/SearchBar";
import { useDebounced } from "../hooks/useDebounced";
import { useProblems } from "../hooks/useProblems";

export default function ClosedProblemsPage() {
  const [query, setQuery] = useState("");
  const search = useDebounced(query).trim();
  const { status, data, error, hasMore, loadingMore, loadMore } = useProblems("closed", search);

  return (
    <section>
      <div className="page-head">
        <div>
          <h1 className="page-title">Retired</h1>
          <p className="page-subtitle">Closed for good. Open one to put it back.</p>
        </div>
        {status === "ready" && data.length > 0 && (
          <span className="count-pill">
            {data.length}
            {hasMore ? "+" : ""}
          </span>
        )}
      </div>

      <SearchBar value={query} onChange={setQuery} placeholder="Search retired…" />

      <ProblemList
        status={status}
        error={error}
        problems={data}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
        emptyTitle={search ? `No retired problems match “${search}”` : "Nothing retired yet"}
        emptyHint={
          search
            ? "Titles only — try a shorter piece of the name."
            : "Close a problem once you know it cold and it'll stop coming back."
        }
      />
    </section>
  );
}
