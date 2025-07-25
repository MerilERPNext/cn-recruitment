import React from "react";
import FrappeListView from "../ListView";

interface APIExpense {
  name: string;
  approval_status: string;
  total_claimed_amount: number;
  creation: string;
}

const ExpensesItem: React.FC<{
  item: APIExpense;
  index?: number;
  doctype: string;
}> = ({ item }) => {
  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(item.total_claimed_amount);

  // Format the posting date
  const formattedDate = new Date(item.creation).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

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

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <p className="text-xl font-bold text-gray-900">{formattedAmount}</p>
        </div>
        {item.approval_status && (
          <span
            className={`px-3 py-1 rounded-2xl text-xs font-medium ${getStatusBadgeClasses(item.approval_status)}`}
          >
            {item.approval_status}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500">
        <span>Submitted on {formattedDate}</span>
      </p>
    </div>
  );
};

const ExpensesList: React.FC = () => {
  return (
    <div
      className="relative flex size-full min-h-screen flex-col group/design-root"
      style={{ fontFamily: "Inter, Noto Sans, sans-serif" }}
    >
      <FrappeListView
        doctype="Expense Claim"
        ItemComponent={ExpensesItem}
        isSearch={true}
        pageSize={10}
        defaultFields={[
          "name",
          "approval_status",
          "total_claimed_amount",
          "creation",
        ]}
        searchFields={[
          "name",
          "approval_status",
          "total_claimed_amount",
          "creation",
        ]}
        infiniteScroll={true}
      />
    </div>
  );
};

export default ExpensesList;
