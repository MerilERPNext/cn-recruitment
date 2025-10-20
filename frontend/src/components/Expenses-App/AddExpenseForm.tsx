/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useState, useMemo, useEffect } from "react";
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.form.css";
import { useCurrentEmployee } from "../../hooks/useEmployee";
import {
  useGetExpenseTypeFields,
  usePostExpenseClaim,
  useCalculateExpenseAmount,
} from "../../hooks/useExpense";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useScreenSize } from "../../hooks/useScreenSize";
import HeaderBar from "../HeaderBar";
import { useNavigate } from "react-router-dom";
import ExpenseFieldSkeleton from "./ExpenseFieldSkeleton";
import { CalculateExpenseParams } from "../../types/expenseAdvance";

interface Expense {
  id: string;
  expenseCategory: string;
  expenseType: string;
  expense_date?: string;
  currency?: string;
  amount?: number;
  merchant?: string;
  invoice_number?: string;
  attach_receipt?: string | null;
  [key: string]: any;
}

const LOCAL_KEYS = {
  MAIN: "add_expense_mainForm",
  DYNAMIC: "add_expense_dynamicForm",
  EXPENSES: "add_expense_expenses",
};

const AddExpenseForm: React.FC = () => {
  const formRef = useRef<any>(null);
  const dynamicFormRef = useRef<any>(null);
  const [formKey, setFormKey] = useState<number>(0);

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEYS.EXPENSES);
      return raw ? (JSON.parse(raw) as Expense[]) : [];
    } catch {
      return [];
    }
  });

  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [dynamicFields, setDynamicFields] = useState<any[]>([]);

  const [mainFormData, setMainFormData] = useState<any>({});
  const [dynamicFormData, setDynamicFormData] = useState<any>({});

  const [showCategoryAndType, setShowCategoryAndType] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);

  const { data: currentEmployee } = useCurrentEmployee();
  const { mutate: submitExpenseClaim, isPending } = usePostExpenseClaim();

  const [calcParams, setCalcParams] = useState<
    CalculateExpenseParams | undefined
  >(undefined);

  const {
    data: calcData,
    isFetching: isFetchingCalc,
    refetch: refetchCalc,
  }: any = useCalculateExpenseAmount(calcParams);

  useEffect(() => {
    setIsCalculating(Boolean(isFetchingCalc));
  }, [isFetchingCalc]);

  const { isMobile } = useScreenSize();
  const navigate = useNavigate();

  useEffect(() => {
    const expenseType =
      mainFormData?.expenseType || mainFormData?.expense_type || null;

    if (!expenseType) {
      setDynamicFormData({});
      setDynamicFields([]);
      setCalcParams(undefined);
      setFormKey((k) => k + 1);
      try {
        dynamicFormRef.current?.reset();
      } catch (e) {
        console.error(e);
      }
      return;
    }

    setDynamicFormData({});
    setDynamicFields([]);
    setCalcParams(undefined);
    setFormKey((k) => k + 1);

    if (
      dynamicFormRef.current &&
      typeof dynamicFormRef.current.reset === "function"
    ) {
      dynamicFormRef.current.reset();
    }
  }, [mainFormData?.expenseType, mainFormData?.expense_type]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_KEYS.EXPENSES, JSON.stringify(expenses || []));
    } catch (e) {
      console.warn("Failed to persist expenses", e);
    }
  }, [expenses]);

  const clearLocal = () => {
    try {
      localStorage.removeItem(LOCAL_KEYS.EXPENSES);
    } catch (e) {
      console.warn("Failed to clear local storage keys", e);
    }
  };

  const formSchema = useMemo(
    () => ({
      display: "form",
      components: [
        {
          type: "htmlelement",
          tag: "h2",
          content: "Create New Expense",
          className: "text-xl font-semibold mb-4 hidden md:block",
        },
        {
          type: "columns",
          key: "categoryAndTypeRow",
          customClass: "flex min-w-full mt-4",
          columns: [
            {
              components: [
                {
                  type: "select",
                  key: "expenseCategory",
                  label: "Select Expense Category",
                  placeholder: "Select Expense Category",
                  dataSrc: "url",
                  data: {
                    url: `/api/method/chatnext_expense_trips.expense_claim.get_applicable_expense_categories`,
                    headers: [{ key: "Accept", value: "application/json" }],
                  },
                  selectValues: "message",
                  valueProperty: "name",
                  template: "<span>{{ item.category_name }}</span>",
                  validate: { required: true },
                  input: true,
                },
              ],
            },
            {
              components: [
                {
                  type: "select",
                  key: "expenseType",
                  label: "Select Expense Type",
                  placeholder: "Select Expense Type",
                  dataSrc: "url",
                  data: {
                    url: `/api/method/chatnext_expense_trips.expense_claim.get_expense_types_by_category?employee=${currentEmployee?.employee_number}&&reimbursement_category={{ data.expenseCategory }}`,
                    headers: [{ key: "Accept", value: "application/json" }],
                  },
                  selectValues: "message",
                  valueProperty: "name",
                  template: "<span>{{ item.name }}</span>",
                  refreshOn: "expenseCategory",
                  validate: { required: true },
                  input: true,
                  customClass: "mt-4 md:mt-0",
                },
              ],
            },
          ],
        },
      ],
    }),
    [currentEmployee]
  );

  const handleSubmit = (submission: any) => {
    console.log("Dynamic form data:", dynamicFormData);
    console.log("Form submitted:", submission.data);
    const newExpense: Expense = {
      id: Date.now().toString(),
      expenseCategory: submission.data.expenseCategory,
      expenseType: submission.data.expenseType,
    };
    setExpenses((prev) => [...prev, newExpense]);
    formRef.current?.reset();
    setShowCategoryAndType(false);
    setFormKey((k) => k + 1);
  };

  const handleCheckboxChange = (id: string) =>
    setSelectedExpenses((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleDeleteSelected = () => {
    setExpenses((prev) => prev.filter((e) => !selectedExpenses.includes(e.id)));
    setSelectedExpenses([]);
  };

  const mapFieldsToFormio = (
    fields: any[],
    isAmountReadonly: boolean = false
  ) =>
    fields
      .map((field) => {
        switch (field.fieldtype) {
          case "Date":
            return {
              type: "datetime",
              key: field.fieldname,
              label: field.label,
              format: "dd-MM-yyyy",
              enableTime: false,
              validate: { required: field.required },
              input: true,
            };
          case "Datetime":
            return {
              type: "datetime",
              key: field.fieldname,
              label: field.label,
              format: "yyyy-MM-dd HH:mm",
              enableTime: true,
              enableDate: true,
              placeholder: "Select date and time",
              widget: {
                type: "calendar",
                displayInTimezone: "viewer",
                locale: "en",
              },
              validate: { required: field.required },
              input: true,
            };
          case "Currency":
            return {
              type: "number",
              key: field.fieldname,
              label: field.label,
              validate: { required: field.required },
              input: true,
              ...(field.fieldname === "amount" && isAmountReadonly
                ? { attributes: { readonly: true } }
                : {}),
            };
          case "Data":
            return {
              type: "textfield",
              key: field.fieldname,
              label: field.label,
              validate: { required: field.required },
              input: true,
            };
          case "Text":
            return {
              type: "textarea",
              key: field.fieldname,
              label: field.label,
              validate: { required: field.required },
              rows: 5,
              input: true,
            };
          case "Attach":
            return {
              type: "file",
              key: field.fieldname,
              label: field.label || "Attachment",
              storage: "customBase64",
              validate: { required: field.required },
              input: true,
              fileTypes: [
                { label: "Documents", value: ".pdf,.doc,.docx" },
                { label: "Images", value: ".jpg,.jpeg,.png" },
              ],
              filePattern: "*/*",
              customClass: "mb-4",
            };
          case "Link":
            if (
              field.fieldname === "vehicle_type" ||
              field.options === "Daily Allowance Vehicle Category"
            ) {
              return {
                type: "select",
                key: field.fieldname,
                label: field.label,
                dataSrc: "url",
                data: {
                  url: `/api/resource/Daily%20Allowance%20Vehicle%20Category`,
                },
                selectValues: "data",
                valueProperty: "name",
                template: "<span>{{ item.name }}</span>",
                validate: { required: field.required },
                input: true,
              };
            }
            return {
              type: "select",
              key: field.fieldname,
              label: field.label,
              dataSrc: "url",
              data: {
                url: `/api/method/chatnext_expense_trips.expense_claim.get_link_options?doctype=${field.options}`,
              },
              template: "<span>{{ item.name }}</span>",
              valueProperty: "name",
              selectValues: "message",
              validate: { required: field.required },
              input: true,
            };
          default:
            return null;
        }
      })
      .filter(Boolean);

  const expenseTypeValue: string | undefined = mainFormData?.expenseType;
  const { data: expenseTypeData, isFetching: isFetchingFields } =
    useGetExpenseTypeFields(expenseTypeValue);

  useEffect(() => {
    if (!expenseTypeData?.fields) {
      setDynamicFields([]);
      return;
    }
    const isAmountReadonly = expenseTypeData?.is_amount_readonly ?? false;
    const components = mapFieldsToFormio(
      expenseTypeData.fields,
      isAmountReadonly
    );
    setDynamicFields(components);
  }, [expenseTypeData]);

  const debounceRef = useRef<number | null>(null);
  const parseUnits = (raw: any): number | undefined => {
    if (raw === null || raw === undefined) return undefined;
    const str = typeof raw === "string" ? raw.trim() : String(raw);
    if (str === "") return undefined;
    const n = Number(str);
    return Number.isFinite(n) ? n : undefined;
  };

  useEffect(() => {
    const isAmountReadonly = expenseTypeData?.is_amount_readonly ?? false;
    if (!isAmountReadonly) return;

    const rawUnits =
      dynamicFormData?.units ?? dynamicFormData?.no_of_units ?? null;
    const vehicle_type = dynamicFormData?.vehicle_type ?? null;
    const expense_type =
      dynamicFormData?.expenseType ||
      dynamicFormData?.expense_type ||
      mainFormData.expenseType ||
      mainFormData.expense_type;

    const unitsNum = parseUnits(rawUnits);

    if (!expense_type || unitsNum === undefined) return;

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    debounceRef.current = window.setTimeout(() => {
      const payload: CalculateExpenseParams = {
        expense_type: String(expense_type).trim(),
        units: unitsNum,
      };
      if (
        vehicle_type !== null &&
        vehicle_type !== undefined &&
        vehicle_type !== ""
      ) {
        payload.vehicle_type = vehicle_type;
      }

      setCalcParams(payload);
    }, 700);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dynamicFormData?.units,
    dynamicFormData?.no_of_units,
    dynamicFormData?.vehicle_type,
    expenseTypeData?.is_amount_readonly,
    mainFormData.expenseType,
    mainFormData.expense_type,
  ]);

  useEffect(() => {
    if (!calcData) return;
    const amount =
      (calcData &&
        (calcData.message?.amount ??
          calcData.amount ??
          calcData.data?.amount)) ??
      null;
    if (amount !== null && amount !== undefined) {
      const numeric = Number(amount);
      setDynamicFormData((prev: any) => ({
        ...prev,
        amount: numeric,
      }));
      toast.success("Amount calculated.");
    } else {
      toast.error("Calculate API returned no amount.");
    }
  }, [calcData]);

  const submitAll = () => {
    const payload = {
      employee: currentEmployee?.employee_number,
      employee_name: currentEmployee?.employee_name,
      company: currentEmployee?.company,
      posting_date: new Date().toISOString().split("T")[0],
      expenses: expenses.map(
        (
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          { id, submitButton, expenseType, expenseCategory, ...rest }
        ) => {
          const filteredRest = Object.fromEntries(
            Object.entries(rest).filter(
              ([, value]) =>
                value !== null && value !== undefined && value !== ""
            )
          );

          if (filteredRest.expense_date) {
            filteredRest.expense_date = format(
              new Date(filteredRest.expense_date),
              "yyyy-MM-dd"
            );
          }
          if (filteredRest.start_datetime) {
            filteredRest.start_datetime = format(
              new Date(filteredRest.start_datetime),
              "yyyy-MM-dd HH:mm:ss"
            );
          }
          if (filteredRest.end_datetime) {
            filteredRest.end_datetime = format(
              new Date(filteredRest.end_datetime),
              "yyyy-MM-dd HH:mm:ss"
            );
          }

          return {
            ...filteredRest,
            expense_type: expenseType,
            reimbursement_category: expenseCategory,
          };
        }
      ),
    };

    submitExpenseClaim(JSON.stringify(payload), {
      onSuccess: () => {
        clearLocal();
      },
    } as any);
  };

  return (
    <>
      {!isMobile && (
        <HeaderBar title="Add Expense" onBack={() => navigate(-1)} />
      )}
      <div
        className={`${
          isMobile
            ? "fixed inset-0 bg-white z-50 overflow-y-auto pb-4"
            : "max-w-4xl mx-auto p-4 pt-0"
        }`}
      >
        {isMobile && (
          <HeaderBar title="Add Expense" onBack={() => navigate(-1)} />
        )}
        <div className="px-4 md:px-0">
          {(showCategoryAndType || expenses.length === 0) && (
            <Form
              key={formKey}
              ref={formRef}
              form={formSchema}
              submission={{ data: mainFormData }}
              onChange={(change: any) => {
                setMainFormData(change.data);
              }}
              onSubmit={handleSubmit}
              options={{ noAlerts: true }}
            />
          )}

          {expenseTypeValue && isFetchingFields && (
            <ExpenseFieldSkeleton columns={isMobile ? 1 : 2} />
          )}

          {dynamicFields.length > 0 && !isFetchingFields && (
            <div className="mt-4">
              <Form
                key={`dynamic-${formKey}`}
                ref={dynamicFormRef}
                submission={{ data: dynamicFormData }}
                form={{
                  display: "form",
                  components: (() => {
                    if (isMobile) {
                      return [
                        ...dynamicFields.map((comp) => comp),
                        {
                          type: "button",
                          action: "submit",
                          label: isCalculating ? "Calculating..." : "Save",
                          theme: "primary",
                          key: "submitButton",
                          customClass: "mt-4",
                          disabled: isCalculating,
                        },
                      ];
                    }

                    return [
                      {
                        type: "columns",
                        key: "dynamicColumns",
                        columns: [
                          {
                            components: dynamicFields.filter(
                              (_, i) => i % 2 === 0
                            ),
                          },
                          {
                            components: dynamicFields.filter(
                              (_, i) => i % 2 !== 0
                            ),
                          },
                        ],
                      },
                      {
                        type: "button",
                        action: "submit",
                        label: isCalculating ? "Calculating..." : "Save",
                        theme: "primary",
                        key: "submitButton",
                        customClass: "mt-4",
                      },
                    ];
                  })(),
                }}
                onSubmit={async (submission: any) => {
                  const combinedData = {
                    ...mainFormData,
                    ...submission.data,
                  };

                  if (
                    !combinedData.expenseCategory ||
                    !combinedData.expenseType
                  ) {
                    toast.error(
                      "Please select Expense Category and Expense Type!"
                    );
                    return;
                  }

                  const isAmountReadonly =
                    expenseTypeData?.is_amount_readonly ?? false;
                  let amountFromApi: number | undefined = undefined;

                  if (isAmountReadonly) {
                    const currentParams: CalculateExpenseParams = {
                      expense_type:
                        combinedData.expenseType || combinedData.expense_type,
                      units:
                        combinedData.units ?? combinedData.no_of_units ?? null,
                    };

                    if (
                      combinedData.vehicle_type !== undefined &&
                      combinedData.vehicle_type !== null &&
                      combinedData.vehicle_type !== ""
                    ) {
                      currentParams.vehicle_type = combinedData.vehicle_type;
                    }

                    let usedCalcData = calcData;
                    const calcMatches =
                      calcData &&
                      calcParams &&
                      calcParams.expense_type === currentParams.expense_type &&
                      String(calcParams.units) ===
                        String(currentParams.units) &&
                      (calcParams.vehicle_type ?? "") ===
                        (currentParams.vehicle_type ?? "");

                    if (!calcMatches) {
                      setCalcParams(currentParams);
                      try {
                        setIsCalculating(true);
                        toast.loading("Calculating amount...", { id: "calc" });
                        const refRes = await refetchCalc();
                        usedCalcData = refRes?.data ?? usedCalcData;
                      } catch (err: any) {
                        console.error("refetch calc error", err);
                      } finally {
                        setIsCalculating(false);
                        toast.dismiss("calc");
                      }
                    }

                    const amount =
                      (usedCalcData &&
                        (usedCalcData.message?.amount ??
                          usedCalcData.amount ??
                          usedCalcData.data?.amount)) ??
                      null;

                    if (amount !== null && amount !== undefined) {
                      amountFromApi = Number(amount);
                      setDynamicFormData((prev: any) => ({
                        ...prev,
                        ...submission.data,
                        amount: amountFromApi,
                      }));
                      toast.success("Amount calculated and filled.");
                    } else {
                      setDynamicFormData((prev: any) => ({
                        ...prev,
                        ...submission.data,
                      }));
                      toast.error("No amount returned from calculate API.");
                    }
                  } else {
                    setDynamicFormData((prev: any) => ({
                      ...prev,
                      ...submission.data,
                    }));
                    amountFromApi = combinedData.amount ?? undefined;
                  }

                  const attachment =
                    combinedData.attach_receipt?.[0]?.url || null;

                  const newExpense: Expense = {
                    id: Date.now().toString(),
                    ...combinedData,
                    attach_receipt: attachment,
                    amount: amountFromApi ?? combinedData.amount ?? undefined,
                  };

                  setExpenses((prev) => [...prev, newExpense]);

                  formRef.current?.reset();
                  dynamicFormRef.current?.reset();
                  setMainFormData({});
                  setDynamicFormData({});
                  setDynamicFields([]);
                  setShowCategoryAndType(false);
                  setFormKey((prev) => prev + 1);
                }}
                onChange={(change: any) => {
                  setDynamicFormData(change.data);

                  const isAmountReadonly =
                    expenseTypeData?.is_amount_readonly ?? false;
                  if (isAmountReadonly) {
                    const rawUnits =
                      change.data?.units ?? change.data?.no_of_units ?? null;
                    const unitsStr =
                      rawUnits === null || rawUnits === undefined
                        ? null
                        : String(rawUnits).trim();
                    const vehicle_type = change.data?.vehicle_type ?? null;
                    const expense_type =
                      change.data?.expenseType ||
                      change.data?.expense_type ||
                      mainFormData.expenseType ||
                      mainFormData.expense_type;

                    if (expense_type && unitsStr !== null && unitsStr !== "") {
                      if (debounceRef.current) {
                        window.clearTimeout(debounceRef.current);
                      }

                      const rawUnits =
                        dynamicFormData?.units ??
                        dynamicFormData?.no_of_units ??
                        null;
                      const unitsNum = parseUnits(rawUnits);
                      if (unitsNum === undefined) return;
                      debounceRef.current = window.setTimeout(() => {
                        const payload: CalculateExpenseParams = {
                          expense_type: String(expense_type).trim(),
                          units: unitsNum,
                        };
                        if (
                          vehicle_type !== null &&
                          vehicle_type !== undefined &&
                          vehicle_type !== ""
                        ) {
                          payload.vehicle_type = vehicle_type;
                        }

                        setCalcParams(payload);
                      }, 700);
                    }
                  }
                }}
              />
            </div>
          )}
          {expenses.length > 0 && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Expense List</h2>
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedExpenses.length === 0}
                  className={`px-4 py-2 rounded ${
                    selectedExpenses.length === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-red-500 text-white hover:bg-red-600"
                  }`}
                >
                  Delete Selected
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="w-12 px-4 py-2 text-left">
                        <input
                          type="checkbox"
                          onChange={(e) =>
                            setSelectedExpenses(
                              e.target.checked ? expenses.map((e) => e.id) : []
                            )
                          }
                          checked={
                            selectedExpenses.length === expenses.length &&
                            expenses.length > 0
                          }
                        />
                      </th>
                      <th className="px-4 py-2 text-left">Expense Category</th>
                      <th className="px-4 py-2 text-left">Expense Type</th>
                      <th className="px-4 py-2 text-left">Expense Date</th>
                      <th className="px-4 py-2 text-left">Merchant</th>
                      <th className="px-4 py-2 text-left">Invoice Number</th>
                      <th className="px-4 py-2 text-left">Amount</th>
                      <th className="px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr
                        key={expense.id}
                        className="border-t border-gray-200 hover:bg-gray-50"
                      >
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={selectedExpenses.includes(expense.id)}
                            onChange={() => handleCheckboxChange(expense.id)}
                          />
                        </td>
                        <td className="px-4 py-2">{expense.expenseCategory}</td>
                        <td className="px-4 py-2">{expense.expenseType}</td>
                        <td className="px-4 py-2">
                          {expense.expense_date
                            ? format(
                                new Date(expense.expense_date),
                                "dd-MM-yyyy"
                              )
                            : "-"}
                        </td>
                        <td className="px-4 py-2">{expense.merchant || "-"}</td>
                        <td className="px-4 py-2">
                          {expense.invoice_number || "-"}
                        </td>
                        <td className="px-4 py-2">{expense.amount ?? "-"}</td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => {
                              setExpenses((prev) =>
                                prev.filter((e) => e.id !== expense.id)
                              );
                              setSelectedExpenses((prev) =>
                                prev.filter((id) => id !== expense.id)
                              );
                            }}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  className="bg-blue-500 text-white font-bold px-6 py-2 rounded hover:bg-blue-600 mr-4"
                  onClick={() => {
                    setShowCategoryAndType(true);
                    setFormKey((prev) => prev + 1);
                  }}
                >
                  Add More
                </button>

                <button
                  className="bg-green-600 text-white font-bold px-6 py-2 rounded hover:bg-green-700"
                  disabled={expenses.length === 0 || isPending}
                  onClick={submitAll}
                >
                  {isPending ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AddExpenseForm;
