import { ColumnSortConfig } from "../components/shared/CardTableContext";
import { ExpenseAdvanceType, ExpenseClaimType } from "../types/expenseAdvance";
import { MyLeaveRequestType } from "../types/leaves";

//LEAVE SORT CONFIGS
export const COLUMN_SORT_CONFIG_MY_LEAVE_REQUEST: ColumnSortConfig[] = [
  {
    sortable: false
  },
  {
    sortable: true,
    type: "string",
    field: "custom_leave_type_name",
    getValue: (item: MyLeaveRequestType) =>
      item.reference_document?.custom_leave_type_name ?? "",
  },
  {
    sortable: true,
    type: "date",
    field: "from_date",
    getValue: (item: MyLeaveRequestType) =>
      item.reference_document?.from_date ?? "",
  },
  {
    sortable: true,
    type: "date",
    field: "to_date",
    getValue: (item: MyLeaveRequestType) =>
      item.reference_document?.to_date ?? "",
  },
  {
    sortable: false
  },
  {
    sortable: false
  },
  {
    sortable: false,
  },
  { sortable: false },
];

export const getCOLUMN_SORT_CONFIG_TEAM_LEAVE_REQUEST = (
  isBulkSelect: boolean,
  isRejected: boolean
): ColumnSortConfig[] => {
  const config: ColumnSortConfig[] = [];

  // Index 0 if bulk select is enabled
  if (isBulkSelect) {
    config.push({ sortable: false }); // Select
  }

  // Request Id
  config.push({
    sortable: false,
  });

  // Employee
  config.push({
    sortable: false,
  });

  // Leave Type
  config.push({
    sortable: true,
    type: "string",
    field: "custom_leave_type_name",
    getValue: (item: MyLeaveRequestType) =>
      item.reference_document?.custom_leave_type_name ?? "",
  });

  // From Date
  config.push({
    sortable: true,
    type: "date",
    field: "from_date",
    getValue: (item: MyLeaveRequestType) =>
      item.reference_document?.from_date ?? "",
  });

  // To Date
  config.push({
    sortable: true,
    type: "date",
    field: "to_date",
    getValue: (item: MyLeaveRequestType) =>
      item.reference_document?.to_date ?? "",
  });

  // Due Date
  config.push({
    sortable: true,
    type: "date",
    field: "due_date",
    getValue: (item: MyLeaveRequestType) => item?.due_date ?? "",
  });

  // Leave Days
  config.push({ sortable: false });

  // Status
  config.push({ sortable: false });

  // Reject Reason (Only for Rejected filter)
  if (isRejected) {
    config.push({ sortable: false });
  }

  // Actions
  config.push({ sortable: false });

  return config;
};

//EXPENSE CLAIM SORT CONFIGS
export const COLUMN_SORT_CONFIG_EXPENSE_CLAIM: ColumnSortConfig[] = [
  {
    sortable: false
  },
  {
    sortable: true,
    type: "string",
    field: "custom_expense_category_name",
    getValue: (item: ExpenseClaimType) =>
      item.reference_document?.custom_expense_category_name ?? "",
  },
   {
    sortable: true,
    type: "string",
    field: "custom_claim_type_name",
    getValue: (item: ExpenseClaimType) =>
      item.reference_document?.expenses[0]?.custom_claim_type_name ?? "",
  },
  {
    sortable: true,
    type: "number",
    field: "total_claimed_amount",
    getValue: (item: ExpenseClaimType) =>
      item.reference_document?.total_claimed_amount ?? 0,
  },
  {
    sortable: true,
    type: "number",
    field: "total_sanctioned_amount",
    getValue: (item: ExpenseClaimType) =>
      item.reference_document?.total_sanctioned_amount ?? 0,
  },
  {
    sortable: true,
    type: "date",
    field: "expense_date",
    getValue: (item: ExpenseClaimType) =>
      item.reference_document?.expenses[0]?.expense_date ?? "",
  },
  {
    sortable: true,
    type: "date",
    field: "creation",
    getValue: (item: ExpenseClaimType) =>
      item.reference_document?.creation ?? "",
  },
  {
    sortable: false
  },
  {
    sortable: false
  },
  {
    sortable: false,
  },
  { sortable: false },
];

