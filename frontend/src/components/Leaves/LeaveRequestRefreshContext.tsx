import React, { createContext, useContext, useRef } from "react";

type RefetchFn = () => void;

type LeaveRequestRefreshContextType = {
  setRefetch: (fn: RefetchFn) => () => void;
  triggerRefetch: () => void;
};

const LeaveRequestRefreshContext = createContext<
  LeaveRequestRefreshContextType | undefined
>(undefined);

export const LeaveRequestRefreshProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const refetchFns = useRef<Set<RefetchFn>>(new Set());

  const setRefetch = (fn: RefetchFn) => {
    refetchFns.current.add(fn);
    return () => refetchFns.current.delete(fn);
  };

  const triggerRefetch = () => {
    refetchFns.current.forEach((fn) => fn());
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
