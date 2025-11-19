import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import ApprovalList from "../shared/ApprovalList";
import CardTable from "../shared/CardTable";
import useCurrentUser from "../../hooks/useCurrentUser";
import { LeaveDetailView } from "./LeaveDetails";
import LeaveApprovalCard from "./LeaveApprovalCard";
import CustomDropdown from "../shared/CustomDropdown";

const STATUS_OPTIONS = [
  { label: "Pending", value: "Open" },
  { label: "Approved", value: "Approved" },
  { label: "Rejected", value: "Rejected" },
];

const TeamLeaveRequest = () => {
  const { data: currentUser } = useCurrentUser();

  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const navigate = useNavigate();

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();

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

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(event.target.value);
    setRefetchApprovalList(true);
  };

  const FilterDropdowns = () => (
    <div className="flex items-center gap-2">
      <CustomDropdown
        value={selectedStatus}
        onChange={handleStatusChange}
        options={STATUS_OPTIONS}
      />
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

  const finalColumnWidths = isBulkSelectEnabled
    ? ["0.5fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1.5fr"]
    : ["1.5fr", "1fr", "1fr", "1fr", "1fr", "1.5fr"];

  return (
    <>
      <div className="bg-white min-h-screen">
        <div className="bg-white px-2">
          <div className="flex justify-between pt-4 mb-2 border-b-1 border-gray-200">
            <h2 className="module-title pb-1">Team Leave Requests</h2>
            <div className="flex items-center space-x-3 pb-1">
              <FilterDropdowns />
            </div>
          </div>

          <CardTable titles={tableTitles} columnWidths={finalColumnWidths}>
            {currentUser?.name ? (
              <ApprovalList
                doctype={"Leave Application"}
                refetch={refetchApprovalList}
                setRefetch={setRefetchApprovalList}
                onApprovalRefetchComplete={handleApprovalRefetchComplete}
                pageSize={10}
                status={selectedStatus}
                showPagination={true}
                infiniteScroll={true}
                loadMorePagination={false}
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
