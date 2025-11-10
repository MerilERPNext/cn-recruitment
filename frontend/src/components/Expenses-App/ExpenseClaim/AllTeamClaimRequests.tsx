import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useScreenSize } from "../../../hooks/useScreenSize";
import LayoutHeader from "../../shared/LayoutHeader";
import { IoChevronBackOutline } from "react-icons/io5";
import CardTable from "../../shared/CardTable";
import ApprovalList from "../../shared/ApprovalList";
import ExpenseApprovalCard from "./ExpenseApprovalCard";
import TeamExpenseDetailView from "./TeamExpenseDetailView";

const AllTeamClaimRequests = () => {
  const [refetch, setRefetch] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("Draft");

  const navigate = useNavigate();
  const { refetchAttendance } = useGlobalStore();
  const { isDesktop } = useScreenSize();

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
    // Trigger refetch after action
    setRefetch(true);
  }, [setSearchParams]);

  // Handle status filter change
  const handleStatusFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setStatusFilter(e.target.value);
      setRefetch(true);
    },
    []
  );

  return (
    <div>
      <LayoutHeader
        tab={"All team Claim Requests"}
        onBack={() => {
          navigate(-1);
        }}
      />
      {isDesktop && (
        <div className="flex justify-between items-center p-4">
          <button onClick={() => navigate(-1)}>
            <IoChevronBackOutline />
          </button>
          <h4 className="font-semibold">Team Expense Claim Requests</h4>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Draft">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      )}

      <div className="p-4 pt-0">
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
          <ApprovalList
            doctype={"Expense Claim"}
            status={statusFilter}
            pageSize={10}
            refetch={refetchAttendance || refetch}
            onApprovalRefetchComplete={() => {
              setRefetch(false);
            }}
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
        </CardTable>
      </div>
      {requestId && (
        <TeamExpenseDetailView
          documentName={requestId}
          onClose={handleCloseModal}
          onAction={handleActionComplete}
        />
      )}
    </div>
  );
};

export default AllTeamClaimRequests;
