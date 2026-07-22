// The full archive of logged problems (GET /problems), with a search bar. The
// search input is intentionally non-functional for now — it's here as the
// placeholder for the filtering we'll wire up next. Keeping it visible lets us
// design the layout around it up front.
import ProblemList from "../components/ProblemList";
import { SearchIcon } from "../components/icons";
import { useProblems } from "../hooks/useProblems";

export default function AllProblemsPage() {
  const { status, data, error } = useProblems("all");

  return (
    <section>
      <div className="page-head">
        <div>
          <h1 className="page-title">All Problems</h1>
          <p className="page-subtitle">Every problem you've logged</p>
        </div>
        {status === "ready" && data.length > 0 && (
          <span className="count-pill">
            {data.length} total
          </span>
        )}
      </div>

      {/* Non-functional for now — search wiring comes later. */}
      <div className="search">
        <SearchIcon />
        <input
          className="search-input"
          type="search"
          placeholder="Search problems…"
          aria-label="Search problems"
        />
      </div>

      <ProblemList
        status={status}
        error={error}
        problems={data}
        emptyTitle="No problems yet"
        emptyHint="Hit Add in the top bar to log your first problem."
      />
    </section>
  );
}
