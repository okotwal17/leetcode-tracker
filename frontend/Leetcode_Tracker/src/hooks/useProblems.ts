// Data-fetching hook shared by both list pages. It reads `reloadToken` from the
// app context itself, so a page just calls `useProblems("today")` and gets fresh
// data automatically whenever something is created/edited/deleted anywhere.
//
// This hook is cursor-paginated: the first page loads on mount, and `loadMore()`
// appends the next page. It accumulates rows across pages (infinite scroll)
// rather than replacing them, except on a reset (kind change or reloadToken bump),
// which starts over from page one.
import { useCallback, useEffect, useRef, useState } from "react";
import { getDueToday, listProblems } from "../api/problems";
import { ApiError } from "../api/client";
import { useApp } from "../app/appContext";
import type { Problem } from "../types";

type Kind = "all" | "today";

interface State {
  status: "loading" | "ready" | "error";
  data: Problem[];
  error: string | null;
  hasMore: boolean;
  loadingMore: boolean;
}

interface UseProblems extends State {
  loadMore: () => void;
}

const PAGE_SIZE = 20;

function messageFor(err: unknown): string {
  return err instanceof ApiError ? err.message : "Something went wrong.";
}

export function useProblems(kind: Kind): UseProblems {
  const { reloadToken } = useApp();
  const [state, setState] = useState<State>({
    status: "loading",
    data: [],
    error: null,
    hasMore: false,
    loadingMore: false,
  });

  // Refs, not state: these steer the *next* fetch but shouldn't trigger renders.
  const cursorRef = useRef<string | null>(null); // token for the next page, or null at the end
  const loadingRef = useRef(false); // a request is in flight — dedupes overlapping loadMore()/observer fires
  const genRef = useRef(0); // bumps on every reset; late responses from an older gen are dropped

  const fetchPage = kind === "today" ? getDueToday : listProblems;

  // Reset + load page one whenever the list identity changes (kind) or something
  // was created/edited/deleted (reloadToken).
  useEffect(() => {
    const gen = ++genRef.current;
    cursorRef.current = null;
    loadingRef.current = true;
    setState({ status: "loading", data: [], error: null, hasMore: false, loadingMore: false });

    fetchPage({ limit: PAGE_SIZE })
      .then((page) => {
        if (gen !== genRef.current) return; // a newer reset superseded this fetch
        cursorRef.current = page.next_cursor;
        setState({
          status: "ready",
          data: page.items,
          error: null,
          hasMore: page.has_more,
          loadingMore: false,
        });
      })
      .catch((err: unknown) => {
        if (gen !== genRef.current) return;
        setState({ status: "error", data: [], error: messageFor(err), hasMore: false, loadingMore: false });
      })
      .finally(() => {
        if (gen === genRef.current) loadingRef.current = false;
      });
    // fetchPage is derived from kind (a stable import per kind), so kind covers it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, reloadToken]);

  const loadMore = useCallback(() => {
    // No-op if a request is already running or there's no next page.
    if (loadingRef.current || !cursorRef.current) return;
    const gen = genRef.current;
    loadingRef.current = true;
    setState((s) => ({ ...s, loadingMore: true }));

    fetchPage({ limit: PAGE_SIZE, cursor: cursorRef.current })
      .then((page) => {
        if (gen !== genRef.current) return; // a reset happened mid-flight — discard these rows
        cursorRef.current = page.next_cursor;
        setState((s) => ({
          ...s,
          data: [...s.data, ...page.items], // append, don't replace
          hasMore: page.has_more,
          loadingMore: false,
        }));
      })
      .catch((err: unknown) => {
        if (gen !== genRef.current) return;
        // Keep the rows already loaded; just stop the spinner and surface the error.
        setState((s) => ({ ...s, loadingMore: false, error: messageFor(err) }));
      })
      .finally(() => {
        if (gen === genRef.current) loadingRef.current = false;
      });
  }, [fetchPage]);

  return { ...state, loadMore };
}
