import React, { useEffect } from "react";
import { FlowRequestItem } from "../../../types/flows";
import CardTable from "../../shared/CardTable";
import { Typography } from "../../shared/atoms/Typography";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import FlowRequestCard from "./FlowRequestCard";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import DataListView from "../../DataListView";

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


  const navigate = useNavigate();
  const handleShowDetails = (data: FlowRequestItem) => {
    navigate("/webapp/flow-app/flow-request/" + data?.request_id);
  };

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
  }, [queryClient]);

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

            <DataListView
              queryKey={"flow-requests"}
              customAPI={{
                method: "cn_hrms_core.cn_hrms_core.apis.funnel_activity.get_funnel_activity_details",
                paginationKeys: {
                  startKey: "page",
                  pageLengthKey: "limit",
                },
                paginationType: "page",
                responseKeys: {
                  dataKey: "data",
                  totalCountKey: "total",
                  pageLengthKey: "limit",
                  startKey: "page",
                },
                params: {
                  doctype: "Employee"
                }
              }}
              renderItem={(item) => {
                return (
                  <FlowRequestCard
                    request={item as FlowRequestItem}
                    handleShowDetails={handleShowDetails}
                  />
                );
              }}
              isSearch={true}
              searchFields={["flow_name", "flow_category", "initiated_by"]}
              getItemKey={(item) => item.request_id}
              pageSize={10}
              SkeletonComponent={CardSkeleton}
              isFilter={true}
              filterFields={[
                {
                  fieldname: "approval_status",
                  label: "Approval Status",
                  fieldtype: "Select",
                  options: ["Pending", "Approved", "Rejected"],
                },
                {
                  fieldname: "overall_flow_status",
                  label: "Overall Flow Status",
                  fieldtype: "Select",
                  options: ["Pending", "Completed"],
                },
              ]}
            />
          </CardTable>
        </div>
      </div>
    </>
  );
};

export default FlowRequests;
