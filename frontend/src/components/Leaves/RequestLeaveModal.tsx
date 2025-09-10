import React from "react";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useRequestLeaveModal } from "./RequestLeaveModalContext";
import RequestLeave from "./RequestLeave";
import { X } from "lucide-react";

interface RequestLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const RequestLeaveModal: React.FC<RequestLeaveModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { isDesktop } = useScreenSize();
  const { closeModal } = useRequestLeaveModal();

  if (!isOpen || !isDesktop) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative bg-white shadow-xl w-[70%] max-w-6xl max-h-[90vh] flex flex-col z-10 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-20">
          <h2 className="text-lg font-semibold text-gray-800">Request Leave</h2>
          <button
            onClick={() => {
              onClose();
              closeModal();
            }}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <RequestLeave
            onSuccess={onSuccess}
            onCancel={() => {
              onClose();
              closeModal();
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default RequestLeaveModal;
