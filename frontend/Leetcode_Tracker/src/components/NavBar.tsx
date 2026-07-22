// Top navigation bar: brand on the left, the two page links in the middle, and
// the Add button (pencil icon) on the right. NavLink gives us the active-page
// styling for free by setting `aria-current` / an `active` class on the match.
import { NavLink } from "react-router-dom";
import { PencilIcon } from "./icons";
import { useApp } from "../app/appContext";

export default function NavBar() {
  const { openAdd } = useApp();

  return (
    <header className="nav">
      <div className="nav-inner">
        <NavLink to="/" className="brand" aria-label="Leetcode Tracker home">
          <span className="brand-mark">{"</>"}</span>
          <span className="brand-name">Leetcode Tracker</span>
        </NavLink>

        <nav className="nav-links">
          {/* `end` so "Feed" is only active on exactly "/", not on "/problems". */}
          <NavLink to="/" end className="nav-link">
            Feed
          </NavLink>
          <NavLink to="/problems" className="nav-link">
            All Problems
          </NavLink>
        </nav>

        <button type="button" className="btn btn--primary add-btn" onClick={openAdd}>
          <PencilIcon />
          <span className="add-btn-label">Add</span>
        </button>
      </div>
    </header>
  );
}
