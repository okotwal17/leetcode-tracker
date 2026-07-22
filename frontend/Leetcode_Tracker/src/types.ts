// Mirrors the backend's Pydantic models (see backend/problems/problemModels.py).
// Keeping these in lockstep with the API is what makes the whole app type-safe:
// every fetch result flows through these shapes.

export type Difficulty = "Easy" | "Medium" | "Hard";

export const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

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
}

// Payload for creating a problem (LeetcodeAdd).
export interface ProblemCreate {
  title: string;
  difficulty: Difficulty;
  repeat_on: string | null;
  passed: boolean;
  notes: string | null;
}

// Payload for editing (LeetcodeEdit). Every field is optional: a PATCH only sends
// what changed. Sending null on repeat_on/notes clears them on the backend.
export type ProblemUpdate = Partial<ProblemCreate>;

export const NOTES_MAX_LENGTH = 300;
export const TITLE_MAX_LENGTH = 200;
