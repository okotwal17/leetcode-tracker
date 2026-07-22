// Shared app-level actions, exposed via context so any page (or the nav's Add
// button) can open a modal or ask the lists to refetch — without prop-drilling
// callbacks through every component.
//
// The Layout owns the real state and provides this value; components consume it
// with the `useApp()` hook. Keeping the context object and hook in a plain .ts
// file (separate from the Provider component) keeps React Fast Refresh happy.
import { createContext, useContext } from "react";
import type { Problem } from "../types";

export interface AppContextValue {
  // Bumped after any create/edit/delete. Pages list it as a `useEffect`
  // dependency, so incrementing it re-runs their fetch.
  reloadToken: number;
  refresh: () => void;

  openDetail: (problem: Problem) => void; // view a problem's card
  openAdd: () => void; // blank "new problem" form
  openEdit: (problem: Problem) => void; // form pre-filled for editing
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppContext.Provider>");
  return ctx;
}
