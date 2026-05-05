type UnknownRecord = Record<string, unknown>;

export interface ExpenseNavigationExpense extends UnknownRecord {
  uid: string;
  name: string;
  approval_status?: string;
  expenseCategory?: string;
  categoryType?: string;
  category_type?: string;
  expenseType?: string;
  description?: string;
  expense_date?: string;
  currency?: string;
  amount?: number;
  merchant?: string;
  invoice_number?: string;
  vehicle_type?: string;
  custom_attach_receipt?: unknown;
  participants?: unknown[];
  from_location?: string;
  to_location?: string;
  start_datetime?: string;
  end_datetime?: string;
  location?: string;
  units?: number;
  no_of_units?: number;
}

export interface ExpenseNavigationState {
  expense_claim_name: string;
  draft_document_name?: string | null;
  isResubmit?: boolean;
  expense: ExpenseNavigationExpense;
}

const parseCustomFormData = (value: unknown): UnknownRecord => {
  if (!value) return {};

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? (parsed as UnknownRecord) : {};
    } catch {
      return {};
    }
  }

  return value && typeof value === "object" ? (value as UnknownRecord) : {};
};

export const buildExpenseNavigationState = (
  expenseClaim: object,
  expenseItem: object,
  isResubmit?: boolean,
): ExpenseNavigationState => {
  const claimData = expenseClaim as UnknownRecord;
  const itemData = expenseItem as UnknownRecord;
  const claimName =
    typeof claimData.name === "string" ? claimData.name : "";
  const expenseName =
    typeof itemData.name === "string" ? itemData.name : "";
  const categoryType =
    typeof claimData.custom_category_type === "string" &&
    claimData.custom_category_type
      ? claimData.custom_category_type
      : "General";
  const customFormData = parseCustomFormData(itemData.custom_form_data);
  const rawUnits =
    typeof itemData.custom_units === "number"
      ? itemData.custom_units
      : itemData.custom_units !== undefined
        ? Number(itemData.custom_units)
        : undefined;

  return {
    expense_claim_name: claimName,
    isResubmit,
    expense: {
      ...itemData,
      ...customFormData,
      uid: expenseName,
      name: expenseName,
      approval_status:
        typeof claimData.approval_status === "string"
          ? claimData.approval_status
          : undefined,
      expenseCategory:
        typeof claimData.custom_expense_category === "string"
          ? claimData.custom_expense_category
          : undefined,
      categoryType,
      category_type: categoryType,
      expenseType:
        typeof itemData.expense_type === "string"
          ? itemData.expense_type
          : undefined,
      description:
        typeof itemData.description === "string"
          ? itemData.description
          : undefined,
      expense_date:
        typeof itemData.expense_date === "string"
          ? itemData.expense_date
          : undefined,
      currency:
        typeof itemData.custom_currency === "string"
          ? itemData.custom_currency
          : typeof itemData.currency === "string"
            ? itemData.currency
            : undefined,
      amount:
        typeof itemData.amount === "number"
          ? itemData.amount
          : itemData.amount !== undefined
            ? Number(itemData.amount)
            : undefined,
      merchant:
        typeof itemData.custom_mercent === "string"
          ? itemData.custom_mercent
          : typeof itemData.merchant === "string"
            ? itemData.merchant
            : undefined,
      invoice_number:
        typeof itemData.custom_invoice_number === "string"
          ? itemData.custom_invoice_number
          : typeof itemData.invoice_number === "string"
            ? itemData.invoice_number
            : undefined,
      vehicle_type:
        typeof itemData.custom_vehicle_type === "string"
          ? itemData.custom_vehicle_type
          : typeof itemData.vehicle_type === "string"
            ? itemData.vehicle_type
            : undefined,
      custom_attach_receipt: itemData.custom_attach_receipt,
      participants: Array.isArray(claimData.custom_participants)
        ? (claimData.custom_participants as unknown[])
        : Array.isArray(itemData.participants)
          ? (itemData.participants as unknown[])
          : undefined,
      from_location:
        typeof itemData.custom_from_location === "string"
          ? itemData.custom_from_location
          : typeof itemData.from_location === "string"
            ? itemData.from_location
            : undefined,
      to_location:
        typeof itemData.custom_to_location === "string"
          ? itemData.custom_to_location
          : typeof itemData.to_location === "string"
            ? itemData.to_location
            : undefined,
      start_datetime:
        typeof itemData.custom_start_datetime === "string"
          ? itemData.custom_start_datetime
          : typeof itemData.start_datetime === "string"
            ? itemData.start_datetime
            : undefined,
      end_datetime:
        typeof itemData.custom_end_datetime === "string"
          ? itemData.custom_end_datetime
          : typeof itemData.end_datetime === "string"
            ? itemData.end_datetime
            : undefined,
      location:
        typeof itemData.custom_location === "string"
          ? itemData.custom_location
          : typeof itemData.location === "string"
            ? itemData.location
            : undefined,
      units:
        rawUnits !== undefined && Number.isFinite(rawUnits)
          ? rawUnits
          : undefined,
      no_of_units:
        rawUnits !== undefined && Number.isFinite(rawUnits)
          ? rawUnits
          : undefined,
    },
  };
};
