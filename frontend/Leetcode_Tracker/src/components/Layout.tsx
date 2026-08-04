// The app shell: it owns all the cross-page state (which modal is open, and the
// reload token) and hands it to the rest of the tree through AppContext. Pages
// render into <Outlet/>. Because the modals live here — above the router — any
// page can open the same detail/add/edit dialog by calling a context action.
import { useCallback, useMemo, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import NavBar from "./NavBar";
import Modal from "./Modal";
import ProblemDetail from "./ProblemDetail";
import ProblemForm from "./ProblemForm";
import ReviewModal from "./ReviewModal";
import DeleteDialog from "./DeleteDialog";
import AddedNotice from "./AddedNotice";
import ToastStack, { type ToastItem, type ToastVariant } from "./Toast";
import { AppContext, type AppContextValue } from "../app/appContext";
import type { Problem } from "../types";

// Exactly one dialog can be open at a time, so a discriminated union models the
// state better than a pile of booleans — the compiler forces us to handle each.
type ModalState =
  | { type: "none" }
  | { type: "detail"; problem: Problem }
  | { type: "add" }
  | { type: "added"; problem: Problem } // "what now?" right after a create
  | { type: "edit"; problem: Problem }
  | { type: "review"; problem: Problem };

// The delete dialog is tracked separately from `modal` because it can appear
// *on top of* one (confirming a delete from inside the detail card). It holds
// the pending promise's `resolve` so a click can answer the awaiting caller.
interface DeleteState {
  itemName: string;
  resolve: (result: boolean) => void;
}

export default function Layout() {
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [deleteState, setDeleteState] = useState<DeleteState | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // A ref, not state: bumping it must not trigger a render, and two toasts fired
  // in the same tick still need distinct keys.
  const nextToastId = useRef(0);

  const closeModal = useCallback(() => setModal({ type: "none" }), []);

  const notify = useCallback(
    (message: string, variant: ToastVariant = "success") => {
      const id = (nextToastId.current += 1);
      setToasts((list) => [...list, { id, message, variant }]);
    },
    [],
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  // Turns an imperative "are you sure?" into a promise: opening the dialog stashes
  // the resolver, and answering it (below) settles the promise the caller awaits.
  const confirmDelete = useCallback(
    (itemName: string) =>
      new Promise<boolean>((resolve) => setDeleteState({ itemName, resolve })),
    [],
  );

  const answerDelete = (result: boolean) => {
    deleteState?.resolve(result);
    setDeleteState(null);
  };

  // Memoized so the context value's identity is stable across renders (avoids
  // needlessly re-rendering every consumer). The action callbacks never change.
  const ctx: AppContextValue = useMemo(
    () => ({
      reloadToken,
      refresh: () => setReloadToken((t) => t + 1),
      openDetail: (problem) => setModal({ type: "detail", problem }),
      openAdd: () => setModal({ type: "add" }),
      openEdit: (problem) => setModal({ type: "edit", problem }),
      openReview: (problem) => setModal({ type: "review", problem }),
      confirmDelete,
      notify,
    }),
    [reloadToken, confirmDelete, notify],
  );

  return (
    <AppContext.Provider value={ctx}>
      <NavBar />
      <main className="page">
        <Outlet />
      </main>

      {modal.type === "detail" && (
        <Modal onClose={closeModal} labelledBy="problem-detail-title">
          <ProblemDetail problem={modal.problem} onClose={closeModal} />
        </Modal>
      )}

      {modal.type === "add" && (
        <Modal onClose={closeModal} labelledBy="problem-form-title">
          {/* Swaps itself for the "what now?" notice instead of just closing. */}
          <ProblemForm
            onClose={closeModal}
            onCreated={(problem) => setModal({ type: "added", problem })}
          />
        </Modal>
      )}

      {modal.type === "added" && (
        <Modal onClose={closeModal} labelledBy="added-notice-title">
          <AddedNotice problem={modal.problem} onClose={closeModal} />
        </Modal>
      )}

      {modal.type === "edit" && (
        <Modal onClose={closeModal} labelledBy="problem-form-title">
          <ProblemForm problem={modal.problem} onClose={closeModal} />
        </Modal>
      )}

      {modal.type === "review" && (
        <Modal onClose={closeModal} labelledBy="review-modal-title">
          <ReviewModal problem={modal.problem} onClose={closeModal} />
        </Modal>
      )}

      {/* Rendered last so it stacks above any open modal. */}
      {deleteState && (
        <DeleteDialog
          itemName={deleteState.itemName}
          onConfirm={() => answerDelete(true)}
          onCancel={() => answerDelete(false)}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </AppContext.Provider>
  );
}
