// Mirrors the backend's Pydantic models in backend/problems and backend/auth.

export interface User {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  created_at: string | null;
}

export type Difficulty = "Easy" | "Medium" | "Hard";

export const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

// How a review went. These are the ints the backend's Grade IntEnum uses, so they
// travel over the wire as numbers — the order matters (worse < better).
export const GRADE = { again: 0, hard: 1, good: 2, easy: 3 } as const;
export type Grade = (typeof GRADE)[keyof typeof GRADE];

// How much help the user needed. `solution` forces the grade to Again server-side.
export type Hint = "none" | "nudge" | "solution";

// A retired problem never appears in the feed but is still browsable.
export type ProblemState = "active" | "closed";

// The ladder has six rungs; the backend stores them 0-indexed, and we show 1-6.
export const RUNG_COUNT = 6;

// What the API returns for a single problem (LeetcodeRead).
// `repeat_on` is an ISO date string ("YYYY-MM-DD") or null when unscheduled.
// `notes` is null when the user hasn't written any.
export interface Problem {
  id: string;
  title: string;
  difficulty: Difficulty;
  repeat_on: string | null;
  passed: boolean;
  notes: string | null;
  // Scheduling state. `rung` is 0-5; `review_count` of 0 means it has never been
  // reviewed, which is how the feed tells "due again" apart from "never finished".
  rung: number;
  review_count: number;
  last_reviewed: string | null;
  state: ProblemState;
}

// Payload for POST /problems/{id}/review. `minutes` is optional — skipping it just
// drops the time signal, and the grade runs on confidence + hints alone.
export interface ReviewSubmit {
  self_rating: Grade;
  hint: Hint;
  minutes: number | null;
}

// What POST /problems/{id}/review returns. `grade` is the *resolved* grade after the
// hint/time caps, which can be worse than the self_rating that was sent.
export interface ReviewResult {
  problem: Problem;
  grade: Grade;
  rung_before: number;
  rung_after: number;
  due_on: string;
}

// One page of a keyset-paginated list (backend ProblemPage). `items` is just
// this page's slice; `next_cursor` is the opaque token to request the next page
// (null at the end); `has_more` says whether another page exists.
export interface ProblemPage {
  items: Problem[];
  next_cursor: string | null;
  has_more: boolean;
}

// Payload for creating a problem (LeetcodeAdd). No `passed` — reviews own that flag
// now, so the client never sets it directly.
export interface ProblemCreate {
  title: string;
  difficulty: Difficulty;
  repeat_on: string | null;
  notes: string | null;
}

// Payload for editing (LeetcodeEdit). Every field is optional: a PATCH only sends
// what changed. Sending null on repeat_on/notes clears them on the backend.
export type ProblemUpdate = Partial<ProblemCreate>;

export const NOTES_MAX_LENGTH = 300;
export const TITLE_MAX_LENGTH = 200;
