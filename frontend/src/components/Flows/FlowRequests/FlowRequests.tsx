import React, { useEffect, useState } from "react";
import { FlowRequestItem } from "../../../types/flows";
import CardTable from "../../shared/CardTable";
import { Typography } from "../../shared/atoms/Typography";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import { useGetFlowRequests } from "../../../hooks/useFlows";
import { StaticListView } from "../../ListView";
import FlowRequestCard from "./FlowRequestCard";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

const titles = [
  "Flow Name",
  "Category",
  "Initiated On",
  "Initiated By",
  "Initiated For",
  "Approval Status",
  // "Workflow Status",
  "Overall Flow Status",
];

const columnWidths = ["1fr 1fr 150px 150px 150px 150px 150px"];

const FlowRequests: React.FC = () => {
  const { isDesktop } = useScreenSize();

  const [flowDetails, setFlowDetails] = useState<FlowRequestItem | null>(null);
  const navigate = useNavigate();
  const handleShowDetails = (data: FlowRequestItem) => {
    navigate("/webapp/flow-app/flow-request/" + data?.request_id);
  };

  const {
    data: flowRequests,
    isLoading: flowRequestsLoading,
    refetch: refetchFlowRequests,
  } = useGetFlowRequests();


  // refresh request details page after fetching new flowDetails
  useEffect(() => {
    if (!flowDetails || flowRequestsLoading) return;
    const newDetails = flowRequests?.data.find(
      (d) => d.request_id === flowDetails.request_id,
    );
    if (!newDetails) {
      setFlowDetails(null);
    } else {
      setFlowDetails(newDetails);
    }
  }, [flowRequestsLoading, flowRequests, flowDetails]);

  const queryClient = useQueryClient();
  useEffect(() => {
    const handleChatClose = () => {
      queryClient.invalidateQueries({ queryKey: ["employee-flow-requests"] });
      queryClient.invalidateQueries({ queryKey: ["employee-flow-request-details"] });
    };

    document.addEventListener("chatnext:modal:chat:close", handleChatClose);

    return () => {
      document.removeEventListener(
        "chatnext:modal:chat:close",
        handleChatClose,
      );
    };
  }, [refetchFlowRequests, queryClient]);

  return (
    <>
      <div
        className="flex flex-col h-full overflow-auto"
      >

        {isDesktop && (
          <div className="flex-shrink-0">
            <div className="px-6 py-1 md:py-4">
              <Typography variant="h4">Flow Requests</Typography>
              <Typography variant="bodySmall" color="body2">
                Manage your Flows
              </Typography>
            </div>
          </div>
        )}

        {/*Flows List*/}
        <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
          <CardTable titles={titles} columnWidths={columnWidths}>
            <StaticListView
              data={flowRequests?.data || []}
              ItemComponent={(_, item) => {
                return (
                  <FlowRequestCard
                    request={item}
                    handleShowDetails={handleShowDetails}
                  />
                );
              }}
              isSearch={true}
              searchFields={["flow_name", "flow_category", "initiated_by"]}
              getItemKey={(item) => item.request_id}
              pageSize={10}
              SkeletonComponent={CardSkeleton}
              isLoading={flowRequestsLoading}
              isFilter={true}
              filterFields={[
                {
                  fieldname: "approval_status",
                  label: "Approval Status",
                  fieldtype: "Select",
                  options: ["Pending", "Approved", "Rejected"],
                },
                // {
                //   fieldname: "workflow_status",
                //   label: "Workflow Status",
                //   fieldtype: "Select",
                //   options: ["Pending", "Completed"],
                // },
                {
                  fieldname: "overall_flow_status",
                  label: "Overall Flow Status",
                  fieldtype: "Select",
                  options: ["Pending", "Completed"],
                },
              ]}
            // loadMorePagination={true}
            />
          </CardTable>
        </div>
      </div>
    </>
  );
};

export default FlowRequests;
