import React from "react";
import { useScreenSize } from "../../hooks/useScreenSize";
import { LeaveRequestRefreshProvider } from "./LeaveRequestRefreshContext";
import RequestLeave from "./RequestLeave";
import { useRequestLeaveModal } from "./RequestLeaveModalContext";

const GlobalLeaveRequestModal: React.FC = () => {
  const { showModal, closeModal } = useRequestLeaveModal();
  const { isDesktop } = useScreenSize();

  if (!showModal) return null;

  if (!isDesktop) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col">
        <LeaveRequestRefreshProvider>
          <RequestLeave onCancel={closeModal} onSuccess={closeModal} />
        </LeaveRequestRefreshProvider>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto relative">
        <LeaveRequestRefreshProvider>
          <RequestLeave onCancel={closeModal} onSuccess={closeModal} />
        </LeaveRequestRefreshProvider>
      </div>
    </div>
  );
};

export default GlobalLeaveRequestModal;
