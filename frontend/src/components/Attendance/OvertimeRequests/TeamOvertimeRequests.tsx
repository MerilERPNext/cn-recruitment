import { useState, useCallback } from "react";
import CardTable from "../../shared/CardTable";
import { useNavigate, useSearchParams } from "react-router";
import { MyPlannedAttendanceRequest } from "../../../types/attendance";
import ApprovalList from "../../shared/ApprovalList";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { MyOvertimeDetails } from "./MyOvertimeRequestDetails";
import OvertimeApprovalCard from "./OvertimeApprovalCard";
import { Typography } from "../../shared/atoms/Typography";

const TeamOvertimeRequests = () => {
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(true);

  const navigate = useNavigate();
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
    <div className="max-h-screen flex flex-col">
      {/* ================= Scroll Container ================= */}
      <div className="flex-1 overflow-y-auto">
        {/* ================= Sticky Page Title ================= */}
        <div className="border-gray-100">
          <div className="px-6 py-4">
            <Typography variant="h4">Team Overtime Requests</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage team overtime requests
            </Typography>
          </div>
        </div>

        {/* ================= Table ================= */}
        <div className="px-4">
          <CardTable titles={tableTitles} columnWidths={tableColumnWidths}>
            {currentUser?.name && (
              <ApprovalList
                doctype="Planned Overtime Request"
                pageSize={10}
                refetch={refetchApprovalList}
                setRefetch={setRefetchApprovalList}
                infiniteScroll={true}
                showPagination={true}
                loadMorePagination={false}
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
