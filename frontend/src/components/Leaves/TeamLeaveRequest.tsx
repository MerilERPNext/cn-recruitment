import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import ApprovalList from "../shared/ApprovalList";
import CardTable from "../shared/CardTable";
import useCurrentUser from "../../hooks/useCurrentUser";
import { LeaveDetailView } from "./LeaveDetails";
import LeaveApprovalCard from "./LeaveApprovalCard";
import { Typography } from "../shared/atoms/Typography";
import { useScreenSize } from "../../hooks/useScreenSize";
import { CardSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";

const TeamLeaveRequest = () => {
  const { data: currentUser } = useCurrentUser();
  const { isDesktop } = useScreenSize();
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(true);

  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const navigate = useNavigate();

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();

  const requestId = searchParams.get("requestId");

  const handleRequestClick = useCallback(
    (request: any) => {
      if (request?.todo_id) {
        setSearchParams({ requestId: request.todo_id });
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

  const tableTitles = isBulkSelectEnabled
    ? [
        "Select",
        "Employee",
        "Leave Type",
        "From Date",
        "To Date",
        "Due Date",
        "Leave Days",
        "Status",
        "ACTIONS",
      ]
    : [
        "Employee",
        "Leave Type",
        "From Date",
        "To Date",
        "Due Date",
        "Leave Days",
        "Status",
        "ACTIONS",
      ];

  const finalColumnWidths = isBulkSelectEnabled
    ? ["0.5fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"]
    : ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"];

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
              showPagination={true}
              infiniteScroll={true}
              loadMorePagination={false}
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
                    { label: "Pending", value: "Open" },
                    { label: "Approved", value: "Approved" },
                    { label: "Rejected", value: "Rejected" },
                  ],
                },
              ]}
              defaultFilters={{ status: "Open" }}
              orderBy="from_date desc"
              SkeletonComponent={CardSkeleton}
              renderCardContent={(item) => (
                <LeaveApprovalCard
                  isSelected={item?.isSelected}
                  onToggleSelect={item?.onToggleSelect}
                  data={item?.data}
                  onAction={item?.onAction}
                  onClick={(request: any) => handleRequestClick(request)}
                  loadingAction={item?.loadingAction}
                  isBulkSelectEnabled={isBulkSelectEnabled}
                />
              )}
            />
          ) : null}
        </CardTable>
      </div>
      {requestId && (
        <LeaveDetailView
          documentName={requestId}
          label="Leave Application"
          onClose={handleCloseModal}
          onAction={handleActionComplete}
        />
      )}
    </div>
  );
};

export default TeamLeaveRequest;
