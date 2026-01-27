import React from "react";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useRequestLeaveModal } from "./RequestLeaveModalContext";
import RequestLeave from "./RequestLeave";

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
