import React, { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useScreenSize } from "../../hooks/useScreenSize";

interface BottomDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

const BottomDrawer: React.FC<BottomDrawerProps> = ({
  isOpen,
  onClose,
  children,
  className = "",
}) => {
  const { isDesktop } = useScreenSize();

  if (typeof window === "undefined") return null;

  // === Desktop Modal ===
  if (isDesktop) {
    return createPortal(
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
          isOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onMouseDown={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black bg-opacity-50 z-40" />

        {/* Modal Container */}
        <div
          className={`relative z-50 bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-auto transform transition-transform duration-300 ${
            isOpen ? "scale-100" : "scale-95"
          } ${className}`}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="p-6">{children}</div>
        </div>
      </div>,
      document.body
    );
  }

  // === Mobile Bottom Drawer ===
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 z-40 ${
          isOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg transition-transform duration-300 z-50 pt-2 flex flex-col max-h-[100dvh] ${
          isOpen ? "translate-y-0" : "translate-y-full"
        } ${className}`}
      >
        <div className="px-4 flex-1 flex flex-col min-h-0">{children}</div>
      </div>
    </>,
    document.body
  );
};

export default BottomDrawer;
