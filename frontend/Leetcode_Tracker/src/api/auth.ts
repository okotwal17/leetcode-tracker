import { api } from "./client";
import type { User } from "../types";

// POST /auth/google — trade a Google ID token for a session cookie.
export const loginWithGoogle = (credential: string) =>
  api.post<User>("/auth/google", { credential });

// GET /auth/me — who the session cookie belongs to. 401 when there isn't one.
export const getCurrentUser = () => api.get<User>("/auth/me");

// POST /auth/logout — clear the session cookie.
export const logout = () => api.post<void>("/auth/logout", {});
