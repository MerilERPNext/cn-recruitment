/* eslint-disable @typescript-eslint/no-explicit-any */
import { Form } from "@tsed/react-formio";
import { format } from "date-fns";
import { Plus, SquarePen, Trash2 } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import {
  useAdvanceTypes,
  useCostCenters,
  useCreateNewAdvance,
  useEmployeeAdvanceUpdate,
  useExpenseTableFieldSettings,
  useProjects,
} from "../../../hooks/useEmployeeAdvances";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { expenseService } from "../../../services/expenseService";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import DesktopLayoutWrapper from "../../DesktopLayoutWrapper";
import HeaderBar from "../../HeaderBar";
import Button from "../../shared/atoms/Button";
import AdvanceFormSkeleton from "./AdvanceFormSkeleton";
import ExpenseBreakupModal from "./ExpenseBreakupModal";

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
  const location = useLocation();
  const { setRefetchAttendance } = useGlobalStore();

  // Edit mode: pre-fill from navigation state set by MyAdvanceExpenseList Edit button
  const editAdvanceData = (location.state as any)?.advanceData ?? null;
  const isEditMode = !!editAdvanceData;

  const { data: currentEmployee, isLoading: isEmployeeLoading } =
    useCurrentEmployeeAllDetails();
  const employeeId = currentEmployee?.name || "";
  const employeeCompany = currentEmployee?.company || "";

  const { data: advanceTypesData } = useAdvanceTypes();

  const [subAdvanceType, setSubAdvanceType] = useState<string | null>(
    editAdvanceData?.custom_advance_type ?? null,
  );
  const [selectedAdvanceType, setSelectedAdvanceType] = useState<string | null>(
    editAdvanceData?.custom_advance_type ?? null,
  );

  const { data: fieldSettings, isLoading: isFieldSettingsLoading } =
    useExpenseTableFieldSettings(employeeId || null, subAdvanceType);

  const isPolicyMissing = useMemo(() => {
    return !!subAdvanceType && !isFieldSettingsLoading && !fieldSettings?.advance_policy;
  }, [subAdvanceType, isFieldSettingsLoading, fieldSettings]);

  useEffect(() => {
    if (isPolicyMissing) {
      toast.error(
        "You are not eligible for expense advances. Contact HR. Advance Policy Not Found For Employee",
        {
          id: "advance-policy-missing",
        }
      );
    }
  }, [isPolicyMissing]);

  const postingDate = new Date().toISOString().split("T")[0];
  const advanceType = "Reimbursement / Expense Advance";

  const mutation = useCreateNewAdvance();
  const updateMutation = useEmployeeAdvanceUpdate();
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill existing expense breakup rows when editing
  const [expenseClaims, setExpenseClaims] = useState<ExpenseClaim[]>(() =>
    (editAdvanceData?.expenses ?? []).map((exp: any, idx: number) => ({
      ...exp,
      id: exp.name || `pre-${idx}`,
    })),
  );
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);

  const [expenseToEdit, setExpenseToEdit] = useState<ExpenseClaim | null>(null);

  const getLabelWithAsterisk = (label: string, required?: boolean) => {
    return required ? `${label} <span style="color:red">&nbsp;*</span>` : label;
  };

  const prepareExpenseClaims = (claims: ExpenseClaim[]) =>
    claims.map(({ id, ...claim }) => {
      const filteredClaim = Object.fromEntries(
        Object.entries(claim).filter(
          ([, value]) => value !== null && value !== undefined && value !== "",
        ),
      );
      if (filteredClaim.expense_date) {
        filteredClaim.expense_date = format(
          new Date(filteredClaim.expense_date as string),
          "yyyy-MM-dd",
        );
      }
      if (filteredClaim.start_datetime) {
        filteredClaim.start_datetime = format(
          new Date(filteredClaim.start_datetime as string),
          "yyyy-MM-dd HH:mm:ss",
        );
      }
      if (filteredClaim.end_datetime) {
        filteredClaim.end_datetime = format(
          new Date(filteredClaim.end_datetime as string),
          "yyyy-MM-dd HH:mm:ss",
        );
      }
      return filteredClaim;
    });

  const handleSubmit = async () => {
    try {
      const submission = await formRef.current?.submit();
      const formData = submission?.data;

      if (
        !formData ||
        !formData.purpose ||
        !formData.advance_amount ||
        !formData.advance_type
      ) {
        toast.error("Please fill all required fields.");
        return;
      }

      if (
        fieldSettings?.expense_table_mandatory &&
        expenseClaims.length === 0
      ) {
        toast.error(
          "Please add at least one expense advance break-up table data before submitting.",
        );
        return;
      }

      const preparedExpenseClaims = prepareExpenseClaims(expenseClaims);

      setSubmitting(true);

      if (isEditMode && editAdvanceData?.name) {
        // ── EDIT MODE ──
        const updatePayload = {
          docname: editAdvanceData.name,
          data: {
            posting_date: formData.posting_date || postingDate,
            purpose: formData.purpose,
            custom_advance_type: formData.advance_type,
            advance_amount: formData.advance_amount,
            currency: formData.currency,
            exchange_rate: 1,
            project: formData.project,
            cost_center: formData.cost_center,
            expenses: preparedExpenseClaims,
          },
        };
        updateMutation.mutate(updatePayload, {
          onSuccess: async () => {
            try {
              await expenseService.resubmitApprovalEvent(
                "Employee Advance",
                editAdvanceData.name,
              );
            } catch (error) {
              console.error("Failed to resubmit approval:", error);
            }
            toast.success("Expense Advance updated successfully!");
            navigate("/webapp/expenses-app/my-advance-expense");
            setTimeout(() => setRefetchAttendance(true), 1000);
          },
          onError: (error: any) => {
            toast.error(errorResponseFormater(error));
          },
          onSettled: () => setSubmitting(false),
        });
      } else {
        // ── CREATE MODE ──
        const payload = {
          custom_type: advanceType,
          employee: employeeId,
          company: employeeCompany,
          posting_date: formData.posting_date || postingDate,
          purpose: formData.purpose,
          custom_advance_type: formData.advance_type,
          advance_amount: formData.advance_amount,
          currency: formData.currency,
          exchange_rate: 1,
          project: formData.project,
          cost_center: formData.cost_center,
          expenses: preparedExpenseClaims,
        };
        mutation.mutate(payload, {
          onSuccess: () => {
            toast.success("Expense Advance submitted successfully!");
            navigate("/webapp/expenses-app/my-advance-expense");
            setTimeout(() => setRefetchAttendance(true), 1000);
          },
          onError: (error: any) => {
            toast.error(errorResponseFormater(error));
          },
          onSettled: () => setSubmitting(false),
        });
      }
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

  const handleUpdateExpense = (updatedExpense: ExpenseClaim) => {
    setExpenseClaims((prev) =>
      prev.map((exp) => (exp.id === updatedExpense.id ? updatedExpense : exp)),
    );
    toast.success("Expense claim updated successfully!");

    setIsExpenseModalOpen(false);
    setExpenseToEdit(null);
  };

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
      prev.filter((exp) => !selectedExpenses.includes(exp.id)),
    );
    toast.success(`${selectedExpenses.length} expense(s) deleted!`);
    setSelectedExpenses([]);
  };

  const handleCheckboxChange = (id: string) => {
    setSelectedExpenses((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const expenseAdvanceSchema = useMemo(() => {
    const showProject = fieldSettings?.show_project;
    const projectMandatory = fieldSettings?.project_mandatory;

    const showCostCenter = fieldSettings?.show_cost_center;
    const costCenterMandatory = fieldSettings?.cost_center_mandatory;

    const subAdvanceTypeOptions =
      advanceTypesData?.map((item: string) => ({
        label: item,
        value: item,
      })) || [];

    return {
      type: "form",
      display: "form",
      components: [
        {
          components: [
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
                      hidden: true,
                      defaultValue: advanceType,
                      disabled: true,
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
                      hidden: true,
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
            {
              type: "columns",
              key: "row_sub_advance_type",
              columns: [
                {
                  width: 6,
                  components: [
                    {
                      type: "select",
                      key: "advance_type",
                      label:
                        'Advance Type <span style="color:red">&nbsp;*</span>',
                      html: true,
                      input: true,
                      placeholder: "Select Advance Type",
                      dataSrc: "values",
                      data: {
                        values: subAdvanceTypeOptions,
                      },
                      defaultValue: editAdvanceData?.custom_advance_type ?? "",
                      validate: {
                        required: true,
                        customMessage: "Sub Advance Type is required",
                      },
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
                      defaultValue:
                        editAdvanceData?.posting_date ?? postingDate,
                    },
                  ],
                },
              ],
            },

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
                      defaultValue: employeeId,
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
                      defaultValue: employeeCompany,
                      disabled: true,
                    },
                  ],
                },
              ],
            },

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
                      dataSrc: "url",

                      data: {
                        url: `/api/method/chatnext_expense_trips.employee_advance.get_allowed_currencies?employee=${employeeId}&advance_type=${encodeURIComponent(
                          selectedAdvanceType || "",
                        )}&_t=${Date.now()}`,
                      },
                      selectValues: "message[0]",
                      valueProperty: "",
                      template: "<span>{{ item }}</span>",
                      defaultValue: "INR",
                    },
                  ],
                },
                {
                  width: 6,
                  components: [
                    {
                      type: "number",
                      key: "advance_amount",
                      label: getLabelWithAsterisk("Advance Amount", true),
                      html: true,
                      input: true,
                      placeholder: "Enter amount",
                      defaultValue: editAdvanceData?.advance_amount ?? "",
                      validate: {
                        required: true,
                        min: 1,
                        customMessage: "Advance Amount must be at least 1",
                      },
                    },
                  ],
                },
              ],
            },

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
                                projectMandatory,
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
                                costCenterMandatory,
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

            {
              type: "textarea",
              key: "purpose",
              label: getLabelWithAsterisk("Purpose", true),
              html: true,
              input: true,
              placeholder: "Describe the purpose of advance",
              defaultValue: editAdvanceData?.purpose ?? "",
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
    employeeId,
    employeeCompany,
    advanceType,
    postingDate,
    advanceTypesData,
    selectedAdvanceType,
  ]);

  if (isEmployeeLoading || !employeeId || !employeeCompany) {
    const skeletonContent = <AdvanceFormSkeleton />;

    if (isDesktop) {
      return (
        <DesktopLayoutWrapper title="New Expense Advance">
          {skeletonContent}
        </DesktopLayoutWrapper>
      );
    }

    return <div className="h-screen bg-white">{skeletonContent}</div>;
  }

  const FormContent = (
    <div className="flex flex-col h-full bg-white">
      <HeaderBar
        title={isEditMode ? "Edit Expense Advance" : "New Expense Advance"}
        onBack={() => navigate(-1)}
      />

      <div className="flex-1 overflow-y-auto p-4">
        {expenseAdvanceSchema ? (
          <div className="space-y-6">
            {isPolicyMissing && (
              <div className="p-4 border border-red-200 bg-red-50 rounded-lg flex flex-col items-center text-center">
                <p className="text-red-700 font-semibold text-sm lg:text-base">
                  You are not eligible for expense advances. Contact HR.
                </p>
                <p className="text-red-600 text-xs mt-1">
                  Advance Policy Not Found For Employee
                </p>
              </div>
            )}
            <Form
              form={expenseAdvanceSchema}
              onFormReady={(instance: any) => (formRef.current = instance)}
              onChange={(submission: any) => {
                const newSubType = submission?.data?.advance_type || null;

                setSubAdvanceType((prev) =>
                  prev === newSubType ? prev : newSubType,
                );

                if (newSubType !== selectedAdvanceType) {
                  setSelectedAdvanceType(newSubType);
                  if (formRef.current) {
                    const currencyField =
                      formRef.current.getComponent("currency");
                    if (currencyField) currencyField.refresh();
                  }
                }
              }}
              options={{ submitButton: false, noAlerts: true }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center p-10 border border-dashed rounded-lg">
            <p className="text-gray-500">Loading form settings...</p>
          </div>
        )}

        <div className="mt-8 border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="lg:text-lg font-semibold text-gray-800 flex items-center gap-1">
              Advance Break Up
              {Boolean(fieldSettings?.expense_table_mandatory) && (
                <span className="text-red-500">*</span>
              )}
            </h3>
            <Button
              variant="contain"
              size="md"
              onClick={() => {
                if (!selectedAdvanceType) {
                  toast.error("Please select Advance Type first before starting");
                  return;
                }
                if (isPolicyMissing) {
                  toast.error(
                    "Cannot add breakup: Advance Policy not found for this type."
                  );
                  return;
                }
                setIsExpenseModalOpen(true);
                setExpenseToEdit(null);
              }}
              disabled={isPolicyMissing}
            // className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Advance Break Up
            </Button>
          </div>

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
                                : [],
                            )
                          }
                          checked={
                            selectedExpenses.length === expenseClaims.length &&
                            expenseClaims.length > 0
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
                            ? formatToIndianDate(expense.expense_date)
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {expense.custom_amount_in_other_currency || "-"}
                        </td>

                        <td className="px-4 py-3">
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
      </div>

      <div className="sticky md:static bottom-0 right-0 w-full bg-white py-4 px-4 border-t border-gray-200">
        <div className="w-full mx-auto flex flex-row gap-3 md:gap-4 md:justify-end">
          <Button
            onClick={onClose ? onClose : () => navigate(-1)}
            size="md"
            variant="outline"
            bgColor="primary"
            className="w-full md:w-auto min-w-[150px]"
          >
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={submitting || isPolicyMissing}
            size="md"
            variant="contain"
            bgColor="primary"
            className="w-full md:w-auto min-w-[150px]"
          >
            {submitting
              ? isEditMode
                ? "Updating..."
                : "Submitting..."
              : isEditMode
                ? "Update"
                : "Submit"}
          </Button>
        </div>
      </div>

      <ExpenseBreakupModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setExpenseToEdit(null);
        }}
        onSave={expenseToEdit ? handleUpdateExpense : handleAddExpense}
        initialData={expenseToEdit}
        advanceType={selectedAdvanceType}
      />
    </div>
  );

  if (isDesktop) {
    return (
      <DesktopLayoutWrapper
        title={isEditMode ? "Edit Expense Advance" : "New Expense Advance"}
      >
        {FormContent}
      </DesktopLayoutWrapper>
    );
  }

  return <div className="h-screen bg-white">{FormContent}</div>;
};

export default ExpenseAdvanceForm;
