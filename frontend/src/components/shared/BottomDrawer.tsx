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
  className = ''
}) => {
  const { isDesktop } = useScreenSize();

  if (typeof window === "undefined") return null;

  // On desktop, render as centered modal instead of bottom drawer
  if (isDesktop) {
    return createPortal(
      <>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 z-40 ${
            isOpen ? "opacity-100 visible" : "opacity-0 invisible"
          }`}
          onClick={onClose}
        />

        {/* Desktop Modal */}
        <div
          className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${
            isOpen ? "opacity-100 visible" : "opacity-0 invisible"
          }`}
        >
          <div
            className={`bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-auto transform transition-transform duration-300 ${
              isOpen ? "scale-100" : "scale-95"
            } ${className}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">{children}</div>
          </div>
        </div>
      </>,
      document.body
    );
  }

  // Mobile bottom drawer
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 z-40 ${
          isOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={onClose}
      />

      {/* Mobile Drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg transition-transform duration-300 z-50 pt-2 ${
          isOpen ? "translate-y-0" : "translate-y-full"
        } ${className}`}
      >
        <div className="px-4 pb-6">{children}</div>
      </div>
    </>,
    document.body
  );
};

export default BottomDrawer;
