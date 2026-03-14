import React, { useEffect } from "react";
import { useGetSeparationWorkflow as useGetSeparationWorkflowData } from "../../../hooks/useSeparation";
import { useNavigate } from "react-router-dom";
import HeaderBar from "../../HeaderBar";
import WorkflowTable from "../RequestDetails/WorkflowTable";

const SeparationWorkflow: React.FC = () => {
  const { data: separationWorkflowDat, refetch: refetchSeparationWorkflow } =
    useGetSeparationWorkflowData();
  console.log({ separationWorkflowDat });
  // const { id } = useParams();
  // const { data: separationWorkflow, refetch: refetchSeparationWorkflow } =
  //   useGetSeparationWorkflow("Employee Separation", id || "");
  // const { data: separationFunnelData } = useGetSeparationFunnelData(id || "");
  // const { mutateAsync: getSessionForChatnextAction } =
  //   usePostSelectEventFromOptions();

  useEffect(() => {
    const handleChatClose = () => {
      refetchSeparationWorkflow();
    };

    document.addEventListener("chatnext:modal:chat:close", handleChatClose);

    return () => {
      document.removeEventListener(
        "chatnext:modal:chat:close",
        handleChatClose,
      );
    };
  }, [refetchSeparationWorkflow]);

  const navigate = useNavigate();

  return (
    <div>
      <HeaderBar
        title="Separation Workflow"
        onBack={() => navigate(-1)}
        className="md:!z-[60]"
      />
      {separationWorkflowDat?.data?.[0] && (
        <WorkflowTable data={separationWorkflowDat?.data?.[0]} />
      )}
    </div>
  );
};

export default SeparationWorkflow;
