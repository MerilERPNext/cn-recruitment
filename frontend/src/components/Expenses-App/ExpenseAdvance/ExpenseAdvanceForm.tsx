import React, { useMemo, useRef, useState } from "react";
import { Form } from "@tsed/react-formio";
import { useScreenSize } from "../../../hooks/useScreenSize";
import HeaderBar from "../../HeaderBar";
import { useCurrentEmployee } from "../../../hooks/useEmployee";
import {
  useCostCenters,
  useCreateNewAdvance,
  useExpenseTableFieldSettings,
  useProjects,
} from "../../../hooks/useEmployeeAdvances";
import toast from "react-hot-toast";
import DOMPurify from "dompurify";
import { useNavigate } from "react-router-dom";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import DesktopLayoutWrapper from "../../DesktopLayoutWrapper";
import ExpenseBreakupModal from "./ExpenseBreakupModal";
import { SquarePen, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";

interface ExpenseClaim {
  id: string;
  expense_type: string;
  [key: string]: any;
}

const ExpenseAdvanceForm: React.FC<{
  onClose?: () => void;
}> = ({ onClose }) => {
  const { data: projects } = useProjects();
  const { data: costCenters } = useCostCenters();

  const { isDesktop } = useScreenSize();
  const formRef = useRef<any>(null);
  const navigate = useNavigate();
  const { setRefetchAttendance } = useGlobalStore();

  const { data: currentEmployee } = useCurrentEmployee();
  const { data: fieldSettings } = useExpenseTableFieldSettings(
    currentEmployee?.name || ""
  );

  const postingDate = new Date().toISOString().split("T")[0];
  const advanceType = "Reimbursement / Expense Advance";

  const mutation = useCreateNewAdvance();
  const [submitting, setSubmitting] = useState(false);

  // Expense Claims State
  const [expenseClaims, setExpenseClaims] = useState<ExpenseClaim[]>([]);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);

  // 1. New state to hold the expense item being edited
  const [expenseToEdit, setExpenseToEdit] = useState<ExpenseClaim | null>(null);

  const getLabelWithAsterisk = (label: string, required?: boolean) => {
    return required ? `${label} <span style="color:red">&nbsp;*</span>` : label;
  };

  const handleSubmit = async () => {
    try {
      const submission = await formRef.current?.submit();
      const formData = submission?.data;

      if (!formData || !formData.purpose || !formData.advance_amount) {
        toast.error("Please fill all required fields.");
        return;
      }

      // Prepare expense claims for submission
      const preparedExpenseClaims = expenseClaims.map(({ id, ...claim }) => {
        const filteredClaim = Object.fromEntries(
          Object.entries(claim).filter(
            ([, value]) => value !== null && value !== undefined && value !== ""
          )
        );

        // Format dates
        if (filteredClaim.expense_date) {
          filteredClaim.expense_date = format(
            new Date(filteredClaim.expense_date),
            "yyyy-MM-dd"
          );
        }
        if (filteredClaim.start_datetime) {
          filteredClaim.start_datetime = format(
            new Date(filteredClaim.start_datetime),
            "yyyy-MM-dd HH:mm:ss"
          );
        }
        if (filteredClaim.end_datetime) {
          filteredClaim.end_datetime = format(
            new Date(filteredClaim.end_datetime),
            "yyyy-MM-dd HH:mm:ss"
          );
        }

        return filteredClaim;
      });

      const payload = {
        custom_type: advanceType,
        employee: currentEmployee?.name,
        company: currentEmployee?.company,
        posting_date: formData.posting_date || postingDate,
        purpose: formData.purpose,
        advance_amount: formData.advance_amount,
        currency: formData.currency,
        exchange_rate: formData.exchange_rate,
        project: formData.project,
        cost_center: formData.cost_center,
        expenses: preparedExpenseClaims,
      };

      if (
        fieldSettings?.expense_table_mandatory &&
        expenseClaims.length === 0
      ) {
        toast.error("Please add at least one expense claim before submitting.");
        return;
      }

      setSubmitting(true);
      mutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Expense Advance submitted successfully!");
          navigate("/webapp/expenses-app/advance-expense-list");
          setTimeout(() => {
            setRefetchAttendance(true);
          }, 1000);
        },
        onError: (error: any) => {
          const errorMessage =
            error?.response?.data?.exception
              ?.split(":")
              .slice(1)
              .join(":")
              .trim() || "Something went wrong!!";

          const cleanString = DOMPurify.sanitize(errorMessage || "");
          toast.error(
            <span dangerouslySetInnerHTML={{ __html: cleanString }} />
          );
        },
        onSettled: () => setSubmitting(false),
      });
    } catch (err) {
      console.error("❌ Submission error:", err);
      toast.error("Form submission failed!");
      setSubmitting(false);
    }
  };

  const handleAddExpense = (expense: ExpenseClaim) => {
    setExpenseClaims((prev) => [...prev, expense]);
    toast.success("Expense claim added successfully!");
  };

  // 2. New function to handle updating an existing expense
  const handleUpdateExpense = (updatedExpense: ExpenseClaim) => {
    setExpenseClaims((prev) =>
      prev.map((exp) => (exp.id === updatedExpense.id ? updatedExpense : exp))
    );
    toast.success("Expense claim updated successfully!");
    // Close modal and reset editing state
    setIsExpenseModalOpen(false);
    setExpenseToEdit(null);
  };

  // 3. New function to set the expense to edit and open the modal
  const handleEditExpense = (expense: ExpenseClaim) => {
    setExpenseToEdit(expense);
    setIsExpenseModalOpen(true);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenseClaims((prev) => prev.filter((exp) => exp.id !== id));
    setSelectedExpenses((prev) => prev.filter((expId) => expId !== id));
    toast.success("Expense claim deleted!");
  };

  const handleDeleteSelected = () => {
    if (selectedExpenses.length === 0) return;
    setExpenseClaims((prev) =>
      prev.filter((exp) => !selectedExpenses.includes(exp.id))
    );
    toast.success(`${selectedExpenses.length} expense(s) deleted!`);
    setSelectedExpenses([]);
  };

  const handleCheckboxChange = (id: string) => {
    setSelectedExpenses((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const expenseAdvanceSchema = useMemo(() => {
    if (!fieldSettings) return null;

    const showProject = fieldSettings.show_project;
    const projectMandatory = fieldSettings.project_mandatory;

    const showCostCenter = fieldSettings.show_cost_center;
    const costCenterMandatory = fieldSettings.cost_center_mandatory;

    const allowedCurrencies =
      fieldSettings.allowed_currencies?.map((cur) => ({
        label: cur,
        value: cur,
      })) || [];

    return {
      type: "form",
      display: "form",
      components: [
        {
          components: [
            // 🔹 Row 1: Advance Type + Posting Date
            {
              type: "columns",
              key: "row1",
              columns: [
                {
                  width: 6,
                  components: [
                    {
                      type: "textfield",
                      key: "custom_type",
                      label: "Advance Type",
                      input: true,
                      defaultValue: advanceType,
                      disabled: true,
                    },
                  ],
                },
                {
                  width: 6,
                  components: [
                    {
                      type: "datetime",
                      key: "posting_date",
                      label: "Posting Date",
                      input: true,
                      enableTime: false,
                      format: "dd-MM-yyyy",
                      defaultValue: postingDate,
                    },
                  ],
                },
              ],
            },

            // 🔹 Row 2: Employee + Company
            {
              type: "columns",
              key: "row2",
              columns: [
                {
                  width: 6,
                  components: [
                    {
                      type: "textfield",
                      key: "employee",
                      label: "Employee",
                      input: true,
                      defaultValue: currentEmployee?.name || "",
                      disabled: true,
                    },
                  ],
                },
                {
                  width: 6,
                  components: [
                    {
                      type: "textfield",
                      key: "company",
                      label: "Company",
                      input: true,
                      defaultValue: currentEmployee?.company || "",
                      disabled: true,
                    },
                  ],
                },
              ],
            },

            // 🔹 Row 3: Currency + Exchange Rate
            {
              type: "columns",
              key: "row3",
              columns: [
                {
                  width: 6,
                  components: [
                    {
                      type: "select",
                      key: "currency",
                      label: getLabelWithAsterisk("Currency", true),
                      html: true,
                      input: true,
                      validate: {
                        required: true,
                        customMessage: "Currency is required",
                      },
                      data: { values: allowedCurrencies },
                      defaultValue: "INR",
                    },
                  ],
                },
                {
                  width: 6,
                  components: [
                    {
                      type: "number",
                      key: "exchange_rate",
                      label: getLabelWithAsterisk("Exchange Rate", true),
                      html: true,
                      input: true,
                      defaultValue: 1,
                      validate: {
                        required: true,
                        min: 1,
                        customMessage: "Exchange Rate must be at least 1",
                      },
                    },
                  ],
                },
              ],
            },
            // 🔹 Row 4: Project + Cost Center (conditionally show)
            ...(showProject || showCostCenter
              ? [
                  {
                    type: "columns",
                    key: "row4",
                    columns: [
                      ...(showProject
                        ? [
                            {
                              width: 6,
                              components: [
                                {
                                  type: "select",
                                  key: "project",
                                  label: getLabelWithAsterisk(
                                    "Project",
                                    projectMandatory
                                  ),
                                  html: true,

                                  input: true,
                                  placeholder: "Select project",
                                  data: {
                                    values:
                                      projects?.data.map((pro) => ({
                                        label: pro.project_name,
                                        value: pro.project_name,
                                      })) || [],
                                  },
                                  validate: {
                                    required: projectMandatory,
                                    customMessage: "Project is required",
                                  },
                                },
                              ],
                            },
                          ]
                        : []),

                      ...(showCostCenter
                        ? [
                            {
                              width: 6,
                              components: [
                                {
                                  type: "select",
                                  key: "cost_center",
                                  label: getLabelWithAsterisk(
                                    "Cost Center",
                                    costCenterMandatory
                                  ),
                                  html: true,
                                  input: true,
                                  placeholder: "Select cost center",
                                  data: {
                                    values:
                                      costCenters?.data.map((cc) => ({
                                        label: cc.name,
                                        value: cc.name,
                                      })) || [],
                                  },
                                  validate: {
                                    required: costCenterMandatory,
                                    customMessage: "Cost Center is required",
                                  },
                                },
                              ],
                            },
                          ]
                        : []),
                    ],
                  },
                ]
              : []),

            // 🔹 Advance Amount + Purpose
            {
              type: "number",
              key: "advance_amount",
              label: getLabelWithAsterisk("Advance Amount", true),
              html: true,
              input: true,
              placeholder: "Enter amount",
              validate: {
                required: true,
                min: 1,
                customMessage: "Advance Amount must be at least 1",
              },
            },
            {
              type: "textarea",
              key: "purpose",
              label: getLabelWithAsterisk("Purpose", true),
              html: true,
              input: true,
              placeholder: "Describe the purpose of advance",
              validate: {
                required: true,
                customMessage: "Purpose is required",
              },
              rows: 3,
            },
          ],
        },
      ],
    };
  }, [
    fieldSettings,
    projects,
    costCenters,
    currentEmployee,
    advanceType,
    postingDate,
  ]);

  const FormContent = (
    <div className="flex flex-col h-full bg-white">
      <HeaderBar
        title="New Expense Advance"
        onBack={
          onClose
            ? onClose
            : () => navigate("/webapp/expenses-app/advance-expense-list")
        }
      />

      <div className="flex-1 overflow-y-auto p-4">
        {expenseAdvanceSchema ? (
          <Form
            form={expenseAdvanceSchema}
            onFormReady={(instance: any) => (formRef.current = instance)}
            options={{ submitButton: false, noAlerts: true }}
          />
        ) : (
          // You can put any loading spinner or message here
          <div className="flex items-center justify-center p-10 border border-dashed rounded-lg">
            <p className="text-gray-500">Loading form settings...</p>
          </div>
        )}

        {/* Add Expense Claims Section */}
        {true && (
          <div className="mt-8 border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Advance Break Up
              </h3>
              <button
                onClick={() => {
                  setIsExpenseModalOpen(true);
                  // 4. Clear expenseToEdit when adding a new expense
                  setExpenseToEdit(null);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
                Advance Break Up
              </button>
            </div>

            {/* Expense Claims Table */}
            {expenseClaims.length > 0 && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm text-gray-600">
                    {expenseClaims.length} expense advance breakup(s) added
                  </p>
                  {selectedExpenses.length > 0 && (
                    <button
                      onClick={handleDeleteSelected}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                      Delete Selected ({selectedExpenses.length})
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-12 px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            onChange={(e) =>
                              setSelectedExpenses(
                                e.target.checked
                                  ? expenseClaims.map((e) => e.id)
                                  : []
                              )
                            }
                            checked={
                              selectedExpenses.length ===
                                expenseClaims.length && expenseClaims.length > 0
                            }
                            className="rounded border-gray-300"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expense Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expense Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Merchant
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invoice No.
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {expenseClaims.map((expense) => (
                        <tr
                          key={expense.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedExpenses.includes(expense.id)}
                              onChange={() => handleCheckboxChange(expense.id)}
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {expense.expense_type}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {expense.expense_date
                              ? format(
                                  new Date(expense.expense_date),
                                  "dd-MM-yyyy"
                                )
                              : "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {expense.amount || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {expense.custom_mercent || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {expense.custom_invoice_number || "-"}
                          </td>
                          <td className="px-4 py-3">
                            {/* 5. Add Edit button */}
                            <button
                              onClick={() => handleEditExpense(expense)}
                              className="text-blue-600 hover:text-blue-800 transition-colors mr-3"
                              title="Edit expense"
                            >
                              <SquarePen size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Delete expense"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {expenseClaims.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500">No advance break up added yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Click "Add New Advance" to add your first advance break up
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-5 py-3 flex space-x-3">
        <button
          onClick={
            onClose
              ? onClose
              : () => navigate("/webapp/expenses-app/advance-expense-list")
          }
          className="flex-1 py-3 px-6 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 py-3 px-6 rounded-lg font-medium bg-black text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </div>
      {/* Expense Claim Modal */}
      <ExpenseBreakupModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          // 6. Reset expenseToEdit when closing the modal
          setExpenseToEdit(null);
        }}
        // 7. Pass the correct handler based on whether we are editing or adding
        onSave={expenseToEdit ? handleUpdateExpense : handleAddExpense}
        // 8. Pass the expense to edit as initial data
        initialData={expenseToEdit}
      />
    </div>
  );

  // ✅ Render modal only for desktop
  if (isDesktop) {
    return (
      <DesktopLayoutWrapper title="New Expense Advance">
        {FormContent}
      </DesktopLayoutWrapper>
    );
  }

  // ✅ Mobile: Normal view
  return <div className="h-screen bg-white">{FormContent}</div>;
};

export default ExpenseAdvanceForm;
