import React from "react";
import FrappeListView from "../ListView";
import CardTable from "../shared/CardTable";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

interface APIExpense {
  name: string;
  approval_status: string;
  total_claimed_amount: number;
  creation: string;
  custom_expense_category: string;
}

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

const ExpensesItem: React.FC<{ item: APIExpense }> = ({ item }) => {
  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(item.total_claimed_amount);

  const formattedDate = new Date(item.creation).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="rounded-xl my-1 border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <p className="text-xl font-bold text-gray-900">
            {formattedAmount}
            {item?.custom_expense_category && (
              <span>{` (${item?.custom_expense_category})`}</span>
            )}
          </p>
        </div>
        {item.approval_status && (
          <span
            className={`px-3 py-1 rounded-2xl text-xs font-medium ${getStatusBadgeClasses(
              item.approval_status
            )}`}
          >
            {item?.approval_status === "Draft"
              ? "Pending"
              : item?.approval_status}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500">
        <span>Submitted on {formattedDate}</span>
      </p>
    </div>
  );
};

const ExpensesTableRow: React.FC<{ item: APIExpense }> = ({ item }) => {
  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(item.total_claimed_amount);

  const formattedDate = new Date(item.creation).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className="grid gap-4 px-6 py-3 border-b border-gray-100 text-sm text-gray-700 items-center"
      style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}
    >
      <span>{item.custom_expense_category || " - "}</span>
      <span>{formattedAmount || " - "}</span>
      <span>{formattedDate || " - "}</span>
      <span
        className={`px-2 py-1 rounded-2xl text-xs font-medium text-center w-fit ${getStatusBadgeClasses(
          item?.approval_status
        )}`}
      >
        {item?.approval_status === "Draft"
          ? "Pending"
          : item?.approval_status || " - "}
      </span>
    </div>
  );
};

const ExpensesList: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const location = useLocation();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((location.state as any)?.refresh) {
      queryClient.invalidateQueries({
        queryKey: ["documents", "Expense Claim"],
      });
      queryClient.invalidateQueries({
        queryKey: ["documents-infinite", "Expense Claim"],
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  return (
    <div
      className="relative flex size-full flex-col group/design-root md:p-6"
      style={{ fontFamily: "Inter, Noto Sans, sans-serif" }}
    >
      {isDesktop ? (
        <CardTable
          titles={["Expense Category", "Amount", "Claim Date", "Status"]}
          columnWidths={["1fr", "1fr", "1fr", "1fr"]}
        >
          <FrappeListView
            doctype="Expense Claim"
            ItemComponent={ExpensesTableRow}
            isSearch={false}
            pageSize={10}
            defaultFields={["*"]}
            infiniteScroll={true}
            showPagination={false}
            onRefetchAvailable={() => location.key}
          />
        </CardTable>
      ) : (
        <FrappeListView
          doctype="Expense Claim"
          ItemComponent={ExpensesItem}
          isSearch={true}
          pageSize={10}
          showRefereshButton={true}
          defaultFields={["*"]}
          searchFields={[
            "name",
            "custom_expense_category",
            "approval_status",
            "total_claimed_amount",
            "creation",
          ]}
          infiniteScroll={true}
          onRefetchAvailable={() => location.key}
        />
      )}
    </div>
  );
};

export default ExpensesList;
