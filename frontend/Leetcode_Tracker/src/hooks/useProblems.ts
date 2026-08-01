// Cursor-paginated fetch shared by the list pages. Reads `reloadToken` from app
// context, so any create/edit/delete anywhere refreshes the list. `loadMore()`
// appends; a reset (kind, search, or reloadToken change) starts over at page one.
import { useCallback, useEffect, useRef, useState } from "react";
import { getDueToday, listClosed, listProblems } from "../api/problems";
import { ApiError } from "../api/client";
import { useApp } from "../app/appContext";
import type { Problem } from "../types";

type Kind = "all" | "today" | "closed";

const FETCHERS = {
  all: listProblems,
  today: getDueToday,
  closed: listClosed,
} as const;

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

export function useProblems(kind: Kind, q = ""): UseProblems {
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

  const fetchPage = FETCHERS[kind];

  // Reset + load page one whenever the list identity changes (kind), the search
  // narrows (q), or something was created/edited/deleted (reloadToken).
  useEffect(() => {
    const gen = ++genRef.current;
    cursorRef.current = null;
    loadingRef.current = true;
    setState({ status: "loading", data: [], error: null, hasMore: false, loadingMore: false });

    fetchPage({ limit: PAGE_SIZE, q })
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
  }, [kind, reloadToken, q]);

  const loadMore = useCallback(() => {
    // No-op if a request is already running or there's no next page.
    if (loadingRef.current || !cursorRef.current) return;
    const gen = genRef.current;
    loadingRef.current = true;
    setState((s) => ({ ...s, loadingMore: true }));

    // q rides along: without it page 2 would silently drop the filter.
    fetchPage({ limit: PAGE_SIZE, cursor: cursorRef.current, q })
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
  }, [fetchPage, q]);

  return { ...state, loadMore };
}
