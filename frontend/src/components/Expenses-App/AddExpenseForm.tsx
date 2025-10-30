/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useState, useMemo, useEffect } from "react";
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.form.css";
import { useCurrentEmployee, useEmployees } from "../../hooks/useEmployee";
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
import { SquarePen, Trash2 } from "lucide-react";
import ParticipantsDrawer from "./ParticipantDrawer";
import { Employee } from "../../types/employee";

export interface EmployeeOption {
  name: string;
  employee_name?: string;
}

interface Expense {
  uid: string;
  expenseCategory: string;
  expenseType: string;
  expense_date?: string;
  currency?: string;
  amount?: number;
  merchant?: string;
  invoice_number?: string;
  attach_receipt?: string | { url: string }[] | null;
  [key: string]: any;
}
interface ExpenseSubmissionResponse {
  uid_status: Record<string, "success" | "failed">;

  message: {
    success: boolean;
    message: string;
    claims: {
      name: string;
      category: string;
      category_name: string;
      total_amount: number;
      expense_count: number;
      expense_types: string[];
    }[];
  };
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

  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [failedExpenseUids, setFailedExpenseUids] = useState<Set<string>>(
    new Set()
  );

  const [isSharePanelOpen, setIsSharePanelOpen] = useState(false);

  const { data: currentEmployee } = useCurrentEmployee();
  const { data: employeesList, isFetching: isLoadingEmployees } = useEmployees([
    "name",
    "employee_name",
  ]);
  const employeeOptionsForDrawer: EmployeeOption[] = (employeesList || []).map(
    (e: Employee) => ({
      name: e.name,
      employee_name: e.employee_name || e.name,
    })
  );
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
    // setDynamicFormData((prev: any) => prev ?? {});
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

  const clearFailedStatus = (uids: string | string[]) => {
    const uidsArray = Array.isArray(uids) ? uids : [uids];
    setFailedExpenseUids((prev) => {
      const newSet = new Set(prev);
      uidsArray.forEach((uid) => newSet.delete(uid));
      return newSet;
    });
  };

