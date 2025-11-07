import { useState, useCallback } from "react";
import { AttendanceRequest } from "../../../types/attendance";
import { AttendanceDetailView } from "../AttendanceDetails";
import LayoutHeader from "../../shared/LayoutHeader";
import { useNavigate, useSearchParams } from "react-router";
import ApprovalList from "../../shared/ApprovalList";
import ApprovalCard from "./ApprovalCard";
import CardTable from "../../shared/CardTable";
import HeaderBar from "../../HeaderBar";
import { useScreenSize } from "../../../hooks/useScreenSize";

const ALL_STATUS_OPTIONS = [
  { label: "Pending", value: "Pending" },
  { label: "Approved", value: "Approved" },
  { label: "Rejected", value: "Rejected" },
  { label: "Cancelled", value: "Cancelled" },
];

const AllPendingRequests = () => {
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);

  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const requestId = searchParams.get("requestId");

  const [selectedStatus, setSelectedStatus] = useState("Pending");

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const handleRequestClick = useCallback(
    (request: AttendanceRequest) => {
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
    // Trigger refetch after action
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
    <div>
      <LayoutHeader
        tab={"Team Attendance Requests"}
        onBack={() => {
          navigate(-1);
        }}
        children={<FilterDropdowns />}
      />
      {isDesktop && (
        <HeaderBar
          title={"Team Leave Requests"}
          onBack={() => navigate(-1)}
          rightSlot={<FilterDropdowns />}
        ></HeaderBar>
      )}
      <div className="p-2">
        <CardTable titles={tableTitles} columnWidths={tableColumnWidths}>
          <ApprovalList
            doctype={"Attendance Request"}
            pageSize={13}
            refetch={refetchApprovalList}
            onApprovalRefetchComplete={handleApprovalRefetchComplete}
            status={selectedStatus}
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
        </CardTable>
      </div>

      {requestId && (
        <AttendanceDetailView
          documentName={requestId}
          onClose={handleCloseModal}
          onAction={handleActionComplete}
        />
      )}
    </div>
  );
};

export default AllPendingRequests;
