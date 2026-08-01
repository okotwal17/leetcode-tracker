import { useState } from "react";
import ProblemList from "../components/ProblemList";
import SearchBar from "../components/SearchBar";
import { useDebounced } from "../hooks/useDebounced";
import { useProblems } from "../hooks/useProblems";

export default function AllProblemsPage() {
  const [query, setQuery] = useState("");
  const search = useDebounced(query).trim();
  const { status, data, error, hasMore, loadingMore, loadMore } = useProblems("all", search);

  return (
    <section>
      <div className="page-head">
        <div>
          <h1 className="page-title">All Problems</h1>
          <p className="page-subtitle">Every problem you've logged</p>
        </div>
        {status === "ready" && data.length > 0 && (
          <span className="count-pill">
            {data.length}
            {hasMore ? "+" : ""} {search ? "found" : "loaded"}
          </span>
        )}
      </div>

      <SearchBar value={query} onChange={setQuery} />

      <ProblemList
        status={status}
        error={error}
        problems={data}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
        emptyTitle={search ? `No problems match “${search}”` : "No problems yet"}
        emptyHint={
          search
            ? "Titles only — try a shorter piece of the name."
            : "Hit Add in the top bar to log your first problem."
        }
      />
    </section>
  );
}
