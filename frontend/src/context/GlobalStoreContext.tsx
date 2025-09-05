import { createContext, useReducer, ReactNode } from "react";

// --- Types ---
interface GlobalState {
  refetchAttendance: boolean;
}

type Action =
  | { type: "TOGGLE_REFETCH_ATTENDANCE" }
  | { type: "SET_REFETCH_ATTENDANCE"; payload: boolean };

export interface GlobalStore extends GlobalState {
  toggleRefetchAttendance: () => void;
  setRefetchAttendance: (value: boolean) => void;
}

// --- Initial State ---
const initialState: GlobalState = {
  refetchAttendance: false,
};

// --- Reducer ---
const reducer = (state: GlobalState, action: Action): GlobalState => {
  switch (action.type) {
    case "TOGGLE_REFETCH_ATTENDANCE":
      return { ...state, refetchAttendance: !state.refetchAttendance };
    case "SET_REFETCH_ATTENDANCE":
      return { ...state, refetchAttendance: action.payload };
    default:
      return state;
  }
};

// --- Context ---
const GlobalStoreContext = createContext<GlobalStore | undefined>(undefined);

// --- Provider ---
export const GlobalStoreProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const store: GlobalStore = {
    ...state,
    toggleRefetchAttendance: () =>
      dispatch({ type: "TOGGLE_REFETCH_ATTENDANCE" }),
    setRefetchAttendance: (value: boolean) =>
      dispatch({ type: "SET_REFETCH_ATTENDANCE", payload: value }),
  };

  return (
    <GlobalStoreContext.Provider value={store}>
      {children}
    </GlobalStoreContext.Provider>
  );
};

export default GlobalStoreContext;
