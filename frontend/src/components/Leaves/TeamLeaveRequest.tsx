import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import ApprovalList from "../shared/ApprovalList";
import CardTable from "../shared/CardTable";
import useCurrentUser from "../../hooks/useCurrentUser";
import { LeaveDetailView } from "./LeaveDetails";
import LeaveApprovalCard from "./LeaveApprovalCard";
import { ViewAll } from "../shared/atoms/ViewAll";

const TODO_STATUS_OPTIONS = [
  { label: "Pending", value: "Open" }, // Default option
  { label: "Approved", value: "Approved" },
  { label: "Cancelled", value: "Cancelled" },
];

const TeamLeaveRequest = () => {
  const { data: currentUser } = useCurrentUser();

  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const navigate = useNavigate();

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();

  // 1. Set the default selected status to "Open"
  const [selectedStatus, setSelectedStatus] = useState("Open");

  const requestId = searchParams.get("requestId");

  const handleRequestClick = useCallback(
    (request: any) => {
      if (request?.todo_id) {
        setSearchParams({ requestId: request.todo_id });
      }
    },
    [setSearchParams]
  );

  const handleCloseModal = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleActionComplete = useCallback(() => {
    setSearchParams({});
    setRefetchApprovalList(true);
  }, [setSearchParams]);

  // 2. Handler for the dropdown change
  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(event.target.value);
    setRefetchApprovalList(true); // Trigger refetch on filter change
  };

  const FilterDropdowns = () => (
    <div className="flex items-center gap-2">
      <select
        value={selectedStatus}
        onChange={handleStatusChange}
        className="border border-gray-300 rounded px-3 py-2 text-sm bg-gray-100"
      >
        {TODO_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  // 💡 NEW: Conditional titles and widths based on selectedStatus
  const isBulkSelectEnabled = selectedStatus === "Open";

  const tableTitles = isBulkSelectEnabled
    ? [
        "Select",
        "Employee",
        "From Date",
        "To Date",
        "Due Date",
        "Status",
        "Actions",
      ]
    : ["Employee", "From Date", "To Date", "Due Date", "Status", "Actions"];

  // Fix the columnWidths to match the number of titles:
  const finalColumnWidths = isBulkSelectEnabled
    ? ["0.5fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"] // 7 titles, 7 widths
    : ["1.5fr", "1fr", "1fr", "1fr", "1fr", "1fr"]; // 6 titles, 6 widths (Adjust 'Employee' width slightly)

  return (
    <>
      <div className="bg-white min-h-screen">
        <div className="bg-white px-2">
          {/* Pending: HEADER ROW */}
          <div className="flex justify-between pt-4 mb-2 border-b-1 border-gray-200">
            <h2 className="module-title pb-1">Team Leave Requests</h2>

            {/* 💡 REVISED Dropdown Group: Moved to the right-hand side 💡 */}
            <div className="flex items-center space-x-3 pb-1">
              <FilterDropdowns />

              <ViewAll
                title="View All"
                onClick={() =>
                  navigate("/webapp/leave-app/leave-requests/pending")
                }
              />
            </div>
            {/* End REVISED Dropdown Group */}
          </div>
          {/* End HEADER ROW */}

          <CardTable titles={tableTitles} columnWidths={finalColumnWidths}>
            {currentUser?.name ? (
              <ApprovalList
                doctype={"Leave Application"}
                refetch={refetchApprovalList}
                setRefetch={setRefetchApprovalList}
                onApprovalRefetchComplete={handleApprovalRefetchComplete}
                pageSize={10}
                status={selectedStatus}
                showPagination={false}
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
      </div>

      {requestId && (
        <LeaveDetailView
          documentName={requestId}
          label="Leave Application"
          onClose={handleCloseModal}
          onAction={handleActionComplete}
        />
      )}
    </>
  );
};

export default TeamLeaveRequest;
