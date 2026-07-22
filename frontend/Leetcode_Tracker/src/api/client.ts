// A tiny fetch wrapper so every call to the backend shares the same base URL,
// JSON handling, and error shape. Centralizing this means each endpoint function
// in problems.ts stays a one-liner, and if the transport ever changes (auth
// headers, retries, a different base URL) there's exactly one place to edit.

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// Thrown for any non-2xx response. Carries the HTTP status plus the backend's
// `detail` message when there is one, so the UI can show something meaningful.
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    // fetch only rejects on network-level failures (server down, DNS, CORS).
    throw new ApiError(0, "Can't reach the server. Is the backend running?");
  }

  if (!res.ok) {
    // FastAPI errors come back as { "detail": "..." }. Fall back to the status
    // text if the body isn't JSON (or is empty).
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      /* non-JSON body — keep the status text */
    }
    throw new ApiError(res.status, detail);
  }

  // 204 No Content (our DELETE) has no body to parse.
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
