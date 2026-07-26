import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";

export default function LoginPage() {
  const { status, notice, login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  if (status === "loading") return <div className="auth-splash">Loading…</div>;
  if (status === "authenticated") return <Navigate to="/" replace />;

  const message = error ?? notice;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <span className="brand-mark">{"</>"}</span>
        <h1 className="auth-title">Leetcode Tracker</h1>
        <p className="auth-subtitle">
          Sign in to track your problems and daily reviews.
        </p>

        {message && (
          <p className={error ? "auth-message auth-message--error" : "auth-message"}>
            {message}
          </p>
        )}

        <div className="auth-google">
          <GoogleLogin
            onSuccess={async (res) => {
              if (!res.credential) {
                setError("Google didn't return a credential. Please try again.");
                return;
              }
              setError(null);
              try {
                await login(res.credential);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Sign-in failed.");
              }
            }}
            onError={() => setError("Google sign-in was cancelled or failed.")}
          />
        </div>
      </div>
    </div>
  );
}
