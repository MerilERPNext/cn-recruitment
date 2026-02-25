import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { MyPlannedAttendanceRequest } from "../../../types/attendance";
import ApprovalList from "../../shared/ApprovalList";
import { Typography } from "../../shared/atoms/Typography";
import CardTable from "../../shared/CardTable";
import { CardSkeleton } from "../../shared/molecules/Skeletons/TableSkeleton";
import { MyOvertimeDetails } from "./MyOvertimeRequestDetails";
import OvertimeApprovalCard from "./OvertimeApprovalCard";

const TeamOvertimeRequests = () => {
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(true);

  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();

  const { data: currentUser } = useCurrentUser();

  const [searchParams, setSearchParams] = useSearchParams();
  const requestId = searchParams.get("requestId");

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const handleRequestClick = useCallback(
    (request: MyPlannedAttendanceRequest) => {
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
    ? ["Select", "Employee", "Description", "Due Date", "Status", "ACTIONS"]
    : ["Employee", "Description", "Due Date", "Status", "ACTIONS"];

  const tableColumnWidths = isBulkSelectEnabled
    ? ["0.5fr", "1fr", "1.5fr", "1fr", "1fr", "1fr"]
    : ["1fr", "1.5fr", "1fr", "1fr", "1fr"];

  return (
    <div className="flex flex-col h-full">
      {isDesktop && (
        <div className="flex-shrink-0">
          <div className="px-6 py-1 md:py-4">
            <Typography variant="h4">Team Overtime Requests</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage team overtime requests
            </Typography>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        <CardTable titles={tableTitles} columnWidths={tableColumnWidths}>
          {currentUser?.name && (
            <ApprovalList
              doctype="Planned Overtime Request"
              pageSize={10}
              refetch={refetchApprovalList}
              setRefetch={setRefetchApprovalList}
              infiniteScroll={false}
              loadMorePagination={false}
              showPagination={true}
              onApprovalRefetchComplete={handleApprovalRefetchComplete}
              isSearch={true}
              isFilter={true}
              columnWidths={tableColumnWidths}
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
              SkeletonComponent={CardSkeleton}
              defaultFilters={{ status: "Open" }}
              renderCardContent={(item) => (
                <OvertimeApprovalCard
                  isSelected={item?.isSelected}
                  onToggleSelect={item?.onToggleSelect}
                  data={item?.data}
                  onAction={item?.onAction}
                  onClick={(request: MyPlannedAttendanceRequest) =>
                    handleRequestClick(request)
                  }
                  loadingAction={item?.loadingAction}
                  isBulkSelectEnabled={isBulkSelectEnabled}
                />
              )}
            />
          )}
        </CardTable>
      </div>
      {requestId && (
        <MyOvertimeDetails
          documentName={requestId}
          onClose={handleCloseModal}
          onAction={handleActionComplete}
        />
      )}
    </div>
  );
};

export default TeamOvertimeRequests;
