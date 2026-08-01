// Shared fetch wrapper: one base URL, one JSON path, one error shape.

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// The browser's IANA zone ("Asia/Kolkata"), sent on every request so the server
// can resolve "today" where the *user* is standing rather than where it is.
// Read once: a tab that outlives a timezone change is not worth the complexity.
const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

export class ApiError extends Error {
  status: number;
  // Seconds to wait, from the Retry-After header on a 429. Undefined otherwise.
  retryAfter?: number;

  constructor(status: number, message: string, retryAfter?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.retryAfter = retryAfter;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }
}

// AuthProvider registers a callback so a 401 anywhere sends the user to login.
// A module variable rather than an import, to keep this file dependency-free.
type UnauthorizedHandler = (detail: string) => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

// Same pattern for 429: RateLimitNotice registers a callback so being throttled
// anywhere raises one banner, instead of every caller inventing its own copy.
type RateLimitedHandler = (detail: string, retryAfter: number) => void;
let onRateLimited: RateLimitedHandler | null = null;

export function setRateLimitedHandler(handler: RateLimitedHandler | null) {
  onRateLimited = handler;
}

// One entry in FastAPI's 422 body: `loc` is the path to the offending field
// (["body", "minutes"]), `msg` the human-readable reason.
interface ValidationError {
  loc?: unknown[];
  msg?: string;
}

/** Pull a readable message out of either error shape FastAPI emits. */
function messageFrom(body: unknown, fallback: string): string {
  const detail = (body as { detail?: unknown } | null)?.detail;

  // HTTPException(detail="...") — every error we raise by hand.
  if (typeof detail === "string") return detail;

  // Request validation (422) sends a *list* of per-field errors instead. Naming
  // the field matters: "Input should be greater than or equal to 0" is useless
  // on a form with five inputs.
  if (Array.isArray(detail)) {
    const parts = (detail as ValidationError[])
      .filter((e) => typeof e?.msg === "string")
      .map((e) => {
        // Drop the "body"/"query" prefix and keep the leaf name.
        const field = e.loc?.filter((p) => p !== "body" && p !== "query").at(-1);
        return typeof field === "string" ? `${field}: ${e.msg}` : e.msg!;
      });
    if (parts.length > 0) return parts.join("; ");
  }

  return fallback;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      // Cross-origin fetches drop cookies unless asked, and the httpOnly session
      // cookie is the only thing identifying the user.
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-Timezone": TIMEZONE },
      ...options,
    });
  } catch {
    throw new ApiError(0, "Can't reach the server.");
  }

  if (!res.ok) {
    // statusText is empty over HTTP/2, which drops the reason phrase — so it can
    // never be the last resort on its own.
    const fallback = res.statusText || `Request failed (${res.status})`;
    let detail = fallback;
    try {
      detail = messageFrom(await res.json(), fallback);
    } catch {
      /* non-JSON body — keep the fallback */
    }

    // /auth/* is excluded: those callers handle 401 themselves, and /auth/me
    // returns one on every first visit, which is not an expiry.
    if (res.status === 401 && !path.startsWith("/auth/")) {
      onUnauthorized?.(detail);
    }

    // Retry-After is seconds here (the backend never sends the HTTP-date form).
    // The header is only readable cross-origin because the API lists it in
    // Access-Control-Expose-Headers; without that this is silently null.
    let retryAfter: number | undefined;
    if (res.status === 429) {
      const parsed = Number(res.headers.get("Retry-After"));
      retryAfter = Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
      onRateLimited?.(detail, retryAfter);
    }

    throw new ApiError(res.status, detail, retryAfter);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: (path: string) => request<void>(path, { method: "DELETE" }),
};
