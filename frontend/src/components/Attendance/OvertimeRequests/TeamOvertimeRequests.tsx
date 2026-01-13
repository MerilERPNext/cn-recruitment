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

  const tableTitles = isBulkSelectEnabled
    ? ["Select", "Employee", "Description", "Due Date", "Status", "Actions"]
    : ["Employee", "Description", "Due Date", "Status", "Actions"];

  const tableColumnWidths = isBulkSelectEnabled
    ? ["5%", "10%", "35%", "8%", "8%", "20%"]
    : ["12%", "40%", "10%", "10%", "20%"];

  return (
    <div>
      <div className="min-h-screen">
        <div className="px-4">
          <div className="flex justify-between items-center pt-4 mb-2 border-b-1 border-gray-200 px-2">
            <div className="flex flex-col mb-2">
              <Typography variant="h4">Team Overtime Requests</Typography>
              <Typography variant="bodySmall" color="body2">
                Track and manage team overtime requests
              </Typography>
            </div>
          </div>

          <CardTable titles={tableTitles} columnWidths={tableColumnWidths}>
            {currentUser?.name ? (
              <ApprovalList
                doctype={"Planned Overtime Request"}
                pageSize={10}
                refetch={refetchApprovalList}
                setRefetch={setRefetchApprovalList}
                status="Open"
                infiniteScroll={true}
                showPagination={true}
                loadMorePagination={false}
                onApprovalRefetchComplete={handleApprovalRefetchComplete}
                isSearch={true}
                isFilter={true}
                onBulkSelectVisibilityChange={setIsBulkSelectEnabled}
                filterFields={[
                  {
                    fieldname: "status",
                    label: "Status",
                    fieldtype: "Select",
                    options: ["Open", "Approved", "Rejected"],
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