// Draft filter variant: same as above but with an extra non-sortable checkbox column at position 0
export const COLUMN_SORT_CONFIG_EXPENSE_CLAIM_DRAFT: ColumnSortConfig[] = [
  { sortable: false }, // Checkbox column
  ...COLUMN_SORT_CONFIG_EXPENSE_CLAIM,
];

export const getCOLUMN_SORT_CONFIG_TEAM_EXPENSE_CLAIM = (
  isBulkSelect: boolean,
  isApproved: boolean
): ColumnSortConfig[] => {
  const config: ColumnSortConfig[] = [];

  if (isBulkSelect) {
    config.push({ sortable: false }); // Select
  }

  // Expense Id
  config.push({ sortable: false });

  // Employee
  config.push({ sortable: false });

  // Expense Category
  config.push({
    sortable: true,
    type: "string",
    field: "custom_expense_category_name",
    getValue: (item: ExpenseClaimType) =>
      item.reference_document?.custom_expense_category_name ?? "",
  });

  // Expense Type
  config.push({
    sortable: true,
    type: "string",
    field: "custom_claim_type_name",
    getValue: (item: ExpenseClaimType) =>
      item.reference_document?.expenses?.[0]?.custom_claim_type_name ?? "",
  });

  // Expense Date
  config.push({
    sortable: true,
    type: "date",
    field: "expense_date",
    getValue: (item: ExpenseClaimType) =>
      item.reference_document?.expenses?.[0]?.expense_date ?? "",
  });

  // Claimed Amount
  config.push({
    sortable: true,
    type: "number",
    field: "total_claimed_amount",
    getValue: (item: ExpenseClaimType) =>
      item.reference_document?.total_claimed_amount ?? 0,
  });

  // Claimed Date
  config.push({
    sortable: true,
    type: "date",
    field: "creation",
    getValue: (item: ExpenseClaimType) =>
      item.reference_document?.creation ?? "",
  });

  // Due Date
  config.push({
    sortable: true,
    type: "date",
    field: "due_date",
    getValue: (item: ExpenseClaimType) => item.due_date ?? "",
  });

  // Status
  config.push({ sortable: false });

  // Paid Status (only for Approved)
  if (isApproved) {
    config.push({ sortable: false });
  }

  // Actions
  config.push({ sortable: false });

  return config;
};

//EXPENSE ADVANCE SORT CONFIGS
export const COLUMN_SORT_CONFIG_EXPENSE_ADVANCE: ColumnSortConfig[] = [
  {
    sortable: false
  },
  {
    sortable: true,
    type: "string",
    field: "custom_advance_type",
    getValue: (item: ExpenseAdvanceType) =>
      item.reference_document?.custom_advance_type ?? "",
  },
   {
    sortable: true,
    type: "string",
    field: "custom_advance_policy_name",
    getValue: (item: ExpenseAdvanceType) =>
      item.reference_document?.custom_advance_policy ?? "",
  },
  {
    sortable: true,
    type: "date",
    field: "posting_date",
    getValue: (item: ExpenseAdvanceType) =>
      item.reference_document?.posting_date ?? "",
  },
    {
    sortable: true,
    type: "number",
    field: "advance_amount",
    getValue: (item: ExpenseAdvanceType) =>
      item.reference_document?.advance_amount ?? 0,
  },
  {
    sortable: false,
  },
  {
    sortable: false
  },
  {
    sortable: false
  },
  {
    sortable: false,
  },
  { sortable: false },
];

export const getCOLUMN_SORT_CONFIG_TEAM_EXPENSE_ADVANCE = (
  isBulkSelect: boolean,
  isApproved: boolean
): ColumnSortConfig[] => {
  const config: ColumnSortConfig[] = [];

  if (isBulkSelect) {
    config.push({ sortable: false }); // Select
  }

  // Advance ID
  config.push({ sortable: false });

  // Employee
  config.push({ sortable: false });

  // Department
  config.push({ sortable: false });

  // Advance Amount
  config.push({
    sortable: true,
    type: "number",
    field: "advance_amount",
    getValue: (item: ExpenseAdvanceType) =>
      item.reference_document?.advance_amount ?? 0,
  });

  // Due Date
  config.push({
    sortable: true,
    type: "date",
    field: "due_date",
    getValue: (item: ExpenseAdvanceType) => item.due_date ?? "",
  });

  // Status
  config.push({ sortable: false });

  // Paid Status (only for Approved)
  if (isApproved) {
    config.push({ sortable: false });
  }

  // Actions
  config.push({ sortable: false });

  return config;
};


