import { useState, useCallback } from "react";
import { MyAttendanceRequest } from "../../../types/attendance";
import { useNavigate, useSearchParams } from "react-router";
import { AttendanceDetailView } from "../AttendanceDetails";

import ApprovalList from "../../shared/ApprovalList";
import ApprovalCard from "./ApprovalCard";
import CardTable from "../../shared/CardTable";
import useCurrentUser from "../../../hooks/useCurrentUser";

const ALL_STATUS_OPTIONS = [
  { label: "Pending", value: "Pending" },
  { label: "Approved", value: "Approved" },
  { label: "Rejected", value: "Rejected" },
  { label: "Cancelled", value: "Cancelled" },
];

const TeamAttendanceDetails = () => {
  const { data: currentUser } = useCurrentUser();

  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedStatus, setSelectedStatus] = useState("Pending");

  const requestId = searchParams.get("requestId");

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const handleRequestClick = useCallback(
    (request: MyAttendanceRequest) => {
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
    // Trigger refetch of both lists after action
    setRefetchApprovalList(true);
  }, [setSearchParams]);

  // Handler for the dropdown change
  const handleStatusChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedStatus(event.target.value);
      setRefetchApprovalList(true); // Trigger refetch
    },
    []
  );

  // Filter component
  const FilterDropdowns = () => (
    <div className="flex items-center gap-2">
      <select
        value={selectedStatus}
        onChange={handleStatusChange}
        className="border border-gray-300 rounded px-3 py-2 text-sm bg-gray-100"
      >
        {ALL_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  // 2. Logic for Bulk Approval changes
  const isBulkSelectEnabled = selectedStatus === "Pending";

  // 3. Conditional titles/widths for CardTable
  const tableTitles = isBulkSelectEnabled
    ? [
        "Select",
        "Employeee",
        "Explanation",
        "From Date",
        "To Date",
        "Due Date",
        "Status",
        "Actions",
      ]
    : [
        "Employeee",
        "Explanation",
        "From Date",
        "To Date",
        "Due Date",
        "Status",
        "Actions",
      ];

  const tableColumnWidths = isBulkSelectEnabled
    ? ["5%", "10%", "15%", "8%", "8%", "8%", "10%", "20%"]
    : ["12%", "20%", "10%", "10%", "10%", "10%", "20%"];

  return (
    <>
      <div className="bg-white min-h-screen">
        <div className="bg-white px-2">
          {/* Pending */}

          <div className="flex justify-between pt-4 mb-2 border-b-1 border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 pb-1">
              Team Attendance Requests
            </h2>
            <div className="flex items-center space-x-3 pb-1">
              <FilterDropdowns />
              <button
                onClick={() => {
                  navigate(
                    "/webapp/attendance/team-attendance-requests/pendings"
                  );
                }}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View All
              </button>
            </div>
          </div>
          <CardTable titles={tableTitles} columnWidths={tableColumnWidths}>
            {currentUser?.name ? (
              <ApprovalList
                doctype={"Attendance Request"}
                refetch={refetchApprovalList}
                setRefetch={setRefetchApprovalList}
                onApprovalRefetchComplete={handleApprovalRefetchComplete}
                status={selectedStatus}
                pageSize={10}
                showPagination={false}
                renderCardContent={(item) => (
                  <ApprovalCard
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
        <AttendanceDetailView
          documentName={requestId}
          onClose={handleCloseModal}
          onAction={handleActionComplete}
        />
      )}
    </>
  );
};

export default TeamAttendanceDetails;
