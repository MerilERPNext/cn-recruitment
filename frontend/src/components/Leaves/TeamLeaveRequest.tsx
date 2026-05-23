import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import useCurrentUser from "../../hooks/useCurrentUser";
import { useGetLeaveBalance } from "../../hooks/useLeaves";
import { useScreenSize } from "../../hooks/useScreenSize";
import ApprovalList from "../shared/ApprovalList";
import { FilterField } from "../DataListView";
import { Typography } from "../shared/atoms/Typography";
import CardTable from "../shared/CardTable";
import { BulkSelectProvider } from "../shared/BulkSelectContext";
import { CardSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";
import LeaveApprovalCard from "./LeaveApprovalCard";
import { LeaveDetailView } from "./LeaveDetails";
import { getCOLUMN_SORT_CONFIG_TEAM_LEAVE_REQUEST } from "../../utils/tableSortConfig";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { isActionEnabled } from "../../utils/uiPermission";

const TeamLeaveRequest = () => {
  const { data: currentUser } = useCurrentUser();
  const { isDesktop } = useScreenSize();
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(true);
  const [activeStatus, setActiveStatus] = useState("Open");

  const { data: currentEmployee } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const today = new Date().toISOString().split("T")[0];
  const { data: leaveBalanceData } = useGetLeaveBalance(
    currentEmployee?.name,
    today,
  );

  const uiPermission = {
    app: "Leaves and Holidays",
    page: "Team Requests",
    actionKey: "team_leave_request_actions"
  }
  const { data: uiPermissionData } = useGetUiPermission(uiPermission?.app);
  const actionsEdnabled = isActionEnabled(uiPermissionData, uiPermission?.actionKey ?? "", uiPermission?.page);


  // Build filter fields dynamically to include leave type options from balance API
  const dynamicFilterFields: FilterField[] = useMemo(() => {
    const leaveTypeOptions =
      leaveBalanceData?.leave_balance
        ?.filter((l) => l.dont_show_in_frontend !== 1)
        .map((l) => ({
          label: l.type,
          value: l.leave_id,
        })) ?? [];

    return [
      {
        fieldname: "status",
        label: "Status",
        fieldtype: "Select" as const,
        options: [
          {
            label: "Pending",
            key: "Open",
            value: "Open",
          },
          {
            label: "Approved",
            key: "Approved",
            value: ["in", ["Draft", "Approved", "Open", "Pending"]],
            customAPIParams: { todo_status: "Closed" },
          },
          { label: "Rejected", value: "Rejected" },
        ],
        emptyValueConfig: {
          filterValue: ["!=", "Cancelled"],
        },
      },
      {
        fieldname: "leave_type",
        label: "Leave Type",
        fieldtype: "Select" as const,
        options: leaveTypeOptions,
      },
      {
        fieldname: "from_date_start",
        label: "Start Date",
        fieldtype: "Date",
      },
      {
        fieldname: "from_date_end",
        label: "End Date",
        fieldtype: "Date",
      },
    ];
  }, [leaveBalanceData]);

  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const navigate = useNavigate();

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();

  const requestId = searchParams.get("requestId");
  const referenceName = searchParams.get("reference_name");
  const reasonName = searchParams.get("reason_name");

  const handleRequestClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (request: any) => {
      if (request?.todo_id) {
        setSearchParams({
          requestId: request.todo_id,
          reference_name: request?.reference_document?.name || "",
          reason_name: request?.reference_document?.reason_name || "",
        });
      }
    },
    [setSearchParams],
  );

  const handleCloseModal = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleActionComplete = useCallback(() => {
    setSearchParams({});
    setRefetchApprovalList(true);
  }, [setSearchParams]);

  const isRejectedFilter = activeStatus === "Rejected";

  const tableTitles = isBulkSelectEnabled
    ? isRejectedFilter
      ? [
        "Select",
        "Request Id",
        "Employee",
        "Leave Type",
        "From Date",
        "To Date",
        "Due Date",
        "Leave Days",
        "Status",
        "Reject Reason",
        "Actions",
      ]
      : [
        "Select",
        "Request Id",
        "Employee",
        "Leave Type",
        "From Date",
        "To Date",
        "Due Date",
        "Leave Days",
        "Status",
        "Actions",
      ]
    : isRejectedFilter
      ? [
        "Request Id",
        "Employee",
        "Leave Type",
        "From Date",
        "To Date",
        "Due Date",
        "Leave Days",
        "Status",
        "Reject Reason",
        "Actions",
      ]
      : [
        "Request Id",
        "Employee",
        "Leave Type",
        "From Date",
        "To Date",
        "Due Date",
        "Leave Days",
        "Status",
        "Actions",
      ];

  const finalColumnWidths = isBulkSelectEnabled
    ? isRejectedFilter
      ? [
        "0.5fr",
        "1fr",
        "1fr",
        "1fr",
        "1fr",
        "1fr",
        "1fr",
        "1fr",
        "1fr",
        "1.5fr",
        "1fr",
      ]
      : [
        "0.5fr",
        "1fr",
        "1.5fr",
        "1.5fr",
        "1.5fr",
        "1.5fr",
        "1fr",
        "1fr",
        "1fr",
        "1fr",
      ]
    : isRejectedFilter
      ? ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1.5fr", "1fr"]
      : ["1fr", "1.5fr", "1.5fr", "1.5fr", "1.5fr", "1fr", "1fr", "1fr", "1fr"];

  return (
    <div className="flex flex-col h-full">
      {isDesktop && (
        <div className="flex-shrink-0">
          <div className="px-6 py-1 md:py-4">
            <Typography variant="h4">Team Leave Requests</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage team leave requests
            </Typography>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        <BulkSelectProvider>
          <CardTable titles={tableTitles} columnWidths={finalColumnWidths}
            columnSortConfig={getCOLUMN_SORT_CONFIG_TEAM_LEAVE_REQUEST(
              isBulkSelectEnabled,
              isRejectedFilter
            )}
          >
            {currentUser?.name ? (
              <ApprovalList
                bulkSelectVisible={actionsEdnabled}
                doctype={"Leave Application"}
                refetch={refetchApprovalList}
                setRefetch={setRefetchApprovalList}
                onApprovalRefetchComplete={handleApprovalRefetchComplete}
                pageSize={10}
                infiniteScroll={false}
                loadMorePagination={false}
                showPagination={true}
                isSearch={true}
                isFilter={true}
                columnWidths={finalColumnWidths}
                onBulkSelectVisibilityChange={setIsBulkSelectEnabled}
                filterFields={dynamicFilterFields}
                defaultFilters={{ status: "Open" }}
                SkeletonComponent={CardSkeleton}
                renderCardContent={(item) => {
                  if (
                    item?.data?.custom_selected_doctype_action === "Send Back"
                  ) {
                    return null;
                  }
                  return (
                    <LeaveApprovalCard
                      actionsEdnabled={actionsEdnabled}
                      isSelected={item?.isSelected}
                      onToggleSelect={item?.onToggleSelect}
                      data={item?.data}
                      onAction={item?.onAction}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      onClick={(request: any) => handleRequestClick(request)}
                      loadingAction={item?.loadingAction}
                      isBulkSelectEnabled={isBulkSelectEnabled}
                      showRejectReason={isRejectedFilter}
                      isActed={item?.isActed}
                    />
                  );
                }}
                onActiveFiltersChange={(filters) => {
                  setActiveStatus(filters.status || "Open");
                }}
              />
            ) : null}
          </CardTable>
        </BulkSelectProvider>
      </div>
      {(requestId || referenceName) && (
        <LeaveDetailView
          actionsEdnabled={actionsEdnabled}
          documentName={requestId || undefined}
          referenceName={referenceName || undefined}
          label="Leave Application"
          onClose={handleCloseModal}
          onAction={handleActionComplete}
          reasonName={reasonName || undefined}
        />
      )}
    </div>
  );
};

export default TeamLeaveRequest;
