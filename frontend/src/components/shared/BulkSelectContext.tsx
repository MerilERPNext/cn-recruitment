/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createContext,
  useContext,
  useState,
  useRef,
  ReactNode,
  Dispatch,
  SetStateAction,
} from "react";

// Plain data only — no function references. Keeping functions out of state
// prevents the sync-effect → re-render → effect loop in ApprovalList.
export interface BulkSelectState {
  selectedIds: string[];
  allRequests: any[];
  isEnabled: boolean;
  bulkLoading: { action: "Approve" | "Reject"; isLoading: boolean } | null;
}

// Callbacks are stored in a ref so ApprovalList can update them on every
// render without triggering a state change (and therefore no re-render cascade).
export interface BulkSelectCallbacks {
  onSelectAll: () => void;
  onBulkAction: (action: "Approve" | "Reject") => void;
}

interface BulkSelectContextValue {
  state: BulkSelectState | null;
  setState: Dispatch<SetStateAction<BulkSelectState | null>>;
  callbacksRef: { current: BulkSelectCallbacks | null };
}

const BulkSelectContext = createContext<BulkSelectContextValue | null>(null);

export function BulkSelectProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BulkSelectState | null>(null);
  const callbacksRef = useRef<BulkSelectCallbacks | null>(null);
  return (
    <BulkSelectContext.Provider value={{ state, setState, callbacksRef }}>
      {children}
    </BulkSelectContext.Provider>
  );
}

export const useBulkSelectContext = () => useContext(BulkSelectContext);
