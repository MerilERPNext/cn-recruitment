import React, { createContext, useContext, useRef } from "react";

type RefetchFn = () => void;
type LeaveRequestRefreshContextType = {
  setRefetch: (fn: RefetchFn) => void;
  triggerRefetch: () => void;
};

const LeaveRequestRefreshContext = createContext<
  LeaveRequestRefreshContextType | undefined
>(undefined);

export const LeaveRequestRefreshProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const refetchFn = useRef<RefetchFn | null>(null);

  const setRefetch = (fn: RefetchFn) => {
    refetchFn.current = fn;
  };

  const triggerRefetch = () => {
    if (refetchFn.current) refetchFn.current();
  };

  return (
    <LeaveRequestRefreshContext.Provider value={{ setRefetch, triggerRefetch }}>
      {children}
    </LeaveRequestRefreshContext.Provider>
  );
};
// eslint-disable-next-line react-refresh/only-export-components
export const useLeaveRequestRefresh = () => {
  const ctx = useContext(LeaveRequestRefreshContext);
  if (!ctx)
    throw new Error(
      "useLeaveRequestRefresh must be used within LeaveRequestRefreshProvider"
    );
  return ctx;
};
