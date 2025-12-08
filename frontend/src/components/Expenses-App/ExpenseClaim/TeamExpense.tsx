import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import ApprovalList from "../../shared/ApprovalList";
import CardTable from "../../shared/CardTable";
import useCurrentUser from "../../../hooks/useCurrentUser";
import ExpenseApprovalCard from "./ExpenseApprovalCard";
import { TeamExpenseDetailView } from "./TeamExpenseDetailView";
import CustomDropdown from "../../shared/CustomDropdown";

interface Option {
  value: string;
  label: string;
}

const TeamExpense = () => {
  const { data: currentUser } = useCurrentUser();
  const [refetchApprovalList, setRefetchApprovalList] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("Draft");
  const navigate = useNavigate();
  const options: Option[] = [
    { value: "Draft", label: "Pending" },
    { value: "Approved", label: "Approved" },
    { value: "Rejected", label: "Rejected" },
  ];
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
        <div className="bg-white px-0 md:p-6">
          <div className="flex justify-between items-center mb-2 border-b-1 border-gray-200">
            <h2 className="base-title md:module-title pb-1">
              Team Expense Claims
            </h2>
            <div className="flex items-center gap-3 pb-1">
              <CustomDropdown
                options={options}
                value={statusFilter}
                onChange={handleStatusFilterChange}
              />
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
                showPagination={true}
                infiniteScroll={true}
                loadMorePagination={false}
                renderCardContent={(item) => (
                  <ExpenseApprovalCard
                    isSelected={item?.isSelected}
                    onToggleSelect={item?.onToggleSelect}
                    data={item?.data}
                    onAction={item?.onAction}
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
