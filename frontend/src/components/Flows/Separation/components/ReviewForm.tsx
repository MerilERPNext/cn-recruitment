import { X } from "lucide-react";
import React from "react";

interface ReviewFormProps {
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  headerAction?: React.ReactNode;
  showReqFormio?: boolean;
  footerAction?: React.ReactNode;
}

const ReviewForm = ({ onClose, children, title = "Review Form", headerAction, showReqFormio = false, footerAction }: ReviewFormProps) => {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 ${showReqFormio ? "show-req-astrik" : ""}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Modal Container */}
      <div className="w-full h-full md:h-auto md:max-w-xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <div className="flex items-center gap-2">
            {headerAction}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-2 pb-4">
          {children}
        </div>

        {/* Footer Area */}
        {footerAction && (
          <div className="px-4 py-3 border-t border-gray-200 bg-white shrink-0">
            {footerAction}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewForm;
