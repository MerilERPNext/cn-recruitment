import React, { createContext, useContext, useState } from "react";

type RequestLeaveDefaults = {
  fromDate?: string;
  toDate?: string;
  leaveType?: string;
  source?: "holiday" | "other";
};
type RequestLeaveModalContextType = {
  showModal: boolean;
  openModal: (defaults?: RequestLeaveDefaults) => void;
  closeModal: () => void;
  defaults: RequestLeaveDefaults | null;
};

const RequestLeaveModalContext = createContext<
  RequestLeaveModalContextType | undefined
>(undefined);

export const RequestLeaveModalProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [showModal, setShowModal] = useState(false);
  const [defaults, setDefaults] = useState<RequestLeaveDefaults | null>(null);
  const openModal = (data?: RequestLeaveDefaults) => {
    setDefaults(data || null);
    setShowModal(true);
  };
  const closeModal = () => setShowModal(false);

  return (
    <RequestLeaveModalContext.Provider
      value={{ showModal, openModal, closeModal, defaults }}
    >
      {children}
    </RequestLeaveModalContext.Provider>
  );
};

export const useRequestLeaveModal = (): RequestLeaveModalContextType => {
  const context = useContext(RequestLeaveModalContext);
  if (!context) {
    throw new Error(
      "useRequestLeaveModal must be used within a RequestLeaveModalProvider"
    );
  }
  return context;
};
