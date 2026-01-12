import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import ApprovalList from "../shared/ApprovalList";
import CardTable from "../shared/CardTable";
import useCurrentUser from "../../hooks/useCurrentUser";
import { LeaveDetailView } from "./LeaveDetails";
import LeaveApprovalCard from "./LeaveApprovalCard";
import { Typography } from "../shared/atoms/Typography";

const TeamLeaveRequest = () => {
  const { data: currentUser } = useCurrentUser();
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(true);

  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const navigate = useNavigate();

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

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
    setRefetchApprovalList(true);
  }, [setSearchParams]);

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
      <div className="min-h-screen">
        <div className=" px-2">
          <div className="flex justify-between items-center md:pt-4 mb-2 border-b-1 border-gray-200">
            <Typography variant="subheading">Team Leave Requests</Typography>
          </div>

          <CardTable titles={tableTitles} columnWidths={finalColumnWidths}>
            {currentUser?.name ? (
              <ApprovalList
                doctype={"Leave Application"}
                refetch={refetchApprovalList}
                setRefetch={setRefetchApprovalList}
                onApprovalRefetchComplete={handleApprovalRefetchComplete}
                pageSize={10}
                status={"Open"}
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
                    options: ["Open", "Approved", "Rejected"],
                  },
                ]}
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
