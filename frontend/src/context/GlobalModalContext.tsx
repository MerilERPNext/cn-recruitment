import React, { createContext, useCallback, useContext, useState } from "react";

/**
 * All modal keys that the global search bar can trigger.
 * Each key matches the `modal_key` value stored in the
 * Modular Ui Action Role Permission List rows on the backend.
 */
export type GlobalModalKey =
  | "request-leave"
  | "attendance-request"
  | "planned-overtime"
  | "shift-change"
  | "create-loan"
  | "create-advance"
  | "initiate-flow"
  | "initiate-separation"
  | "helpdesk-request";

type GlobalModalContextType = {
  activeModal: GlobalModalKey | null;
  openGlobalModal: (key: GlobalModalKey) => void;
  closeGlobalModal: () => void;
};

const GlobalModalContext = createContext<GlobalModalContextType | undefined>(
  undefined,
);

export const GlobalModalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [activeModal, setActiveModal] = useState<GlobalModalKey | null>(null);

  const openGlobalModal = useCallback((key: GlobalModalKey) => {
    setActiveModal(key);
  }, []);

  const closeGlobalModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  return (
    <GlobalModalContext.Provider
      value={{ activeModal, openGlobalModal, closeGlobalModal }}
    >
      {children}
    </GlobalModalContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useGlobalModal = (): GlobalModalContextType => {
  const ctx = useContext(GlobalModalContext);
  if (!ctx) {
    throw new Error("useGlobalModal must be used within a GlobalModalProvider");
  }
  return ctx;
};
