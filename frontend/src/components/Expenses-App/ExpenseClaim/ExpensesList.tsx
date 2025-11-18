import React from "react";
import CardTable from "../../shared/CardTable";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import ExpenseClaimDetailsModal from "./ExpenseClaimDetailsModal";
import Tooltip from "../../shared/Tooltip";
import DataListView from "../../DataListView";
import { useCurrentEmployee } from "../../../hooks/useEmployee";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { ApprovalStage } from "../../../types/expenseAdvance";
import CustomDropdown from "../../shared/CustomDropdown";

const STATUS_OPTIONS = [
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
        <p className="text-xl font-bold text-gray-900">
          {formattedAmount}
          {item?.reference_document?.custom_expense_category && (
            <span> ({item?.reference_document?.custom_expense_category})</span>
          )}
        </p>

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

      <p className="text-sm text-gray-500">Submitted on {formattedDate}</p>
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

     const formattedSanctionedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(item?.reference_document?.total_sanctioned_amount ?? 0);
  return (
    <div
      className="grid gap-4 px-6 py-3 border-b border-gray-100 text-sm text-gray-700 items-center"
      style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr" }}
    >
      <span>{item?.reference_document?.custom_expense_category || " - "}</span>
      <span>{formattedAmount}</span>
      <span>{formattedSanctionedAmount || " - "}</span>
      <span>{formattedDate}</span>

      <Tooltip
        content={
          item?.reference_document?.status === "Draft"
            ? item?.reference_document?.custom_assigned_user
            : ""
        }
      >
        <span
          className={`px-2 py-1 rounded-2xl text-xs font-medium text-center ${getStatusBadgeClasses(
            item?.reference_document?.status
          )}`}
        >
          {item?.reference_document?.status === "Draft"
            ? "Pending"
            : item?.reference_document?.status}
        </span>
      </Tooltip>
    </div>
  );
};

const ExpensesList: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [selectedStages, setSelectedStages] = React.useState<ApprovalStage[]>(
    []
  );

  const [selectedStatus, setSelectedStatus] = React.useState("Draft");

  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();
  const { data: currentEmployee } = useCurrentEmployee();

  React.useEffect(() => {
    if ((location.state as any)?.refresh) {
      queryClient.invalidateQueries({
        queryKey: ["expense-claims"],
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [location.key]);

  const openModal = (id: string, stages: ApprovalStage[]) => {
    setSelectedStages(stages);
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

  const RowWrapper = ({ item }: any) => {
    const id = item?.reference_document?.name;
    const stages = item?.approval_stages_status || [];

    return (
      <div
        onClick={() => id && openModal(id, stages)}
        className="cursor-pointer"
      >
        <ExpensesTableRow item={item} />
      </div>
    );
  };

  const ItemWrapper = ({ item }: any) => {
    const id = item?.reference_document?.name;
    const stages = item?.approval_stages_status || [];

    return (
      <div
        onClick={() => id && openModal(id, stages)}
        className="cursor-pointer"
      >
        <ExpensesItem item={item} />
      </div>
    );
  };

  const CardSkeleton = () => (
    <div className="rounded-xl bg-gray-100 animate-pulse my-4">
      <div className="px-4 py-2 flex justify-between">
        <div>
          <div className="h-4 w-32 bg-gray-300 rounded mb-2"></div>
          <div className="h-3 w-24 bg-gray-300 rounded"></div>
        </div>
        <div className="h-6 w-16 bg-gray-300 rounded-md"></div>
      </div>
    </div>
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

  const apiParams = {
    doctype: "Expense Claim",
    employee: currentEmployee?.name,
    status: selectedStatus,
  };

  return (
    <div
      className="relative flex size-full flex-col group/design-root md:p-6"
      style={{ fontFamily: "Inter, Noto Sans, sans-serif" }}
    >
      <div className="flex justify-between items-center mb-2 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 pb-1">
          My Expense Claims
        </h2>

        <div className="flex items-center space-x-3 pb-1">
          <FilterDropdowns />
        </div>
      </div>

      <div className="bg-white h-full px-0 md:pt-2 pt-0 mb-20">
        {currentEmployee?.name && (
          <CardTable
            titles={["Category", "Claimed Amount", "Sanctioned Amount", "Date", "Status"]}
            columnWidths={["1fr", "1fr", "1fr", "1fr", "1fr"]}
          >
            <DataListView
              queryKey={["expense-claims-all", selectedStatus]}
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
              showRefreshButton={false}
              orderBy="modified desc"
              pageSize={10}
              infiniteScroll={true}
              showPagination={true}
              loadMorePagination={false}
            />
          </CardTable>
        )}
      </div>

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
