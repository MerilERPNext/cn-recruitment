import React from "react";
import ExpenseListBase from "./ExpenseListBase";

const ExpensesList: React.FC = () => {
  return (
    <ExpenseListBase
      listType="dashboard"
      title="My Expense Claims"
      showViewAllButton={true}
      showPagination={false}
      queryKeySuffix="dashboard"
      pageSize={10}
    />
  );
};

export default ExpensesList;
