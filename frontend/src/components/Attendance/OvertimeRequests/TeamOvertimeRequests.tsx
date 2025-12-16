import { useState, useCallback } from "react";
import CardTable from "../../shared/CardTable";
import { useNavigate, useSearchParams } from "react-router";
import { MyPlannedAttendanceRequest } from "../../../types/attendance";
import ApprovalList from "../../shared/ApprovalList";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { MyOvertimeDetails } from "./MyOvertimeRequestDetails";
import OvertimeApprovalCard from "./OvertimeApprovalCard";
import CustomDropdown from "../../shared/CustomDropdown";

const STATUS_OPTIONS = [
  { label: "Pending", value: "Open" },
  { label: "Approved", value: "Approved" },
  { label: "Rejected", value: "Rejected" },
];

const TeamOvertimeRequests = () => {
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();

  const [selectedStatus, setSelectedStatus] = useState("Open");

  const handleStatusChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedStatus(event.target.value);
      setRefetchApprovalList(true);
    },
    []
  );

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const requestId = searchParams.get("requestId");

  const handleRequestClick = useCallback(
    (request: MyPlannedAttendanceRequest) => {
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
    ? ["Select", "Description", "Due Date", "Employee", "Status", "Actions"]
    : ["Description", "Due Date", "Employee", "Status", "Actions"];

  const tableColumnWidths = isBulkSelectEnabled
    ? ["5%", "35%", "8%", "10%", "8%", "20%"]
    : ["35%", "10%", "12%", "10%", "20%"];

  return (
    <div>
      <div className="bg-white min-h-screen">
        <div className="bg-white px-2">
          <div className="flex justify-between items-center pt-4 mb-2 border-b-1 border-gray-200 px-2">
            <h2 className="base-title md:module-title pb-1">
              Team Overtime Requests
            </h2>
            <div className="flex items-center space-x-3 pb-1">
              <FilterDropdowns />
            </div>
          </div>

          <CardTable titles={tableTitles} columnWidths={tableColumnWidths}>
            {currentUser?.name ? (
              <ApprovalList
                doctype={"Planned Overtime Request"}
                pageSize={10}
                refetch={refetchApprovalList}
                setRefetch={setRefetchApprovalList}
                status={selectedStatus}
                infiniteScroll={true}
                showPagination={true}
                loadMorePagination={false}
                onApprovalRefetchComplete={handleApprovalRefetchComplete}
                isSearch={true}
                isFilter={true}
                filterFields={[
                  {
                    fieldname: "status",
                    label: "Status",
                    fieldtype: "Select",
                    options: ["Open", "Approved", "Rejected"],
                  },
                  {
                    fieldname: "allocated_to",
                    label: "Allocated to",
                    fieldtype: "Data",
                  },
                  {
                    fieldname: "due_date",
                    label: "Due Date",
                    fieldtype: "Date",
                  },
                ]}
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
            ) : null}
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
