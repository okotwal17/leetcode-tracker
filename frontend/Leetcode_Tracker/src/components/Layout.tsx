// The app shell: it owns all the cross-page state (which modal is open, and the
// reload token) and hands it to the rest of the tree through AppContext. Pages
// render into <Outlet/>. Because the modals live here — above the router — any
// page can open the same detail/add/edit dialog by calling a context action.
import { useCallback, useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import NavBar from "./NavBar";
import Modal from "./Modal";
import ProblemDetail from "./ProblemDetail";
import ProblemForm from "./ProblemForm";
import { AppContext, type AppContextValue } from "../app/appContext";
import type { Problem } from "../types";

// Exactly one dialog can be open at a time, so a discriminated union models the
// state better than a pile of booleans — the compiler forces us to handle each.
type ModalState =
  | { type: "none" }
  | { type: "detail"; problem: Problem }
  | { type: "add" }
  | { type: "edit"; problem: Problem };

export default function Layout() {
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [reloadToken, setReloadToken] = useState(0);

  const closeModal = useCallback(() => setModal({ type: "none" }), []);

  // Memoized so the context value's identity is stable across renders (avoids
  // needlessly re-rendering every consumer). The action callbacks never change.
  const ctx: AppContextValue = useMemo(
    () => ({
      reloadToken,
      refresh: () => setReloadToken((t) => t + 1),
      openDetail: (problem) => setModal({ type: "detail", problem }),
      openAdd: () => setModal({ type: "add" }),
      openEdit: (problem) => setModal({ type: "edit", problem }),
    }),
    [reloadToken],
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
          <ProblemForm onClose={closeModal} />
        </Modal>
      )}

      {modal.type === "edit" && (
        <Modal onClose={closeModal} labelledBy="problem-form-title">
          <ProblemForm problem={modal.problem} onClose={closeModal} />
        </Modal>
      )}
    </AppContext.Provider>
  );
}
