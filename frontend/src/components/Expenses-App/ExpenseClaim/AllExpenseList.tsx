import React from "react";
import ExpenseListBase from "./ExpenseListBase";

const AllExpensesList: React.FC = () => {
  return (
    <ExpenseListBase
      listType="all"
      title="All My Expense Claims"
      showMobileHeader={true}
      showPagination={true} // Pagination is shown for the full list view
      queryKeySuffix="view-all"
      pageSize={15} // Slightly larger page size for a full view
    />
  );
};

export default AllExpensesList;
