// A reusable modal dialog. Rendered through a portal to <body> so it's never
// clipped by an ancestor's overflow/transform. Handles the accessibility basics:
// close on Escape, close on backdrop click, and locking background scroll while
// open. The content itself is whatever children the caller passes.
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "./icons";

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string; // id of the heading that names this dialog
}

export default function Modal({ onClose, children, labelledBy }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    // Freeze the page behind the modal so it doesn't scroll under the overlay.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return createPortal(
    // Clicking the backdrop (but not the dialog) closes the modal.
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        // Stop clicks inside the dialog from bubbling up to the backdrop handler.
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <XIcon />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
