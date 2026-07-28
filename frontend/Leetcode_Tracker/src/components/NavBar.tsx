import { NavLink } from "react-router-dom";
import { PencilIcon } from "./icons";
import { useApp } from "../app/appContext";
import { useAuth } from "../auth/authContext";

export default function NavBar() {
  const { openAdd } = useApp();
  const { user, logout } = useAuth();

  return (
    <header className="nav">
      <div className="nav-inner">
        <NavLink to="/" className="brand" aria-label="Leetcode Tracker home">
          <span className="brand-mark">{"</>"}</span>
          <span className="brand-name">Leetcode Tracker</span>
        </NavLink>

        <nav className="nav-links">
          {/* `end` so Feed is only active on exactly "/", not "/problems". */}
          <NavLink to="/" end className="nav-link">
            Feed
          </NavLink>
          <NavLink to="/problems" className="nav-link">
            All Problems
          </NavLink>
          <NavLink to="/retired" className="nav-link">
            Retired
          </NavLink>
        </nav>

        <button type="button" className="btn btn--primary add-btn" onClick={openAdd}>
          <PencilIcon />
          <span className="add-btn-label">Add</span>
        </button>

        {user && (
          <button
            type="button"
            className="btn btn--ghost user-signout"
            onClick={logout}
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
