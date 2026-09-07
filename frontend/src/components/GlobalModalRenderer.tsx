/**
 * GlobalModalRenderer
 *
 * Mounted once in App.tsx. Listens to GlobalModalContext and renders
 * the correct modal component when the global search bar triggers one.
 *
 * ADDING A NEW MODAL:
 *   1. Add its key to GlobalModalKey in GlobalModalContext.tsx
 *   2. Add the matching case below
 *   3. Set modal_key on the backend Action row in Frappe desk
 *
 * NOTE: "request-leave" is already handled by RequestLeaveModalProvider
 * (which has its own openModal() API). We delegate to it here so the
 * search bar doesn't need to know about that separate context.
 */

import React, { useCallback, useMemo } from "react";
import { useGlobalModal } from "../context/GlobalModalContext";
import { useTargetUser } from "../context/ViewedUserContext";
import { useCurrentEmployeeDetails } from "../hooks/useEmployee";
import { useRequestLeaveModal } from "./Leaves/RequestLeaveModalContext";

// Lazy-import modals that are heavy — keeps the initial bundle small
import {
  getDefinitionByFilter,
  useChatTrigger,
  useDifinitaionNameForSeparation,
} from "../hooks/useFlows";
import AttendanceRequestFormV2 from "./Attendance/AttendanceRequest/AttendanceRequestFormV2";
import CreateOvertimeRequest from "./Attendance/OvertimeRequests/CreateOvertimeRequest";
import AdvanceForm from "./Compansation/Advances/AdvanceForm";
import Modal from "./Compansation/Advances/commonModal";
import CreateLoanDialog from "./Compansation/Loan/component/CreateLoanDailog";
import InitiateFlow from "./Flows/Initiate/InitiateFlow";
import RequestIssueModal from "./HelpDesk/RequestIssueModal";
import ShiftRequestFormModal from "./ShiftRequest/ShiftRequestFormModal";

/** Simple full-screen overlay wrapper for modals that don't have their own */
const Overlay: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({
  onClose,
  children,
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    onMouseDown={(e) => e.target === e.currentTarget && onClose()}
  >
    <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      {children}
    </div>
  </div>
);

const GlobalModalRenderer: React.FC = () => {
  const { activeModal, closeGlobalModal } = useGlobalModal();

  // "request-leave" delegates to the existing dedicated context
  const { openModal: openLeaveModal } = useRequestLeaveModal();

  // employee context needed by some modals
  const { data: user } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const { targetEmployeeId } = useTargetUser();
  const effectiveEmployeeId = targetEmployeeId || user?.employee;

  // "initiate-separation" needs a chat trigger
  const { data: definitionName } = useDifinitaionNameForSeparation();
  const { triggerChat } = useChatTrigger("Loading separation form...");
  const separationDefinition = useMemo(
    () =>
      getDefinitionByFilter(definitionName, { triggerCategory: "Separation" }),
    [definitionName],
  );

  // Delegate request-leave to its own provider (already lifted above app tree)
  React.useEffect(() => {
    if (activeModal === "request-leave") {
      openLeaveModal();
      closeGlobalModal();
    }
  }, [activeModal, openLeaveModal, closeGlobalModal]);

  const handleInitiateSeparation = useCallback(() => {
    if (!effectiveEmployeeId || !separationDefinition?.name) return;
    triggerChat({
      doctype_name: "Employee",
      document_name: effectiveEmployeeId,
      definition_name: separationDefinition.name,
      l: "true",
    });
    closeGlobalModal();
  }, [
    triggerChat,
    effectiveEmployeeId,
    separationDefinition,
    closeGlobalModal,
  ]);

  // Trigger separation chat as a side effect when this modal key becomes active
  React.useEffect(() => {
    if (activeModal === "initiate-separation") {
      handleInitiateSeparation();
    }
  }, [activeModal, handleInitiateSeparation]);

  if (!activeModal) return null;

  switch (activeModal) {
    case "request-leave":
      // handled by the useEffect above
      return null;

    case "initiate-separation":
      // handled by the useEffect above
      return null;

    case "attendance-request":
      return (
        <Overlay onClose={closeGlobalModal}>
          <AttendanceRequestFormV2 onClose={closeGlobalModal} />
        </Overlay>
      );

    case "planned-overtime":
      return (
        <Overlay onClose={closeGlobalModal}>
          <CreateOvertimeRequest onCancel={closeGlobalModal} />
        </Overlay>
      );

    case "shift-change":
      return (
        <ShiftRequestFormModal
          isOpen
          onClose={closeGlobalModal}
          className="h-full"
        />
      );

    case "create-loan":
      return <CreateLoanDialog isOpen onClose={closeGlobalModal} />;

    case "create-advance":
      return (
        <Modal onClose={closeGlobalModal}>
          <AdvanceForm user={user} onClose={closeGlobalModal} />
        </Modal>
      );

    case "initiate-flow":
      return <InitiateFlow handleCloseModel={closeGlobalModal} />;

    case "helpdesk-request":
      return <RequestIssueModal isOpen onClose={closeGlobalModal} />;

    default:
      return null;
  }
};

export default GlobalModalRenderer;
