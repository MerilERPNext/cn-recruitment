import React from "react";
import { useRequestLeaveModal } from "./RequestLeaveModalContext";
import RequestLeave from "./RequestLeave";
import { LeaveRequestRefreshProvider } from "./LeaveRequestRefreshContext";

const GlobalLeaveRequestModal: React.FC = () => {
    const { showModal, closeModal } = useRequestLeaveModal();

    if (!showModal) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto relative">
                <LeaveRequestRefreshProvider>
                    <RequestLeave
                        onCancel={closeModal}
                        onSuccess={closeModal}
                    />
                </LeaveRequestRefreshProvider>
            </div>
        </div>
    );
};

export default GlobalLeaveRequestModal;
