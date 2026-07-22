// One form for both creating and editing — `problem` being present flips it into
// edit mode. Local state holds the in-progress values so typing never round-trips
// to the server; we only hit the API on submit.
import { useState, type FormEvent } from "react";
import { createProblem, updateProblem } from "../api/problems";
import { ApiError } from "../api/client";
import { useApp } from "../app/appContext";
import {
  DIFFICULTIES,
  NOTES_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  type Difficulty,
  type Problem,
  type ProblemCreate,
} from "../types";

interface Props {
  problem?: Problem; // absent => "add" mode, present => "edit" mode
  onClose: () => void;
}

export default function ProblemForm({ problem, onClose }: Props) {
  const { refresh } = useApp();
  const isEdit = problem !== undefined;

  // Seed each field from the existing problem (edit) or a sensible blank (add).
  const [title, setTitle] = useState(problem?.title ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>(
    problem?.difficulty ?? "Easy",
  );
  const [repeatOn, setRepeatOn] = useState(problem?.repeat_on ?? "");
  const [passed, setPassed] = useState(problem?.passed ?? false);
  const [notes, setNotes] = useState(problem?.notes ?? "");

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

    // Empty date / notes become null so the backend stores "unset" rather than "".
    const payload: ProblemCreate = {
      title: cleanTitle,
      difficulty,
      repeat_on: repeatOn === "" ? null : repeatOn,
      passed,
      notes: notes.trim() === "" ? null : notes.trim(),
    };

    setSubmitting(true);
    setError(null);
    try {
      if (isEdit) {
        await updateProblem(problem.id, payload);
      } else {
        await createProblem(payload);
      }
      refresh(); // pull the new/updated row into every list
      onClose();
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

        <label className="field">
          <span className="field-label">Next attempt</span>
          <input
            className="input"
            type="date"
            value={repeatOn ?? ""}
            onChange={(e) => setRepeatOn(e.target.value)}
          />
        </label>
      </div>

      <label className="toggle">
        <input
          type="checkbox"
          checked={passed}
          onChange={(e) => setPassed(e.target.checked)}
        />
        <span className="toggle-track" aria-hidden="true">
          <span className="toggle-thumb" />
        </span>
        <span className="field-label">I passed this problem</span>
      </label>

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
