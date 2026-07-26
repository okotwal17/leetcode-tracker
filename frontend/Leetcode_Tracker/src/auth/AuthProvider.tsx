import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import * as authApi from "../api/auth";
import { setUnauthorizedHandler } from "../api/client";
import type { User } from "../types";
import { AuthContext, type AuthContextValue, type AuthStatus } from "./authContext";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    authApi
      .getCurrentUser()
      .then((u) => {
        if (cancelled) return;
        setUser(u);
        setStatus("authenticated");
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setStatus("anonymous");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // A 401 from any other endpoint means the session died mid-use. This is what
  // turns an expired token into a trip back to the login screen.
  useEffect(() => {
    setUnauthorizedHandler((detail) => {
      setUser(null);
      setStatus("anonymous");
      setNotice(detail);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (credential: string) => {
    setUser(await authApi.loginWithGoogle(credential));
    setStatus("authenticated");
    setNotice(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setStatus("anonymous");
      setNotice(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, notice, login, logout }),
    [user, status, notice, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
