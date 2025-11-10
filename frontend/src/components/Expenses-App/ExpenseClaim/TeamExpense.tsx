import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import ApprovalList from "../../shared/ApprovalList";
import CardTable from "../../shared/CardTable";
import useCurrentUser from "../../../hooks/useCurrentUser";
import ExpenseApprovalCard from "./ExpenseApprovalCard";
import { TeamExpenseDetailView } from "./TeamExpenseDetailView";

const TeamExpense = () => {
  const { data: currentUser } = useCurrentUser();
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("Draft");
  const navigate = useNavigate();

  const handleApprovalRefetchComplete = useCallback(() => {
    setRefetchApprovalList(false);
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();

  const requestId = searchParams.get("requestId");

  const handleRequestClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const handleStatusFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setStatusFilter(e.target.value);
      setRefetchApprovalList(true);
    },
    []
  );

  return (
    <>
      <div className="bg-white min-h-screen">
        <div className="bg-white px-2 md:p-6">
          <div className="flex justify-between items-center mb-2 border-b-1 border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 pb-1">
              Team Claims
            </h2>
            <div className="flex items-center gap-3 pb-1">
              <select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Draft">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>

              <button
                onClick={() => {
                  navigate("/webapp/expenses-app/team-requests/all");
                }}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View All
              </button>
            </div>
          </div>
          <CardTable
            titles={[
              ...(statusFilter === "Draft" ? ["Select"] : []),
              "Employee",
              "Expense Category",
              "Claimed Amount",
              "Due Date",
              "Status",
              "Actions",
            ]}
            columnWidths={[
              statusFilter === "Draft"
                ? "0.5fr 1.25fr 1.25fr 1.25fr 1.25fr 1.25fr 2fr"
                : "1.25fr 1.25fr 1.25fr 1.25fr 1.25fr 2fr",
            ]}
          >
            {currentUser?.name ? (
              <ApprovalList
                doctype={"Expense Claim"}
                status={statusFilter}
                refetch={refetchApprovalList}
                onApprovalRefetchComplete={handleApprovalRefetchComplete}
                pageSize={10}
                showPagination={false}
                renderCardContent={(item) => (
                  <ExpenseApprovalCard
                    isSelected={item?.isSelected}
                    onToggleSelect={item?.onToggleSelect}
                    data={item?.data}
                    onAction={item?.onAction}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onClick={(request: any) => handleRequestClick(request)}
                    loadingAction={item?.loadingAction}
                    showCheckbox={statusFilter === "Draft"}
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
    </>
  );
};

export default TeamExpense;
