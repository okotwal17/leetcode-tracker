import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/authContext";

// UX only — the real gate is the backend rejecting requests without a session.
export default function ProtectedRoute() {
  const { status } = useAuth();

  if (status === "loading") return <div className="auth-splash">Loading…</div>;
  if (status === "anonymous") return <Navigate to="/login" replace />;
  return <Outlet />;
}
