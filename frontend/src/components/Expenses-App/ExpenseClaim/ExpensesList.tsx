
import React from "react";
import CardTable from "../../shared/CardTable";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import ExpenseClaimDetailsModal from "./ExpenseClaimDetailsModal";
import Tooltip from "../../shared/Tooltip";
import DataListView from "../../DataListView";
import { useCurrentEmployee } from "../../../hooks/useEmployee";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { ApprovalStage } from "../../../types/expenseAdvance";

const EXPENSE_STATUS_OPTIONS = [
  { label: "Pending", value: "Draft" },
  { label: "Approved", value: "Approved" },
  { label: "Rejected", value: "Rejected" },
];

const getStatusBadgeClasses = (status: string) => {
  switch (status) {
    case "Approved":
      return "bg-green-100 text-green-800";
    case "Draft":
      return "bg-yellow-100 text-yellow-800";
    case "Rejected":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const ExpensesItem: React.FC<{ item: any }> = ({ item }) => {
  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(item?.reference_document?.total_claimed_amount ?? 0);

  const formattedDate = item?.reference_document?.creation
    ? new Date(item?.reference_document?.creation).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : " - ";

  return (
    <div className="rounded-xl my-1 border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <p className="text-xl font-bold text-gray-900">
            {formattedAmount}
            {item?.reference_document?.custom_expense_category && (
              <span>{` (${item?.reference_document?.custom_expense_category})`}</span>
            )}
          </p>
        </div>
        {item?.reference_document?.status && (
          <span
            className={`px-3 py-1 rounded-2xl text-xs font-medium ${getStatusBadgeClasses(
              item?.reference_document?.status
            )}`}
          >
            {item?.reference_document?.status === "Draft"
              ? "Pending"
              : item?.reference_document?.status}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500">
        <span>Submitted on {formattedDate}</span>
      </p>
    </div>
  );
};

const ExpensesTableRow: React.FC<{ item: any }> = ({ item }) => {
  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(item?.reference_document?.total_claimed_amount ?? 0);

  const formattedDate = item?.reference_document?.creation
    ? new Date(item?.reference_document?.creation).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : " - ";

  return (
    <div
      className="grid gap-4 px-6 py-3 border-b border-gray-100 text-sm text-gray-700 items-center"
      style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}
    >
      <span>{item?.reference_document?.custom_expense_category || " - "}</span>
      <span>{formattedAmount || " - "}</span>
      <span>{formattedDate || " - "}</span>
      <div className="w-fit">
        <Tooltip
          content={
            item?.reference_document?.status === "Draft"
              ? item?.reference_document?.custom_assigned_user
              : ""
          }
        >
          <span
            className={`px-2 py-1 w-fit rounded-2xl text-xs font-medium text-center ${getStatusBadgeClasses(
              item?.reference_document?.status
            )}`}
          >
            {item?.reference_document?.status === "Draft"
              ? "Pending"
              : item?.reference_document?.status || " - "}
          </span>
        </Tooltip>
      </div>
    </div>
  );
};

const ExpensesList: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const [selectedStages, setSelectedStages] = React.useState<ApprovalStage[]>(
    []
  );

  const [selectedStatus, setSelectedStatus] = React.useState<string>("Draft");
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();

  const { data: currentEmployee } = useCurrentEmployee();

  React.useEffect(() => {
    if ((location.state as any)?.refresh) {
      queryClient.invalidateQueries({
        queryKey: ["documents", "Expense Claim"],
      });
      queryClient.invalidateQueries({
        queryKey: ["documents-infinite", "Expense Claim"],
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [location.key]);

  const openModal = (id: string, stages: ApprovalStage[]) => {
    setSelectedStages(stages); // Capture stages
    setTimeout(() => setSelectedId(id), 0);
  };

  const closeModal = () => {
    setSelectedId(null);
    setSelectedStages([]);
  };

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(event.target.value);
    setRefetchAttendance(true);
  };

  const RowWrapper: React.FC<{ item: any }> = ({ item }) => {
    const id = item?.reference_document?.name;
    const stages = (item?.approval_stages_status as ApprovalStage[]) || [];
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          if (!id) {
            return;
          }
          openModal(id, stages);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (id) openModal(id, stages);
          }
        }}
        className="cursor-pointer"
      >
        <ExpensesTableRow item={item} />
      </div>
    );
  };

  const ItemWrapper: React.FC<{ item: any }> = ({ item }) => {
    const id = item?.reference_document?.name;
    const stages = (item?.approval_stages_status as ApprovalStage[]) || [];

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          if (!id) {
            return;
          }
          openModal(id, stages);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (id) openModal(id, stages);
          }
        }}
        className="cursor-pointer"
      >
        <ExpensesItem item={item} />
      </div>
    );
  };

  const FilterDropdowns = () => (
    <div className="flex items-center gap-2">
      <select
        value={selectedStatus}
        onChange={handleStatusChange}
        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {EXPENSE_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  const CardSkeleton = () => (
    <div className="rounded-xl bg-gray-100 animate-pulse my-4">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between gap-1">
          <div>
            <div className="h-4 w-32 bg-gray-300 rounded mb-2"></div>
            <div className="h-3 w-24 bg-gray-300 rounded"></div>
          </div>
          <div className="h-6 w-16 bg-gray-300 rounded-md"></div>
        </div>
      </div>
    </div>
  );

  const apiParams = {
    doctype: "Expense Claim",
    employee: currentEmployee?.name,
    ...(selectedStatus && { status: selectedStatus }),
  };

  return (
    <div
      className="relative flex size-full flex-col group/design-root md:p-6"
      style={{ fontFamily: "Inter, Noto Sans, sans-serif" }}
    >
      <div className="flex justify-between items-center mb-2 border-b-1 border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 pb-1">
          My Expense Claims
        </h2>
        <div className="flex items-center gap-3 pb-1">
          <FilterDropdowns />
          <button
            onClick={() => {
              navigate("/webapp/expenses-app/expenses-list/view-all");
            }}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            View All
          </button>
        </div>
      </div>

      {currentEmployee?.name && (
        <CardTable
          titles={[
            "Expense Category",
            "Claimed Amount",
            "Claim Date",
            "Status",
          ]}
          columnWidths={["1fr", "1fr", "1fr", "1fr"]}
        >
          <DataListView
            queryKey="expense-claims"
            customAPI={{
              method: "cn_leave_shift_managment.api.get_open_approval_todos",
              params: apiParams,
            }}
            ItemComponent={(props: { item: any }) =>
              isDesktop ? (
                <RowWrapper item={props.item} />
              ) : (
                <ItemWrapper item={props.item} />
              )
            }
            SkeletonComponent={CardSkeleton}
            onRefetchComplete={() => setRefetchAttendance(false)}
            refetchTrigger={refetchAttendance}
            isSearch={false}
            isFilter={false}
            pageSize={10}
            showRefreshButton={false}
            orderBy="modified desc"
            infiniteScroll={false}
            loadMorePagination={true}
            showPagination={false}
          />
        </CardTable>
      )}
      {selectedId && (
        <ExpenseClaimDetailsModal
          id={selectedId}
          onClose={closeModal}
          getStatusBadgeClasses={getStatusBadgeClasses}
          selectedStages={selectedStages}
        />
      )}
    </div>
  );
};

export default ExpensesList;
