import { useState, useCallback } from "react";
import { MyAttendanceRequest } from "../../../types/attendance";
import { useNavigate, useSearchParams } from "react-router";
import { AttendanceDetailView } from "../AttendanceDetails";

import ApprovalList from "../../shared/ApprovalList";
import ApprovalCard from "./ApprovalCard";
import CardTable from "../../shared/CardTable";
import useCurrentUser from "../../../hooks/useCurrentUser";
import CustomDropdown from "../../shared/CustomDropdown";

const STATUS_OPTIONS = [
  { label: "Pending", value: "Pending" },
  { label: "Approved", value: "Approved" },
  { label: "Rejected", value: "Rejected" },
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
    setRefetchApprovalList(true);
  }, [setSearchParams]);

  const handleStatusChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedStatus(event.target.value);
      setRefetchApprovalList(true);
    },
    []
  );

  const FilterDropdowns = () => (
    <div className="flex items-center gap-2">
      <CustomDropdown
        value={selectedStatus}
        onChange={handleStatusChange}
        options={STATUS_OPTIONS}
      />
    </div>
  );

  const isBulkSelectEnabled = selectedStatus === "Pending";

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
          <div className="flex justify-between items-center pt-4 mb-2 border-b-1 border-gray-200">
            <h2 className="base-title md:module-title pb-1">
              Team Attendance Requests
            </h2>
            <div className="flex items-center space-x-3 pb-1">
              <FilterDropdowns />
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
                showPagination={true}
                infiniteScroll={true}
                loadMorePagination={false}
                isSearch={true}
                isFilter={true}
                filterFields={[
                  {
                    fieldname: "status",
                    label: "Status",
                    fieldtype: "Select",
                    options: ["Pending", "Approved", "Rejected"],
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
                  <ApprovalCard
                    isSelected={item?.isSelected}
                    onToggleSelect={item?.onToggleSelect}
                    data={item?.data}
                    onAction={item?.onAction}
                    onClick={(request: MyAttendanceRequest) =>
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
