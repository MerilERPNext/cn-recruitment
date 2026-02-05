import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentEmployee, useEmployee } from "../../../hooks/useEmployee";
import { useTargetUser } from "../../../context/ViewedUserContext";
import { TodoItem } from "../../../types/flows";
import DataListView from "../../DataListView";
import CardTable from "../../shared/CardTable";
import { Typography } from "../../shared/atoms/Typography";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import ApprovalTracker from "../Confirmation/Component/ApprovalTracker";
import HeaderBar from "../../HeaderBar";
import StatusBadge from "../../shared/atoms/statusBadge";
import { useScreenSize } from "../../../hooks/useScreenSize";

const titles = [
  "Request ID",
  "Initiated On",
  "Due date",
  "Initiated By",
  "Initiated For",
  "Allocated To",
  "Approval Status",
];

const columnWidths = ["1fr 1fr 1fr 1fr 1fr 1fr 1fr"];

const FlowRequests: React.FC = () => {
  const { data: currentEmployee } = useCurrentEmployee();
  const { isDesktop } = useScreenSize();

  const { targetEmployeeId, isViewingOtherUser } = useTargetUser();
  const { data: targetEmployee } = useEmployee(targetEmployeeId);

  const activeEmployee = isViewingOtherUser ? targetEmployee : currentEmployee;
  const [details, setDetails] = useState(null);
  const navigate = useNavigate();
  const handleShowDetails = (data: any) => {
    // setDetails(data);
    navigate("/webapp/flow-app/flow-request/" + data?.todo_id);
  };

  if (details) {
    return (
      <div>
        <HeaderBar onBack={() => setDetails(null)} />
        <ApprovalTracker For="Employee Separation" data={details} />
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full">
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
            queryKey={["employee-flows", activeEmployee?.name || ""]}
            customAPI={{
              method: "cn_leave_shift_managment.api.get_open_approval_todos",
              params: {
                doctype: "employee",
              },
            }}
            ItemComponent={(props: { item: TodoItem }) => {
              return (
                <MyFlowRequestCard
                  handleShowDetails={handleShowDetails}
                  request={props?.item}
                />
              );
            }}
            // onRefetchComplete={handleMyRequestsRefetchComplete}
            // refetchTrigger={refetchMyRequestsList || refetchAttendance}
            isSearch={true}
            isFilter={true}
            // filterFields={[
            //   {
            //     fieldname: "status",
            //     label: "Status",
            //     fieldtype: "Select",
            //     options: ["Open", "Approved", "Rejected"],
            //   },
            // ]}
            pageSize={10}
            showRefreshButton={false}
            orderBy="modified desc"
            showPagination={true}
            infiniteScroll={true}
            loadMorePagination={false}
          />
        </CardTable>
      </div>
    </div>
  );
};

export default FlowRequests;

const MyFlowRequestCard = ({
  request,
  handleShowDetails,
}: {
  request: TodoItem;
  handleShowDetails: (data: any) => void;
}) => {
  const { isDesktop } = useScreenSize();
  return (
    isDesktop ? (
      <div
        onClick={() => handleShowDetails(request)}
        style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr 1fr" }}
        className="grid max-w-screen items-center gap-4 px-6 h-16 border-b border-gray-50 transition-colors cursor-pointer hover:bg-primary/10"
      >
        <Typography variant="bodySmall" className="font-medium text-center">
          {request.todo_id}
        </Typography>
        <Typography variant="bodySmall" className="font-medium text-center">
          {formatToIndianDate(request?.reference_document?.creation)}
        </Typography>
        <Typography variant="bodySmall" className="font-medium text-center">
          {request.due_date.replace(/-/g, "/")}
        </Typography>
        <Typography variant="bodySmall" className="font-medium text-center">
          {request.reference_name}
        </Typography>
        <Typography variant="bodySmall" className="font-medium text-center">
          {request.username}
        </Typography>
        <Typography variant="bodySmall" className="font-medium text-center">
          {request.allocated_to}
        </Typography>
        <div className="flex items-center justify-center">
          <StatusBadge status={request.status} />
        </div>
      </div>
    ) : (
      <div
        onClick={() => handleShowDetails(request)}
        className="rounded-2xl shadow-sm  border-t-4 border-x-1 border-b-1 border-x-primary/20 border-b-primary/20  shadow-sm border-primary mb-3"
      >
        <div className="p-4">
          {/* Header with Title and Status Badge */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 pr-3">
              <Typography variant="mobileCardTitle">
                {request.reference_name || "-"}
              </Typography>
              <Typography variant="mobileCardSubtitle" className="mt-0.5 block">
                {request.todo_id}
              </Typography>
            </div>
            <StatusBadge status={request.status} />
          </div>

          {/* Request Details */}
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex justify-between">
              <div className="flex flex-col gap-2">
                <Typography variant="mobileCardLabel" className="block">
                  TRIGGER EVENT
                </Typography>
                <Typography variant="mobileCardValue">
                  {request.reference_document?.workflow_state || "-"}
                </Typography>
              </div>

              <div className="flex flex-col gap-2 text-right">
                <Typography variant="mobileCardLabel" className="block">
                  INITIATED DATE
                </Typography>
                <Typography variant="mobileCardValue">
                  {formatToIndianDate(request?.reference_document?.creation)}
                </Typography>
              </div>
            </div>

            <div className="flex justify-between">
              <div className="flex flex-col gap-2">
                <Typography variant="mobileCardLabel" className="block">
                  APPROVAL STATUS
                </Typography>
                <Typography variant="mobileCardValue">
                  {request.allocated_to || "-"}
                </Typography>
              </div>

              <div className="flex flex-col gap-2 text-right">
                <Typography variant="mobileCardLabel" className="block">
                  CUSTOM/FLOW STATUS
                </Typography>
                <Typography variant="mobileCardValue">
                  {request.status}
                </Typography>
              </div>
            </div>
          </div>

          {/* Last Updated Footer */}
          <div className="pt-3 border-t border-gray-100">
            <Typography variant="mobileCardFooter">
              Last Updated on {formatToIndianDate(request?.reference_document?.modified || request?.reference_document?.creation)}
            </Typography>
          </div>
        </div>
      </div>
    )

  );
};
