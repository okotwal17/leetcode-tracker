// The app's delete confirmation — a themed replacement for window.confirm, scoped
// specifically to "are you sure you want to delete this?" All the copy lives here
// (rather than at the call site) since delete is the only thing that uses it.
// Layout drives it through the promise-based confirmDelete() context action.
import { useEffect } from "react";
import { createPortal } from "react-dom";

interface Props {
  itemName: string; // shown in the prompt — the problem's title
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteDialog({ itemName, onConfirm, onCancel }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Capture-phase + stopImmediatePropagation so Escape cancels *only* this
      // dialog and never also closes a Modal sitting underneath it.
      e.stopImmediatePropagation();
      onCancel();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onCancel]);

  return createPortal(
    <div className="delete-dialog-backdrop" onMouseDown={onCancel}>
      <div
        className="delete-dialog-card"
        role="alertdialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="delete-dialog-title">{`Delete "${itemName}"?`}</h3>
        <p className="delete-dialog-message">{"This can't be undone."}</p>
        <div className="delete-dialog-actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={onConfirm}
            autoFocus
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
