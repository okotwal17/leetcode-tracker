// One form for both creating and editing — `problem` being present flips it into
// edit mode. Local state holds the in-progress values so typing never round-trips
// to the server; we only hit the API on submit.
import { useState, type FormEvent } from "react";
import { createProblem, updateProblem } from "../api/problems";
import { ApiError } from "../api/client";
import { useApp } from "../app/appContext";
import { ResetIcon } from "./icons";
import { todayISO } from "../utils/date";
import {
  DIFFICULTIES,
  NOTES_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  URL_MAX_LENGTH,
  type Difficulty,
  type Problem,
  type ProblemCreate,
  type ProblemUpdate,
} from "../types";

interface Props {
  problem?: Problem; // absent => "add" mode, present => "edit" mode
  onClose: () => void;
  // Add mode only. Called instead of onClose so the caller can put something else
  // in this modal's place rather than dropping the user back on the list.
  onCreated?: (problem: Problem) => void;
}

// Mirrors what the backend's HttpUrl accepts. Without this the API's 422 comes back
// as a field-error list the client wrapper can't read, and the user just sees
// "Unprocessable Entity" — so the same rule is checked here to say something useful.
function isHttpUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false; // no scheme, or not a URL at all
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

export default function ProblemForm({ problem, onClose, onCreated }: Props) {
  const { refresh, notify } = useApp();
  const isEdit = problem !== undefined;

  // Seed each field from the existing problem (edit) or a sensible blank (add).
  const [title, setTitle] = useState(problem?.title ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>(
    problem?.difficulty ?? "Easy",
  );
  const [repeatOn, setRepeatOn] = useState(problem?.repeat_on ?? "");
  const [notes, setNotes] = useState(problem?.notes ?? "");
  const [url, setUrl] = useState(problem?.url ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Give the problem a title.");
      return;
    }

    const cleanUrl = url.trim();
    if (cleanUrl !== "" && !isHttpUrl(cleanUrl)) {
      setError("That link doesn't look right — it should start with https://");
      return;
    }

    // Empty date / notes / link become null so the backend stores "unset" rather
    // than "". `passed` isn't here any more: a review sets it, so sending it from
    // the form would let the user contradict their own history.
    const payload: ProblemCreate = {
      title: cleanTitle,
      difficulty,
      repeat_on: repeatOn === "" ? null : repeatOn,
      notes: notes.trim() === "" ? null : notes.trim(),
      url: cleanUrl === "" ? null : cleanUrl,
    };

    setSubmitting(true);
    setError(null);
    try {
      if (isEdit) {
        // PATCH means partial, so send only the fields that actually changed. Each
        // input was seeded from `problem`, which makes this an apples-to-apples
        // comparison against what the server already stores.
        const changed = Object.fromEntries(
          Object.entries(payload).filter(
            ([key, value]) => value !== problem[key as keyof ProblemCreate],
          ),
        ) as ProblemUpdate;
        await updateProblem(problem.id, changed);
        refresh(); // pull the updated row into every list
        notify("Changes saved");
        onClose();
      } else {
        const created = await createProblem(payload);
        refresh();
        // No toast here: the notice that replaces this modal is the confirmation,
        // and two receipts for one action is just noise.
        if (onCreated) onCreated(created);
        else onClose();
      }
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.message : "Could not save. Try again.";
      setError(message);
      setSubmitting(false); // let them retry (on success we unmount instead)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h2 id="problem-form-title" className="form-title">
        {isEdit ? "Edit problem" : "Add a problem"}
      </h2>

      <label className="field">
        <span className="field-label">Problem name</span>
        <input
          className="input"
          type="text"
          value={title}
          maxLength={TITLE_MAX_LENGTH}
          placeholder="e.g. Two Sum"
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <label className="field">
        <span className="field-label">Link (optional)</span>
        <input
          className="input"
          type="text"
          inputMode="url"
          value={url}
          maxLength={URL_MAX_LENGTH}
          placeholder="https://leetcode.com/problems/two-sum/"
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span className="field-label">Difficulty</span>
          <select
            className="input"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>

        {/* A div, not a label: a <label> forwards clicks to its input, which
            would reopen the date picker every time you hit Clear. */}
        <div className="field">
          <div className="field-label">
            <label htmlFor="repeat-on">
              {isEdit ? "Override next review" : "First attempt"}
            </label>
            {repeatOn && (
              <button
                type="button"
                className="field-reset"
                onClick={() => setRepeatOn("")}
                aria-label="Clear date"
                title="Clear date"
              >
                <ResetIcon width={14} height={14} />
              </button>
            )}
          </div>
          <input
            id="repeat-on"
            className="input"
            type="date"
            value={repeatOn}
            onChange={(e) => setRepeatOn(e.target.value)}
            max={isEdit ? undefined : todayISO()}
          />
        </div>
      </div>

      {isEdit && (
        <p className="form-hint">
          Reviews normally set this date for you. Moving it earlier than the schedule
          also drops the problem a rung, since it means you want it back sooner.
        </p>
      )}

      <label className="field">
        <span className="field-label">
          Notes
          <span className="char-count">
            {notes.length}/{NOTES_MAX_LENGTH}
          </span>
        </span>
        <textarea
          className="input textarea"
          value={notes}
          maxLength={NOTES_MAX_LENGTH}
          rows={4}
          placeholder="Approach, edge cases, why you got stuck…"
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onClose}
          disabled={submitting}
        >
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Add problem"}
        </button>
      </div>
    </form>
  );
}
