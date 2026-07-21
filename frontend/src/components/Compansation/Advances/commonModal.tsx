import React from "react";
import { X } from "lucide-react";
import { useScreenSize } from "../../../hooks/useScreenSize";

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ children, onClose }) => {
  const { isDesktop } = useScreenSize();
  const isMobile = !isDesktop;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
      />

      {/* Container */}
      <div
        className={
          isMobile
            ? "flex items-start justify-start h-full"
            : "flex min-h-full items-center justify-center p-4"
        }
      >
        <div
          className={
            isMobile
              ? "relative bg-white w-full h-full max-w-none max-h-none rounded-none overflow-y-auto"
              : "relative bg-white rounded-lg shadow-xl w-full max-w-[75rem] overflow-y-auto max-h-[90vh]"
          }
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-600 bg-white rounded-full shadow-md"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Body */}
          <div className="overflow-y-auto h-full">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
