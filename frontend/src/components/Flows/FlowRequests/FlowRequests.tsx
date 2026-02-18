import React, { useState } from "react";
import { FlowRequestItem } from "../../../types/flows";
import CardTable from "../../shared/CardTable";
import { Typography } from "../../shared/atoms/Typography";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import { useGetFlowRequests } from "../../../hooks/useFlows";
import { StaticListView } from "../../ListView";
import FlowRequestCard from "./FlowRequestCard";
import RequestDetails from "../RequestDetails/RequestDetails";

const titles = [
  "Request ID",
  "Flow Name",
  "Category",
  "Initiated On",
  "Initiated By",
  "Initiated For",
  "Approval Status",
  "Workflow Status",
  "Overall Flow Status"
];

const columnWidths = ["1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr"];

const FlowRequests: React.FC = () => {
  const { isDesktop } = useScreenSize();

  const [flowDetails, setFlowDetails] = useState<FlowRequestItem | null>(null);
  const handleShowDetails = (data: FlowRequestItem) => {
    // setSearchParams((prev) => ({
    //   ...Object.fromEntries(prev),
    //   todo_id: data.request_id,
    // }));
    setFlowDetails(data);
    // navigate("/webapp/flow-app/flow-request/" + data?.request_id);

  };

  const { data: flowRequests, isLoading: flowRequestsLoading } = useGetFlowRequests();

  const handleNavigateBack = () => {
    setFlowDetails(null);
  }

  if (flowDetails) {
    return (
      <RequestDetails data={flowDetails} handleNavigateBack={handleNavigateBack} />
    )
  }
  return (
    <div className="flex flex-col h-full">
      <div >
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
                return <FlowRequestCard request={item} handleShowDetails={handleShowDetails} />;
              }}
              isSearch={true}
              searchFields={["request_id", "flow_name", "flow_category"]}
              getItemKey={(item) => item.request_id}
              pageSize={20}
              SkeletonComponent={CardSkeleton}
              isLoading={flowRequestsLoading}
              loadMorePagination={true}
            />
          </CardTable>
        </div>
      </div>
    </div>
  );
};

export default FlowRequests;

