import { useState, useCallback } from "react";
import { MyAttendanceRequest } from "../../../types/attendance";
import { useNavigate, useSearchParams } from "react-router";
import { AttendanceDetailView } from "../AttendanceDetails";

import ApprovalList from "../../shared/ApprovalList";
import ApprovalCard from "./ApprovalCard";
import CardTable from "../../shared/CardTable";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { Typography } from "../../shared/atoms/Typography";

const TeamAttendanceDetails = () => {
  const { data: currentUser } = useCurrentUser();

  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(true);

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
      <div className="min-h-screen">
        <div className="px-4 mb-20">
          <div className="flex justify-between items-center pt-4 mb-2">
            <div className="flex flex-col mb-2">
              <Typography variant="h4">Team Attendance Requests</Typography>
              <Typography variant="bodySmall" color="body2">
                Track and manage team attendance requests
              </Typography>
            </div>
          </div>
          <CardTable titles={tableTitles} columnWidths={tableColumnWidths}>
            {currentUser?.name ? (
              <ApprovalList
                doctype={"Attendance Request"}
                refetch={refetchApprovalList}
                setRefetch={setRefetchApprovalList}
                onApprovalRefetchComplete={handleApprovalRefetchComplete}
                status={"Pending"}
                pageSize={10}
                showPagination={true}
                infiniteScroll={true}
                loadMorePagination={false}
                isSearch={true}
                isFilter={true}
                onBulkSelectVisibilityChange={setIsBulkSelectEnabled}
                filterFields={[
                  {
                    fieldname: "status",
                    label: "Status",
                    fieldtype: "Select",
                    options: ["Pending", "Approved", "Rejected"],
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
