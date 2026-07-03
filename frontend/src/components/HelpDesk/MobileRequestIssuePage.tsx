import React from "react";
import RequestIssueModal from "./RequestIssueModal";
import { useNavigateBack } from "../../hooks/useNavigateBack";

const MobileRequestIssuePage: React.FC = () => {
  const navigateBack = useNavigateBack();

  const handleClose = () => {
    navigateBack();
  };

  return (
    <RequestIssueModal
      isOpen={true}
      onClose={handleClose}
      onSuccess={handleClose}
    />
  );
};

export default MobileRequestIssuePage;
