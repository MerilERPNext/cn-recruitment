/* eslint-disable @typescript-eslint/no-explicit-any */
export const buildExpenseNavigationState = (
  expenseClaim: any,
  expenseItem: any,
  isResubmit?: boolean
) => {
  return {
    expense_claim_name: expenseClaim.name,
    isResubmit,
    expense: {
      uid: expenseItem.name,
      name: expenseItem.name,
      expenseCategory: expenseClaim?.custom_expense_category,
      categoryType: expenseClaim?.custom_category_type || "General",
      expenseType: expenseItem.expense_type,
      description: expenseItem?.description,
      expense_date: expenseItem.expense_date,
      currency: expenseItem.custom_currency,
      amount: expenseItem.amount,
      merchant: expenseItem.custom_mercent,
      invoice_number: expenseItem.custom_invoice_number,
      vehicle_type: expenseItem.custom_vehicle_type,
      custom_attach_receipt: expenseItem.custom_attach_receipt,
      participants: expenseClaim?.custom_participants,
      from_location: expenseItem.custom_from_location,
      to_location: expenseItem.custom_to_location,
      start_datetime: expenseItem.custom_start_datetime,
      end_datetime: expenseItem.custom_end_datetime,
      location: expenseItem.custom_location,
      units: expenseItem?.custom_units,
    },
  };
};
