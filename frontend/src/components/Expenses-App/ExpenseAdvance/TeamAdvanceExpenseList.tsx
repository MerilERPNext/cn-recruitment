import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import ApprovalList from "../../shared/ApprovalList";
import CardTable from "../../shared/CardTable";
import useCurrentUser from "../../../hooks/useCurrentUser";
import TeamAdvanceDetailView from "./TeamAdvanceDetailView";
import AdvanceApprovalCard from "./AdvanceApprovalCard";
import { Typography } from "../../shared/atoms/Typography";

const TeamAdvanceExpenseList = () => {
  const { data: currentUser } = useCurrentUser();
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(true);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestId = searchParams.get("requestId");

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const handleRequestClick = useCallback(
    (request: any) => {
      if (request?.todo_id) {
        setSearchParams({ requestId: request.todo_id });
      }
    },
    [setSearchParams],
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
        "Department",
        "Advance Amount",
        "Due Date",
        "Status",
        "Actions",
      ]
    : [
        "Employee",
        "Department",
        "Advance Amount",
        "Due Date",
        "Status",
        "Actions",
      ];

  const tableColumnWidths = isBulkSelectEnabled
    ? ["0.5fr", "1fr", "1fr", "1fr", "1fr", "1fr", "1fr"]
    : ["1fr", "1fr", "1fr", "1fr", "1fr", "1fr"];

  return (
    <div className="max-h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="border-gray-100">
          <div className="px-6 py-4">
            <Typography variant="h4">Team Advance Requests</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage team advance expense requests
            </Typography>
          </div>
        </div>
        <div className="px-4">
          <CardTable titles={tableTitles} columnWidths={tableColumnWidths}>
            {currentUser?.name && (
              <ApprovalList
                doctype={"Employee Advance"}
                refetch={refetchApprovalList}
                onApprovalRefetchComplete={handleApprovalRefetchComplete}
                pageSize={10}
                infiniteScroll={true}
                showPagination={true}
                loadMorePagination={false}
                isSearch={true}
                isFilter={true}
                columnWidths={tableColumnWidths}
                onBulkSelectVisibilityChange={setIsBulkSelectEnabled}
                filterFields={[
                  {
                    fieldname: "status",
                    label: "Status",
                    fieldtype: "Select",
                    options: ["Pending", "Approved", "Rejected"],
                  },
                ]}
                defaultFilters={{ status: "Pending" }}
                renderCardContent={(item) => (
                  <AdvanceApprovalCard
                    data={item?.data}
                    isSelected={item?.isSelected}
                    onToggleSelect={item?.onToggleSelect}
                    loadingAction={item?.loadingAction}
                    isBulkSelectEnabled={isBulkSelectEnabled}
                    onClick={(request: any) => handleRequestClick(request)}
                    onAction={item?.onAction}
                  />
                )}
              />
            )}
          </CardTable>
        </div>
      </div>
      {requestId && (
        <TeamAdvanceDetailView
          documentName={requestId}
          label="Employee Advance"
          onClose={handleCloseModal}
          onAction={handleActionComplete}
        />
      )}
    </div>
  );
};

export default TeamAdvanceExpenseList;
