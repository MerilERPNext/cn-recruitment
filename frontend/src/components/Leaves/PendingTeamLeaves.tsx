import { useCallback, useState } from "react";
import ApprovalList from "../shared/ApprovalList";
import { useNavigate, useSearchParams } from "react-router";
import CardTable from "../shared/CardTable";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import LeaveApprovalCard from "./LeaveApprovalCard";
import { LeaveDetailView } from "./LeaveDetails";
import HeaderBar from "../HeaderBar";

const PENDING_STATUS_OPTIONS = [
  { label: "Pending", value: "Open" },
  { label: "Approved", value: "Approved" },
  { label: "Cancelled", value: "Cancelled" },
];

const PendingTeamLeaves = () => {
  const [refetch, setRefetch] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("Open");
  const navigate = useNavigate();
  const { refetchAttendance } = useGlobalStore();

  const [searchParams, setSearchParams] = useSearchParams();

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
    setRefetch(true);
  }, [setSearchParams]);

  // Handler for the dropdown change
  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(event.target.value);
    setRefetch(true); // Trigger refetch on filter change
  };

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetch(false);
  }, []);

  const FilterDropdowns = () => (
    <div className="flex items-center gap-2">
      <select
        value={selectedStatus}
        onChange={handleStatusChange}
        className="border border-gray-300 rounded px-3 py-2 text-sm bg-gray-100"
      >
        {PENDING_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

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
    <div className="flex flex-col min-h-screen bg-white absolute inset-0 z-50">
      <HeaderBar
        title={"Team Leave Requests"}
        onBack={() => navigate(-1)}
        rightSlot={<FilterDropdowns />}
      ></HeaderBar>

      <div className="bg-white px-4 pt-2 flex-1 overflow-y-auto mb-20">
        <CardTable titles={tableTitles} columnWidths={finalColumnWidths}>
          <ApprovalList
            doctype={"Leave Application"}
            pageSize={13}
            // Use logical OR for refetching state
            refetch={refetchAttendance || refetch}
            onApprovalRefetchComplete={handleApprovalRefetchComplete}
            // 4. Pass the selected status to the 'status' prop
            status={selectedStatus}
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

export default PendingTeamLeaves;
