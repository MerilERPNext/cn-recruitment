import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";

type LoadingOverlayContextType = {
  show: (message?: string) => void;
  hide: () => void;
  visible: boolean;
  wrap: <T>(fn: () => Promise<T>, message?: string) => Promise<T>;
};

const LoadingOverlayContext =
  createContext<LoadingOverlayContextType | null>(null);


export function LoadingOverlayProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("Performing Action...");

  const show = (msg = "Performing Action...") => {
    setMessage(() => {
      switch(msg.toLocaleLowerCase()){
        case "approve":
          return "Approving Request..."
        case "reject":
          return "Rejecting Request..."
        default:
          return msg;
      }
    });
    setVisible(true);
  };

  const hide = () => {
    setVisible(false);
  };

  const wrap = async <T,>(
    fn: () => Promise<T>,
    msg = "Working…"
  ): Promise<T> => {
    show(msg);
    try {
      return await fn();
    } finally {
      hide();
    }
  };

  return (
    <LoadingOverlayContext.Provider value={{ show, hide, wrap , visible }}>
      {children}

      {visible && (
        <div className="fixed inset-0 z-[9999] bg-black/20 backdrop-blur-sm flex items-center justify-center">
          <div className="rounded-lg bg-white px-6 py-4 shadow-xl flex items-center gap-3">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
            <span className="text-sm font-medium">{message}</span>
          </div>
        </div>
      )}
    </LoadingOverlayContext.Provider>
  );
}


// eslint-disable-next-line react-refresh/only-export-components
export const useLoadingOverlay = () => {
  const context = useContext(LoadingOverlayContext);
  if (!context) {
    throw new Error(
      "useLoadingOverlay must be used inside LoadingOverlayProvider"
    );
  }
  return context;
};
