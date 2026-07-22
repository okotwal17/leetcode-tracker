// Data-fetching hook shared by both list pages. It reads `reloadToken` from the
// app context itself, so a page just calls `useProblems("today")` and gets fresh
// data automatically whenever something is created/edited/deleted anywhere.
import { useEffect, useState } from "react";
import { getDueToday, listProblems } from "../api/problems";
import { ApiError } from "../api/client";
import { useApp } from "../app/appContext";
import type { Problem } from "../types";

type Kind = "all" | "today";

interface State {
  status: "loading" | "ready" | "error";
  data: Problem[];
  error: string | null;
}

export function useProblems(kind: Kind): State {
  const { reloadToken } = useApp();
  const [state, setState] = useState<State>({
    status: "loading",
    data: [],
    error: null,
  });

  useEffect(() => {
    // `cancelled` guards against a slow response landing after the component
    // unmounts or the effect re-runs — the classic stale-response race.
    let cancelled = false;
    setState((s) => ({ ...s, status: "loading" }));

    const promise = kind === "today" ? getDueToday() : listProblems();
    promise
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof ApiError ? err.message : "Something went wrong.";
        setState({ status: "error", data: [], error: message });
      });

    return () => {
      cancelled = true;
    };
  }, [kind, reloadToken]);

  return state;
}
