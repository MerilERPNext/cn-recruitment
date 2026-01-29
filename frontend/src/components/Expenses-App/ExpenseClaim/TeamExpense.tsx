import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import ApprovalList from "../../shared/ApprovalList";
import CardTable from "../../shared/CardTable";
import useCurrentUser from "../../../hooks/useCurrentUser";
import ExpenseApprovalCard from "./ExpenseApprovalCard";
import { TeamExpenseDetailView } from "./TeamExpenseDetailView";
import { Typography } from "../../shared/atoms/Typography";

const TeamExpense = () => {
  const { data: currentUser } = useCurrentUser();
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const navigate = useNavigate();
  const [isBulkSelectEnabled, setIsBulkSelectEnabled] = useState(true);

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
        "Expense Category",
        "Claimed Amount",
        "Due Date",
        "Status",
        "Actions",
      ]
    : [
        "Employee",
        "Expense Category",
        "Claimed Amount",
        "Due Date",
        "Status",
        "Actions",
      ];

  const tableColumnWidths = isBulkSelectEnabled
    ? ["0.5fr", "1.25fr", "1.25fr", "1.25fr", "1.25fr", "1.25fr", "2fr"]
    : ["1.25fr", "1.25fr", "1.25fr", "1.25fr", "1.25fr", "2fr"];

  return (
    <div className="max-h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="border-gray-100">
          <div className="px-6 py-4">
            <Typography variant="h4">Team Expense Claims</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage team expense claim requests
            </Typography>
          </div>
        </div>
        <div className="px-4">
          <CardTable titles={tableTitles} columnWidths={tableColumnWidths}>
            {currentUser?.name ? (
              <ApprovalList
                doctype={"Expense Claim"}
                status={"Draft"}
                refetch={refetchApprovalList}
                onApprovalRefetchComplete={handleApprovalRefetchComplete}
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
                    options: ["Draft", "Approved", "Rejected"],
                  },
                ]}
                renderCardContent={(item) => (
                  <ExpenseApprovalCard
                    isSelected={item?.isSelected}
                    onToggleSelect={item?.onToggleSelect}
                    data={item?.data}
                    onAction={item?.onAction}
                    onClick={(request: any) => handleRequestClick(request)}
                    loadingAction={item?.loadingAction}
                    showCheckbox={isBulkSelectEnabled}
                  />
                )}
              />
            ) : null}
          </CardTable>
        </div>
      </div>
      {requestId && (
        <TeamExpenseDetailView
          documentName={requestId}
          label="Expense Claim"
          onClose={handleCloseModal}
          onAction={handleActionComplete}
        />
      )}
    </div>
  );
};

export default TeamExpense;
