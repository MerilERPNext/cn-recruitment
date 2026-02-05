import React, { ReactNode } from "react";
import { X } from "lucide-react";
import { useScreenSize } from "../../hooks/useScreenSize";

interface ExpenseFormModalProps {
  forMbileScreen?: boolean;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  forMbileScreen = false,
  isOpen,
  onClose,
  children,
  title = "Expense Form",
}) => {
  const { isDesktop } = useScreenSize();

  if (!isOpen) return null;

  // For mobile, return children without modal wrapper
  if (!isDesktop && !forMbileScreen) {
    return <>{children}</>;
  }

  // For desktop, render modal with blur background
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Dark blur background */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}

      <div className={`relative bg-white rounded-lg shadow-xl ${forMbileScreen ? "w-screen max-md:h-screen md:w-[70%] md:max-w-6xl md:max-h-[90vh] " : " w-[70%] max-w-6xl max-h-[90vh] "} flex flex-col z-10 border-white border-[5px]`}>
        {/* Modal header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Modal body - scrollable */}
        <div className="flex-grow overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export default ExpenseFormModal;
