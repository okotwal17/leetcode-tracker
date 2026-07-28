import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import AuthProvider from "./auth/AuthProvider";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import FeedPage from "./pages/FeedPage";
import AllProblemsPage from "./pages/AllProblemsPage";
import ClosedProblemsPage from "./pages/ClosedProblemsPage";
import LoginPage from "./pages/LoginPage";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function App() {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="auth-splash">
        VITE_GOOGLE_CLIENT_ID is not set. Add it to .env.local, then restart the
        dev server.
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Outside the guard, or signing in would redirect to itself. */}
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route index element={<FeedPage />} />
                <Route path="problems" element={<AllProblemsPage />} />
                <Route path="retired" element={<ClosedProblemsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}
