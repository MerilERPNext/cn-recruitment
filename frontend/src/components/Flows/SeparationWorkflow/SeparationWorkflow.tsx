import React, { useEffect } from "react";
import { useGetSeparationFunnelDetails } from "../../../hooks/useSeparation";
import { useNavigate } from "react-router-dom";
import HeaderBar from "../../HeaderBar";
import WorkflowTable from "../FlowRequests/FlowDetails/WorkflowTable";
import NoDataFound from "../../shared/atoms/NoDataFound";
import SeparationWorkflowSkeleton from "./components/SeparationWorkflowSkeleton";

const SeparationWorkflow: React.FC = () => {
  const {
    data: separationFunnelDetails,
    refetch: refetchSeparationWorkflow,
    isLoading,
  } = useGetSeparationFunnelDetails();

  const navigate = useNavigate();

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

  return (
    <div>
      <HeaderBar
        title="Separation Workflow"
        onBack={() => navigate(-1)}
      />

      <div className="pt-8 pb-12">
        {isLoading ? (
          <SeparationWorkflowSkeleton rows={5} />
        ) : separationFunnelDetails?.data?.[0] ? (
          <WorkflowTable data={separationFunnelDetails?.data?.[0]} />
        ) : (
          <NoDataFound
            title="No Records Found"
            subtitle="No workflow records available."
          />
        )}
      </div>
    </div>
  );
};

export default SeparationWorkflow;
