// Transient "that worked" confirmations, stacked in the bottom-right corner.
//
// Deliberately not the same thing as RateLimitNotice: that one is an ambient
// condition with a countdown that dismisses itself when the limit lifts, while
// these are one-shot receipts for an action the user just took. Layout owns the
// list so any component can push one through `notify()` on the app context.
import { useEffect } from "react";
import { createPortal } from "react-dom";

export type ToastVariant = "success" | "error";

export interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface Props {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

const VISIBLE_MS = 3200;

export default function ToastStack({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) return null;

  return createPortal(
    // aria-live on the container, not each toast: the region has to exist before
    // the text lands in it, or screen readers announce nothing.
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body,
  );
}

function Toast({ toast, onDismiss }: { toast: ToastItem } & Pick<Props, "onDismiss">) {
  const isError = toast.variant === "error";

  // Each toast times out independently, so a second one appearing doesn't restart
  // or truncate the first. Errors never time out: this replaced a blocking
  // window.alert, and a failed delete that quietly slides away reads to the user
  // as a delete that worked.
  useEffect(() => {
    if (isError) return;
    const timer = setTimeout(() => onDismiss(toast.id), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toast.id, isError, onDismiss]);

  return (
    // role="alert" upgrades just this node to assertive inside the polite stack,
    // so a failure interrupts rather than queueing behind other announcements.
    <div className={`toast toast--${toast.variant}`} role={isError ? "alert" : undefined}>
      <span className="toast__text">{toast.message}</span>
      <button
        type="button"
        className="toast__dismiss"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
      >
        {"×"}
      </button>
    </div>
  );
}