  const displayParticipants = useMemo(() => {
    if (editingExpenseId) {
      const e = expenses.find((x) => x.uid === editingExpenseId);
      if (e && Array.isArray(e.participants)) return e.participants;
    }
    if (
      dynamicFormData?.participants &&
      Array.isArray(dynamicFormData.participants)
    ) {
      return dynamicFormData.participants;
    }
    return [];
  }, [editingExpenseId, expenses, dynamicFormData]);
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
                    url: `/api/method/chatnext_expense_trips.expense_claim.get_expense_types_by_category?employee=${currentEmployee?.name}&&reimbursement_category={{ data.expenseCategory }}`,
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
    setMainFormData(submission.data);
    setShowCategoryAndType(false);
    setFormKey((k) => k + 1);
  };

  const handleCheckboxChange = (id: string) =>
    setSelectedExpenses((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleDeleteSelected = () => {
    setExpenses((prev) =>
      prev.filter((e) => !selectedExpenses.includes(e.uid))
    );
    // Clear failed status for deleted expenses
    clearFailedStatus(selectedExpenses);
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
              field.fieldname === "currency" &&
              field.options === "Currency"
            ) {
              const expenseClaimType =
                mainFormData?.expenseType || mainFormData?.expense_type || "";

              const url = expenseClaimType
                ? `/api/method/chatnext_expense_trips.expense_claim.get_allowed_currencies_for_expense_claim_type?expense_claim_type=${encodeURIComponent(
                    String(expenseClaimType)
                  )}`
                : `/api/method/chatnext_expense_trips.expense_claim.get_allowed_currencies_for_expense_claim_type`;
              return {
                type: "select",
                key: field.fieldname,
                label: field.label,
                dataSrc: "url",
                data: {
                  url,
                },
                selectValues: "message.currencies",
                template: "<span>{{ item }}</span>",
                defaultValue: "INR",
                valueProperty: "",
                validate: { required: field.required },
                input: true,
                refreshOn: "expenseType",
              };
            }
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

  const isShareAllowed = Boolean(expenseTypeData?.shared_expense_allowed);

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

  useEffect(() => {
    if (isSharePanelOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSharePanelOpen]);

  const submitAll = () => {
    const participantsForClaim: any[] =
      (dynamicFormData?.participants &&
      Array.isArray(dynamicFormData.participants)
        ? dynamicFormData.participants
        : null) ||
      expenses.flatMap((e) =>
        Array.isArray(e.participants) ? e.participants : []
      );

    const payload = {
      employee: currentEmployee?.name,
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
      participants: participantsForClaim || [],
    };

    submitExpenseClaim(JSON.stringify(payload), {
      onSuccess: (response: ExpenseSubmissionResponse) => {
        const uidStatus = response?.uid_status || {};

        // Separate successful and failed expenses
        const failedUids: string[] = [];
        const successfulUids: string[] = [];

        Object.entries(uidStatus).forEach(([uid, status]) => {
          if (status === "success") {
            successfulUids.push(uid);
          } else {
            failedUids.push(uid);
          }
        });

        // Filter out successful expenses, keep failed ones
        const remainingExpenses = expenses.filter((expense) =>
          failedUids.includes(expense.uid)
        );

        // Update state with failed expenses
        setExpenses(remainingExpenses);
        setFailedExpenseUids(new Set(failedUids));

        // Clear localStorage and update with failed expenses only
        if (remainingExpenses.length > 0) {
          localStorage.setItem(
            LOCAL_KEYS.EXPENSES,
            JSON.stringify(remainingExpenses)
          );

          // Show error message for failed items
          toast.error(
            `${failedUids.length} expense item(s) failed to submit. Please review and try again.`
          );
        } else {
          // All successful, clear everything
          clearLocal();
          toast.success("All expenses submitted successfully!");
        }

        // Show success message for successful items
        if (successfulUids.length > 0) {
          toast.success(
            `${successfulUids.length} expense item(s) submitted successfully!`
          );
        }
      },
    } as any);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpenseId(expense.uid);
    setMainFormData({
      expenseCategory: expense.expenseCategory,
      expenseType: expense.expenseType,
    });

    const copy = { ...expense };
    if (expense.attach_receipt && typeof expense.attach_receipt === "string") {
      copy.attach_receipt = [{ url: expense.attach_receipt }];
    }
    setDynamicFormData(copy);
    setShowCategoryAndType(true);
    setFormKey((k) => k + 1);

    // Clear failed status when editing
    clearFailedStatus(expense.uid);
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
                    uid: editingExpenseId ?? Date.now().toString(),
                    ...combinedData,
                    attach_receipt: attachment,
                    amount: amountFromApi ?? combinedData.amount ?? undefined,
                  };

                  if (editingExpenseId) {
                    setExpenses((prev) =>
                      prev.map((e) =>
                        e.uid === editingExpenseId ? newExpense : e
                      )
                    );
                  } else {
                    setExpenses((prev) => [...prev, newExpense]);
                  }
                  setEditingExpenseId(null);
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
              {displayParticipants && displayParticipants.length > 0 && (
                <div className="mt-4 border rounded p-3 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">Participants</div>
                    <div className="text-xs text-gray-500">
                      {displayParticipants.length}{" "}
                      {displayParticipants.length === 1
                        ? "participant"
                        : "participants"}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-600">
                          <th className="px-2 py-1">#</th>
                          <th className="px-2 py-1">Type</th>
                          <th className="px-2 py-1">Employee / Name</th>
                          <th className="px-2 py-1">Percentage</th>
                          <th className="px-2 py-1">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayParticipants.map((p: any, idx: number) => (
                          <tr key={idx} className="border-t">
                            <td className="px-2 py-2 align-top">{idx + 1}</td>
                            <td className="px-2 py-2 align-top">
                              {p.employee_type ?? "-"}
                            </td>
                            <td className="px-2 py-2 align-top">
                              {p.employee
                                ? p.employee
                                : p.guest_name
                                ? p.guest_name
                                : "-"}
                              {p.employee_label ? (
                                <div className="text-xs text-gray-500">
                                  {p.employee_label}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-2 py-2 align-top">
                              {p.percentage !== undefined &&
                              p.percentage !== null
                                ? `${p.percentage}%`
                                : "-"}
                            </td>
                            <td className="px-2 py-2 align-top">
                              {p.amount !== undefined && p.amount !== null
                                ? `INR ${Number(p.amount).toFixed(2)}`
                                : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                {isShareAllowed && (
                  <button
                    type="button"
                    onClick={() => setIsSharePanelOpen(true)}
                    className={`font-semibold px-4 py-2 rounded 
                            ${
                              (editingExpenseId
                                ? expenses.find(
                                    (x) => x.uid === editingExpenseId
                                  )?.amount ?? dynamicFormData?.amount
                                : dynamicFormData?.amount) > 0
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-gray-400 text-gray-200 cursor-not-allowed"
                            }`}
                    disabled={
                      !(
                        (editingExpenseId
                          ? expenses.find((x) => x.uid === editingExpenseId)
                              ?.amount ?? dynamicFormData?.amount
                          : dynamicFormData?.amount) > 0
                      )
                    }
                  >
                    Add Share
                  </button>
                )}
              </div>
            </div>
          )}
          {expenses.length > 0 && (
            <div className="mt-8">
              {failedExpenseUids.size > 0 && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-red-600 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-red-800">
                        Submission Failed for {failedExpenseUids.size} item(s)
                      </h3>
                      <p className="mt-1 text-sm text-red-700">
                        The highlighted expense items below failed to submit.
                        Please review and correct them, then try submitting
                        again.
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
                              e.target.checked ? expenses.map((e) => e.uid) : []
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
                    {expenses.map((expense) => {
                      const isFailed = failedExpenseUids.has(expense.uid);
                      return (
                        <tr
                          key={expense.uid}
                          className={`border-t border-gray-200 hover:bg-gray-50 ${
                            isFailed ? "bg-red-50 border-red-200" : ""
                          }`}
                        >
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={selectedExpenses.includes(expense.uid)}
                              onChange={() => handleCheckboxChange(expense.uid)}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              {expense.expenseCategory}
                              {isFailed && (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                                  Failed
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2">{expense.expenseType}</td>
                          <td className="px-4 py-2">
                            {expense.expense_date
                              ? format(
                                  new Date(expense.expense_date),
                                  "dd-MM-yyyy"
                                )
                              : "-"}
                          </td>
                          <td className="px-4 py-2">
                            {expense.merchant || "-"}
                          </td>
                          <td className="px-4 py-2">
                            {expense.invoice_number || "-"}
                          </td>
                          <td className="px-4 py-2">{expense.amount ?? "-"}</td>
                          <td className="px-4 py-2 flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(expense)}
                              className="text-blue-400 hover:text-green-800"
                              title="Edit"
                            >
                              <SquarePen />
                            </button>
                            <button
                              onClick={() => {
                                setExpenses((prev) =>
                                  prev.filter((e) => e.uid !== expense.uid)
                                );
                                setSelectedExpenses((prev) =>
                                  prev.filter((id) => id !== expense.uid)
                                );
                                // Clear failed status when deleting
                                clearFailedStatus(expense.uid);
                              }}
                              className="text-red-400 hover:text-blue-700"
                              title="Delete"
                            >
                              <Trash2 />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  className="bg-blue-500 text-white font-bold px-6 py-2 rounded hover:bg-blue-600 mr-4"
                  onClick={() => {
                    setShowCategoryAndType(true);
                    setFormKey((prev) => prev + 1);
                    setEditingExpenseId(null);
                    setMainFormData({});
                    setDynamicFormData({});
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

      {isSharePanelOpen && (
        <ParticipantsDrawer
          isOpen={isSharePanelOpen}
          onClose={() => setIsSharePanelOpen(false)}
          expenseAmount={Number(
            (editingExpenseId
              ? expenses.find((x) => x.uid === editingExpenseId)?.amount ??
                dynamicFormData?.amount
              : dynamicFormData?.amount) ?? 0
          )}
          editingExpenseId={editingExpenseId}
          expenses={expenses}
          setExpenses={(fn) => setExpenses(fn)}
          currentEmployee={currentEmployee || undefined}
          maxParticipants={5}
          employeeOptions={employeeOptionsForDrawer}
          employeeOptionsLoading={isLoadingEmployees as boolean}
          onSave={(formattedParticipants) => {
            if (editingExpenseId) {
              setExpenses((prev) =>
                prev.map((e) =>
                  e.uid === editingExpenseId
                    ? { ...e, participants: formattedParticipants }
                    : e
                )
              );
            } else {
              setDynamicFormData((prev: any) => ({
                ...(prev || {}),
                participants: formattedParticipants,
              }));
            }
          }}
        />
      )}
    </>
  );
};

export default AddExpenseForm;
