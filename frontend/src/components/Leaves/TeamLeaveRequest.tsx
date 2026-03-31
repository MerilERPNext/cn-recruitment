import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import useCurrentUser from "../../hooks/useCurrentUser";
import { useScreenSize } from "../../hooks/useScreenSize";
import ApprovalList from "../shared/ApprovalList";
import { Typography } from "../shared/atoms/Typography";
import CardTable from "../shared/CardTable";
import { CardSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";
import LeaveApprovalCard from "./LeaveApprovalCard";
import { LeaveDetailView } from "./LeaveDetails";

const TeamLeaveRequest = () => {
  const { data: currentUser } = useCurrentUser();
  const { isDesktop } = useScreenSize();
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(true);
  const [activeStatus, setActiveStatus] = useState("Open");

  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const navigate = useNavigate();

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();

  const requestId = searchParams.get("requestId");
  const referenceName = searchParams.get("reference_name");

  const handleRequestClick = useCallback(
    (request: any) => {
      if (request?.todo_id) {
        setSearchParams({
          requestId: request.todo_id,
          reference_name: request?.reference_document?.name || "",
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
    ? (isRejectedFilter
      ? [
        "Select", "Leave Id", "Employee", "Leave Type", "From Date", "To Date", "Due Date", "Leave Days", "Status", "Reject Reason", "ACTIONS",
      ]
      : [
        "Select", "Leave Id", "Employee", "Leave Type", "From Date", "To Date", "Due Date", "Leave Days", "Status", "ACTIONS",
      ])
    : (isRejectedFilter
      ? [
        "Leave Id", "Employee", "Leave Type", "From Date", "To Date", "Due Date", "Leave Days", "Status", "Reject Reason", "ACTIONS",
      ]
      : [
        "Leave Id", "Employee", "Leave Type", "From Date", "To Date", "Due Date", "Leave Days", "Status", "ACTIONS",
      ]);

  const finalColumnWidths = isBulkSelectEnabled
    ? (isRejectedFilter
      ? ["0.5fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1.5fr", "1fr"]
      : ["0.5fr", "1fr", "1.5fr", "1.5fr", "1.5fr", "1.5fr", "1fr", "1fr", "1fr", "1fr"])
    : (isRejectedFilter
      ? ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1.5fr", "1fr"]
      : ["1fr", "1.5fr", "1.5fr", "1.5fr", "1.5fr", "1fr", "1fr", "1fr", "1fr"]);

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
        <CardTable titles={tableTitles} columnWidths={finalColumnWidths}>
          {currentUser?.name ? (
            <ApprovalList
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
              filterFields={[
                {
                  fieldname: "status",
                  label: "Status",
                  fieldtype: "Select",
                  options: [
                    { label: "Pending", key: "Open", value: "Open", customAPIParams: { todo_status: "Open" } },
                    {
                      label: "Approved",
                      key: "Approved",
                      value: ["in", ["Draft", "Approved", "Open", "Pending"]],
                      customAPIParams: { todo_status: "Closed" }
                    },
                    { label: "Rejected", key: "Rejected", value: "Rejected" },
                  ],
                },
              ]}
              defaultFilters={{ status: "Open" }}
              orderBy="creation desc"
              SkeletonComponent={CardSkeleton}
              renderCardContent={(item) => {
                if (item?.data?.custom_selected_doctype_action === "Send Back") {
                  return null;
                }
                return <LeaveApprovalCard
                  isSelected={item?.isSelected}
                  onToggleSelect={item?.onToggleSelect}
                  data={item?.data}
                  onAction={item?.onAction}
                  onClick={(request: any) => handleRequestClick(request)}
                  loadingAction={item?.loadingAction}
                  isBulkSelectEnabled={isBulkSelectEnabled}
                  showRejectReason={isRejectedFilter}
                />
              }}
              onActiveFiltersChange={(filters) => {
                setActiveStatus(filters.status || "Open");
              }}
            />
          ) : null}
        </CardTable>
      </div>
      {(requestId || referenceName) && (
        <LeaveDetailView
          documentName={requestId || undefined}
          referenceName={referenceName || undefined}
          label="Leave Application"
          onClose={handleCloseModal}
          onAction={handleActionComplete}
        />
      )}
    </div>
  );
};

export default TeamLeaveRequest;
