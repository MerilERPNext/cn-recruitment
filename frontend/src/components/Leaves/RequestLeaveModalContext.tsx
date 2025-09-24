import React, { createContext, useContext, useState } from "react";
type RequestLeaveDefaults = {
  fromDate?: string;
  toDate?: string;
  leaveType?: string;
  halfDay?: boolean;
  halfDayOption?: "First Half" | "Second Half";
  half_day_date?: string;
  custom_second_half_day_date?: string;
  description?: string;
  custom_reason?: string;
  custom_attachment?: { url: string }[];
  source?: "holiday" | "other";
  hideHalfDayToggle?: boolean;
  isEdit?: boolean;
  leave_application?: string;
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
// eslint-disable-next-line react-refresh/only-export-components
export const useRequestLeaveModal = (): RequestLeaveModalContextType => {
  const context = useContext(RequestLeaveModalContext);
  if (!context) {
    throw new Error(
      "useRequestLeaveModal must be used within a RequestLeaveModalProvider"
    );
  }
  return context;
};
