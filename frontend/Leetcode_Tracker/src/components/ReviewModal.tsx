// The review flow, in two phases inside one dialog.
//
// Phase 1 collects the three things the user reports — minutes, hints, and how it
// went — with the four grade buttons doubling as submit. Phase 2 shows what the
// server decided: the resolved grade and the next due date, with a chance to
// override that date by hand.
//
// Note there is no live preview of the next date while you're answering. The date
// is deliberately only revealed after committing: watching "30 days" collapse to
// "4 days" the instant you admit to a hint would teach you to stop admitting it.
import { useState, type FormEvent } from "react";
import { updateProblem } from "../api/problems";
import { ApiError } from "../api/client";
import { useApp } from "../app/appContext";
import { useSubmitReview } from "../hooks/useSubmitReview";
import { CheckIcon } from "./icons";
import { formatDate, relativeDueLabel } from "../utils/date";
import { GRADE, RUNG_COUNT, type Grade, type Hint, type Problem, type ReviewResult } from "../types";

interface Props {
  problem: Problem;
  onClose: () => void;
}

const GRADE_BUTTONS: { grade: Grade; label: string; hint: string }[] = [
  { grade: GRADE.again, label: "Again", hint: "Couldn't solve it" },
  { grade: GRADE.hard, label: "Hard", hint: "Got there, painfully" },
  { grade: GRADE.good, label: "Good", hint: "Solved it cleanly" },
  { grade: GRADE.easy, label: "Easy", hint: "Barely had to think" },
];

const HINT_OPTIONS: { value: Hint; label: string }[] = [
  { value: "none", label: "None" },
  { value: "nudge", label: "A nudge" },
  { value: "solution", label: "Read the solution" },
];

const GRADE_LABEL: Record<number, string> = {
  0: "Again",
  1: "Hard",
  2: "Good",
  3: "Easy",
};

function messageFor(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export default function ReviewModal({ problem, onClose }: Props) {
  const { refresh } = useApp();
  const submitReview = useSubmitReview();

  const [hint, setHint] = useState<Hint>("none");
  const [minutes, setMinutes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Present once the review has been recorded — this is what flips us to phase 2.
  const [result, setResult] = useState<ReviewResult | null>(null);
  // Kept so phase 2 can tell whether a cap downgraded what they actually clicked.
  const [picked, setPicked] = useState<Grade | null>(null);

  // Phase 2: hand-overriding the date the ladder chose.
  const [editingDate, setEditingDate] = useState(false);
  const [date, setDate] = useState("");
  const [savingDate, setSavingDate] = useState(false);

  async function handleGrade(self_rating: Grade) {
    if (submitting) return;
    setSubmitting(true);
    setPicked(self_rating);
    setError(null);

    // An empty box means "not reporting it", which is different from zero minutes.
    const parsed = minutes.trim() === "" ? null : Number(minutes);

    try {
      const res = await submitReview(problem.id, {
        self_rating,
        hint,
        minutes: Number.isFinite(parsed) ? parsed : null,
      });
      setResult(res);
      setDate(res.due_on);
    } catch (err: unknown) {
      setError(messageFor(err, "Could not save the review. Try again."));
      setSubmitting(false); // let them retry; on success we swap to phase 2 instead
    }
  }

  async function handleDateSave(e: FormEvent) {
    e.preventDefault();
    if (savingDate || !result || date === result.due_on) {
      setEditingDate(false);
      return;
    }

    setSavingDate(true);
    setError(null);
    try {
      // Pulling this earlier than the ladder wanted also drops a rung, server-side.
      await updateProblem(problem.id, { repeat_on: date });
      refresh();
      setEditingDate(false);
    } catch (err: unknown) {
      setError(messageFor(err, "Could not change the date."));
    } finally {
      setSavingDate(false);
    }
  }

  // ---- phase 2: what the server decided --------------------------------------
  if (result) {
    // The resolved grade can be worse than what they clicked, when a hint or a slow
    // time capped it. Saying so is the whole point of showing it after the fact.
    const downgraded = picked !== null && result.grade < picked;

    return (
      <div className="review">
        <h2 id="review-modal-title" className="form-title">
          Review saved
        </h2>

        <div className="review-result">
          <span className={`review-grade review-grade--${result.grade}`}>
            <CheckIcon width={15} height={15} />
            Logged as {GRADE_LABEL[result.grade]}
          </span>
          {downgraded && (
            <p className="review-note">
              {hint === "solution"
                ? "Reading the solution counts as a miss, whatever it felt like."
                : "That took long enough that it counts as a struggle."}
            </p>
          )}
          <p className="review-rung">
            Rung {result.rung_after + 1} of {RUNG_COUNT}
            {result.rung_after !== result.rung_before && (
              <span className="review-rung-delta">
                {" "}
                ({result.rung_after > result.rung_before ? "up" : "down"} from{" "}
                {result.rung_before + 1})
              </span>
            )}
          </p>
        </div>

        {editingDate ? (
          <form className="review-date-form" onSubmit={handleDateSave}>
            <label className="field">
              <span className="field-label">Next review</span>
              <input
                className="input"
                type="date"
                value={date}
                autoFocus
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <p className="review-hint-text">
              Moving this earlier tells us you want it back sooner, and drops it a rung.
            </p>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setDate(result.due_on);
                  setEditingDate(false);
                }}
                disabled={savingDate}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn--primary" disabled={savingDate}>
                {savingDate ? "Saving…" : "Save date"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="review-next">
              <span className="review-next-label">Next review</span>
              <span className="review-next-date">{formatDate(date)}</span>
              <span className="review-next-rel">{relativeDueLabel(date)}</span>
            </div>

            {error && <p className="form-error">{error}</p>}

            <div className="form-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setEditingDate(true)}
              >
                Change date
              </button>
              <button type="button" className="btn btn--primary" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ---- phase 1: what the user reports ----------------------------------------
  return (
    <div className="review">
      <h2 id="review-modal-title" className="form-title">
        Review: {problem.title}
      </h2>

      <label className="field">
        <span className="field-label">
          How long did it take? <span className="char-count">optional</span>
        </span>
        <input
          className="input"
          type="number"
          inputMode="numeric"
          min={0}
          max={600}
          value={minutes}
          placeholder="minutes"
          onChange={(e) => setMinutes(e.target.value)}
        />
      </label>

      <fieldset className="field review-hints">
        <legend className="field-label">Did you need help?</legend>
        <div className="review-hint-options">
          {HINT_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`review-chip ${hint === option.value ? "is-selected" : ""}`}
            >
              <input
                type="radio"
                name="hint"
                value={option.value}
                checked={hint === option.value}
                onChange={() => setHint(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <p className="field-label">How did it go?</p>
      <div className="review-grades">
        {GRADE_BUTTONS.map((option) => (
          <button
            key={option.grade}
            type="button"
            className={`review-grade-btn review-grade-btn--${option.grade}`}
            disabled={submitting}
            onClick={() => handleGrade(option.grade)}
          >
            <span className="review-grade-label">{option.label}</span>
            <span className="review-grade-hint">{option.hint}</span>
          </button>
        ))}
      </div>

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
      </div>
    </div>
  );
}
