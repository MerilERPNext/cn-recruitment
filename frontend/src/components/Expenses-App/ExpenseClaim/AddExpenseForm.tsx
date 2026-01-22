/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useState, useMemo, useEffect } from "react";
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.form.css";
import { useCurrentEmployee, useEmployees } from "../../../hooks/useEmployee";
import {
  useGetExpenseTypeFields,
  usePostExpenseClaim,
  useCalculateExpenseAmount,
  useGetUnitPrice,
  useUpdateExpense,
  useGetExpenseCategoryTypes,
} from "../../../hooks/useExpense";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useScreenSize } from "../../../hooks/useScreenSize";
import HeaderBar from "../../HeaderBar";
import { useNavigate } from "react-router-dom";
import ExpenseFieldSkeleton from "./ExpenseFieldSkeleton";
import { CalculateExpenseParams } from "../../../types/expenseAdvance";
import { SquarePen, Trash2 } from "lucide-react";
import ParticipantsDrawer from "./ParticipantDrawer";
import { Employee } from "../../../types/employee";
import DesktopLayoutWrapper from "../../DesktopLayoutWrapper";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { useLoadingOverlay } from "../../../context/OverlayContext";

export interface EmployeeOption {
  name: string;
  employee_name?: string;
}

interface AddExpenseFormProps {
  initialExpense?: Expense | null;
  expense_claim_name?: string | null;
  isEditingFromDetailsPage?: boolean;
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
  attach_receipt?:
    | {
        name: string;
        size: number;
        url: string;
      }[]
    | string;
  [key: string]: any;
}

const LOCAL_KEYS = {
  MAIN: "add_expense_mainForm",
  DYNAMIC: "add_expense_dynamicForm",
  EXPENSES: "add_expense_expenses",
};

const AddExpenseForm: React.FC<AddExpenseFormProps> = ({
  initialExpense,
  expense_claim_name,
  isEditingFromDetailsPage = false,
}) => {
  const formRef = useRef<any>(null);
  const dynamicFormRef = useRef<any>(null);
  const [expenseTypeKey, setExpenseTypeKey] = useState(0);
  const [formKey, setFormKey] = useState<number>(0);
  const [vehicleType, setVehicleType] = useState<string | null>(null);
  const [previousCategory, setPreviousCategory] = useState<string | null>(null);
  const [selectedCategoryType, setSelectedCategoryType] =
    useState<string>("General");

  const { data: categoryTypes } = useGetExpenseCategoryTypes();

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

  const [mainFormData, setMainFormData] = useState<any>({
    categoryType: "General",
  });
  const [dynamicFormData, setDynamicFormData] = useState<any>({});

  const [showCategoryAndType, setShowCategoryAndType] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);

  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [failedExpenseUids, setFailedExpenseUids] = useState<Set<string>>(
    new Set(),
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
    }),
  );
  const { mutate: submitExpenseClaim, isPending } = usePostExpenseClaim();

  const { mutate: updateExpense, isPending: isUpdating } = useUpdateExpense();

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

  const { isMobile, isDesktop } = useScreenSize();
  const navigate = useNavigate();

  useEffect(() => {
    if (!initialExpense) return;
    setEditingExpenseId(initialExpense.uid);
    const copy: any = { ...initialExpense };

    if (typeof copy.custom_attach_receipt === "string") {
      copy.attach_receipt = [
        {
          name: copy.custom_attach_receipt.split("/").pop() || "attachment",
          size: 4000,
          url: copy.custom_attach_receipt,
          storage: "url",
          originalName:
            copy.custom_attach_receipt.split("/").pop() || "attachment",
        },
      ];
    }
    console.log(previousCategory);
    setDynamicFormData(copy);
    setMainFormData({
      categoryType: initialExpense.categoryType || "General",
      expenseCategory: initialExpense.expenseCategory,
      expenseType: initialExpense.expenseType,
    });
    setSelectedCategoryType(initialExpense.categoryType || "General");
    setShowCategoryAndType(true);
    setFormKey((k) => k + 1);
    clearFailedStatus(initialExpense.uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialExpense]);

  // FIX 1: Reset dynamic form when expense type changes (not in edit mode)
  useEffect(() => {
    const expenseType =
      mainFormData?.expenseType || mainFormData?.expense_type || null;

    if (editingExpenseId) {
      return;
    }

    if (expenseType) {
      setDynamicFormData({});
      setCalcParams(undefined);
      setVehicleType(null);
      setFormKey((k) => k + 1);

      if (
        dynamicFormRef.current &&
        typeof dynamicFormRef.current.reset === "function"
      ) {
        try {
          dynamicFormRef.current.reset();
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [mainFormData?.expenseType, mainFormData?.expense_type, editingExpenseId]);

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
          type: "select",
          key: "categoryType",
          label: 'Select Category Type <span style="color:red">&nbsp;*</span>',
          placeholder: "Select Category Type",
          dataSrc: "custom",
          data: {
            custom: `values = data.categoryTypeOptions || [];`,
          },
          validate: {
            required: true,
            customMessage: "Category Type is required",
          },
          input: true,
          html: true,
          customClass: "mt-4",
          disabled: !!editingExpenseId,
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
                  label:
                    'Select Expense Category <span style="color:red">&nbsp;*</span>',
                  placeholder: "Select Expense Category",
                  dataSrc: "url",
                  data: {
                    url: `/api/method/chatnext_expense_trips.expense_claim.get_applicable_expense_categories?category_type={{ data.categoryType }}`,
                    headers: [{ key: "Accept", value: "application/json" }],
                  },
                  selectValues: "message",
                  valueProperty: "name",
                  template: "<span>{{ item.category_name }}</span>",
                  validate: {
                    required: true,
                    customMessage: "Expense Category is required",
                  },
                  input: true,
                  html: true,
                  clearOnRefresh: true,
                  disabled: !!editingExpenseId,
                },
              ],
            },
            {
              components: [
                {
                  type: "select",
                  key: "expenseType",
                  label:
                    'Select Expense Type <span style="color:red">&nbsp;*</span>',
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
                  clearOnRefresh: true,
                  clearOnHide: true,
                  validate: {
                    required: true,
                    customMessage: "Expense Type is required",
                  },
                  input: true,
                  customClass: "mt-4 md:mt-0",
                  html: true,
                  disabled: !!editingExpenseId,
                  redrawOn: "expenseCategory",
                },
              ],
            },
          ],
        },
      ],
    }),
    [currentEmployee, editingExpenseId],
  );

  // FIX 2: Set previousCategory in handleSubmit
  const handleSubmit = (submission: any) => {
    setMainFormData(submission.data);
    setPreviousCategory(submission.data.expenseCategory);
    setShowCategoryAndType(false);
    setFormKey((k) => k + 1);
  };

  const handleCheckboxChange = (id: string) =>
    setSelectedExpenses((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleDeleteSelected = () => {
    setExpenses((prev) =>
      prev.filter((e) => !selectedExpenses.includes(e.uid)),
    );
    clearFailedStatus(selectedExpenses);
    setSelectedExpenses([]);
  };

  const mapFieldsToFormio = (
    fields: any[],
    isAmountReadonly: boolean = false,
  ) =>
    fields
      .map((field) => {
        switch (field?.fieldtype) {
          case "Date":
            return {
              type: "datetime",
              key: field?.fieldname,
              label:
                field?.required === true
                  ? `${field?.label} <span style="color:red">&nbsp;*</span>`
                  : field?.label,
              format: "dd-MM-yyyy",
              enableTime: false,
              validate: {
                required: field?.required,
                customMessage: `${field?.label} is required`,
              },
              input: true,
              html: true,
            };
          case "Datetime":
            return {
              type: "datetime",
              key: field?.fieldname,
              label:
                field?.required === true
                  ? `${field?.label} <span style="color:red">&nbsp;*</span>`
                  : field?.label,
              format: "dd-MM-yyyy HH:mm",
              enableTime: true,
              enableDate: true,
              placeholder: "Select date and time",
              widget: {
                type: "calendar",
                displayInTimezone: "viewer",
                locale: "en",
              },
              validate: {
                required: field?.required,
                customMessage: `${field?.label} is required`,
              },
              input: true,
              html: true,
            };
          case "Currency":
            return {
              type: "number",
              key: field?.fieldname,
              label:
                field?.required === true
                  ? `${field?.label} <span style="color:red">&nbsp;*</span>`
                  : field?.label,
              validate: {
                required: field?.required,
                customMessage: `${field?.label} is required`,
              },
              input: true,
              ...(field?.fieldname === "amount" && isAmountReadonly
                ? { attributes: { readonly: true } }
                : {}),
              html: true,
            };
          case "Data":
            if (
              field?.fieldname === "units" ||
              field?.fieldname === "no_of_units"
            ) {
              return {
                type: "number",
                key: field?.fieldname,
                label:
                  field?.required === true
                    ? `${unitFieldLabel} <span style="color:red">&nbsp;*</span>`
                    : unitFieldLabel,
                validate: {
                  required: field?.required,
                  customMessage: `${field?.label} is required`,
                },
                input: true,
                html: true,
              };
            }
            return {
              type: "textfield",
              key: field?.fieldname,
              label:
                field?.required === true
                  ? `${field?.label} <span style="color:red">&nbsp;*</span>`
                  : field?.label,
              validate: {
                required: field?.required,
                customMessage: `${field?.label} is required`,
              },
              input: true,
              html: true,
            };
          case "Text":
            return {
              type: "textarea",
              key: field?.fieldname,
              label:
                field?.required === true
                  ? `${field?.label} <span style="color:red">&nbsp;*</span>`
                  : field?.label,
              validate: {
                required: field?.required,
                customMessage: `${field?.label} is required`,
              },
              rows: 5,
              input: true,
              html: true,
            };
          case "Attach":
            return {
              type: "file",
              key: field?.fieldname,
              label:
                field?.required === true
                  ? `${field?.label} <span style="color:red">&nbsp;*</span>`
                  : field?.label || "Attachment",
              storage: "customBase64",
              validate: {
                required: field?.required,
                customMessage: `${field?.label} is required`,
              },
              input: true,
              filePattern: "*/*",
              customClass: "mb-4",
              html: true,
            };
          case "Link":
            if (
              field?.fieldname === "currency" &&
              field?.options === "Currency"
            ) {
              const expenseClaimType =
                mainFormData?.expenseType || mainFormData?.expense_type || "";
              const url = expenseClaimType
                ? `/api/method/chatnext_expense_trips.expense_claim.get_allowed_currencies_for_expense_claim_type?expense_claim_type=${encodeURIComponent(
                    String(expenseClaimType),
                  )}`
                : `/api/method/chatnext_expense_trips.expense_claim.get_allowed_currencies_for_expense_claim_type`;
              return {
                type: "select",
                key: field?.fieldname,
                label:
                  field?.required === true
                    ? `${field?.label} <span style="color:red">&nbsp;*</span>`
                    : field?.label,
                dataSrc: "url",
                data: {
                  url,
                },
                selectValues: "message.currencies",
                template: "<span>{{ item }}</span>",
                defaultValue: "INR",
                valueProperty: "",
                searchEnabled: false,
                validate: {
                  required: field?.required,
                  customMessage: `${field?.label} is required`,
                },
                input: true,
                refreshOn: "expenseType",
                html: true,
              };
            }
            if (
              field?.fieldname === "vehicle_type" ||
              field?.options === "Daily Allowance Vehicle Category"
            ) {
              const claimType =
                mainFormData?.expenseType || mainFormData?.expense_type || "";
              const employeeName = currentEmployee?.name || "";
              return {
                type: "select",
                key: field?.fieldname,
                label:
                  field?.required === true
                    ? `${field?.label} <span style="color:red">&nbsp;*</span>`
                    : field?.label,
                dataSrc: "url",
                data: {
                  url: `/api/method/chatnext_expense_trips.expense_claim.get_applicable_vehicle_types?employee=${employeeName}&claim_type=${claimType}`,
                },
                selectValues: "message",
                valueProperty: "name",
                template: "<span>{{ item.vehicle_category }}</span>",
                validate: {
                  required: field?.required,
                  customMessage: `${field?.label} is required`,
                },
                input: true,
                searchEnabled: false,
                refreshOn: "expenseType",
                clearOnRefresh: true,
                html: true,
              };
            }
            return {
              type: "select",
              key: field?.fieldname,
              label:
                field?.required === true
                  ? `${field?.label} <span style="color:red">&nbsp;*</span>`
                  : field?.label,
              dataSrc: "url",
              data: {
                url: `/api/method/chatnext_expense_trips.expense_claim.get_link_options?doctype=${field?.options}`,
              },
              template: "<span>{{ item.name }}</span>",
              valueProperty: "name",
              selectValues: "message",
              validate: {
                required: field?.required,
                customMessage: `${field?.label} is required`,
              },
              input: true,
              html: true,
            };
          default:
            return null;
        }
      })
      .filter(Boolean);

  const expenseTypeValue = useMemo(
    () => mainFormData?.expenseType || undefined,
    [mainFormData?.expenseType, expenseTypeKey],
  );

  const { data: expenseTypeData, isFetching: isFetchingFields } =
    useGetExpenseTypeFields(expenseTypeValue);

  const claimTypeValue =
    mainFormData?.expenseType ?? mainFormData?.expense_type;

  const { data: unitPriceData } = useGetUnitPrice(
    claimTypeValue,
    vehicleType || undefined,
  );

  const unitFieldLabel = useMemo(() => {
    if (
      unitPriceData &&
      typeof unitPriceData === "object" &&
      "message" in unitPriceData
    ) {
      return unitPriceData.message;
    }
    if (typeof unitPriceData === "string") {
      return unitPriceData;
    }
    return "Units";
  }, [unitPriceData]);

  const isShareAllowed = Boolean(expenseTypeData?.shared_expense_allowed);
  const maxAllowedParticipants = Number(expenseTypeData?.shared_expense_limit);

  useEffect(() => {
    if (!expenseTypeData?.fields) {
      setDynamicFields([]);
      return;
    }
    const isAmountReadonly = expenseTypeData?.is_amount_readonly ?? false;
    const components = mapFieldsToFormio(
      expenseTypeData.fields,
      isAmountReadonly,
    );
    setDynamicFields(components);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseTypeData, unitFieldLabel]);

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

  useEffect(() => {
    if (!isSharePanelOpen) {
      setDynamicFormData((prev: any) => {
        const updated = {
          ...prev,
          shareExpenseCheckbox: false,
        };

        if (dynamicFormRef.current) {
          try {
            setTimeout(() => {
              if (dynamicFormRef.current && dynamicFormRef.current.submission) {
                dynamicFormRef.current.submission = {
                  data: {
                    ...dynamicFormRef.current.submission.data,
                    shareExpenseCheckbox: false,
                  },
                };
              }
            }, 0);
          } catch (e) {
            console.error("Failed to update form submission:", e);
          }
        }

        return updated;
      });
    }
  }, [isSharePanelOpen]);

  const loading = useLoadingOverlay();

  const submitAll = async() => {

     await loading?.wrap(async () => {
    const participantsForClaim: any[] =
      (dynamicFormData?.participants &&
      Array.isArray(dynamicFormData.participants)
        ? dynamicFormData.participants
        : null) ||
      expenses.flatMap((e) =>
        Array.isArray(e.participants) ? e.participants : [],
      );

    const payload = {
      employee: currentEmployee?.name,
      employee_name: currentEmployee?.employee_name,
      company: currentEmployee?.company,
      posting_date: new Date().toISOString().split("T")[0],
      expenses: expenses.map(
        (
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          { id, submitButton, expenseType, expenseCategory, ...rest },
        ) => {
          const filteredRest = Object.fromEntries(
            Object.entries(rest).filter(
              ([, value]) =>
                value !== null && value !== undefined && value !== "",
            ),
          );

          if (filteredRest.expense_date) {
            filteredRest.expense_date = format(
              new Date(filteredRest.expense_date),
              "yyyy-MM-dd",
            );
          }
          if (filteredRest.start_datetime) {
            filteredRest.start_datetime = format(
              new Date(filteredRest.start_datetime),
              "yyyy-MM-dd HH:mm:ss",
            );
          }
          if (filteredRest.end_datetime) {
            filteredRest.end_datetime = format(
              new Date(filteredRest.end_datetime),
              "yyyy-MM-dd HH:mm:ss",
            );
          }

          return {
            ...filteredRest,
            expense_type: expenseType,
            reimbursement_category: expenseCategory,
          };
        },
      ),
      participants: participantsForClaim || [],
    };

      await new Promise<void>((resolve, reject) => {
    submitExpenseClaim(JSON.stringify(payload), {
      onSuccess: () => {
        clearLocal();
         resolve();
      },  onError: (err: any) => {
          reject(err);
        },
      } as any);
          });
     }, "Submitting all expenses…");
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpenseId(expense.uid);
    const copy = { ...expense };
    if (expense.attach_receipt && typeof expense.attach_receipt === "string") {
      copy.attach_receipt = [
        {
          name: expense.attach_receipt,
          size: 4000,
          url: expense.attach_receipt,
        },
      ];
    }

    setDynamicFormData(copy);

    setMainFormData({
      categoryType: expense.categoryType || "General",
      expenseCategory: expense.expenseCategory,
      expenseType: expense.expenseType,
    });

    setSelectedCategoryType(expense.categoryType || "General");
    setShowCategoryAndType(true);
    setFormKey((k) => k + 1);
    clearFailedStatus(expense.uid);
  };

  const submitButtonLabel = isCalculating
    ? "Calculating..."
    : isUpdating
      ? "Updating..."
      : isEditingFromDetailsPage || editingExpenseId
        ? "Update"
        : "Save";

  const FormContent = (
    <div className="flex flex-col h-full bg-white">
      <HeaderBar title="Add Expense" onBack={() => navigate(-1)} />

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {(showCategoryAndType || expenses.length === 0) && (
          <Form
            key={formKey}
            ref={formRef}
            form={formSchema}
            submission={{
              data: {
                ...mainFormData,
                categoryType: selectedCategoryType,
                categoryTypeOptions: categoryTypes || ["General", "Relocation"],
              },
            }}
            onChange={(change: any) => {
              const newCategoryType = change.data.categoryType;
              const newCategory = change.data.expenseCategory;
              const prevCategory = previousCategory;

              // FIX 3: Better handling of category type changes
              if (
                selectedCategoryType &&
                newCategoryType &&
                selectedCategoryType !== newCategoryType
              ) {
                change.data.expenseCategory = null;
                change.data.expenseType = null;

                setDynamicFormData({});
                setDynamicFields([]);
                setCalcParams(undefined);
                setPreviousCategory(null);
                setVehicleType(null);
                setSelectedCategoryType(newCategoryType);
                setMainFormData({ ...change.data });
                setFormKey((k) => k + 1);

                try {
                  if (dynamicFormRef.current?.reset) {
                    dynamicFormRef.current.reset();
                  }
                } catch (e) {
                  console.error(e);
                }
                return;
              }

              if (prevCategory && newCategory && prevCategory !== newCategory) {
                change.data.expenseType = null;

                setDynamicFormData({});
                setDynamicFields([]);
                setCalcParams(undefined);
                setVehicleType(null);
                setExpenseTypeKey((k) => k + 1);
                setMainFormData({ ...change.data });
                setPreviousCategory(newCategory);
                setFormKey((k) => k + 1);

                try {
                  dynamicFormRef.current?.reset();
                } catch (e) {
                  console.error(e);
                }

                return;
              }

              if (newCategoryType) {
                setSelectedCategoryType(newCategoryType);
              }

              if (newCategory) {
                setPreviousCategory(newCategory);
              }

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
                      ...(isShareAllowed && !isEditingFromDetailsPage
                        ? [
                            {
                              type: "checkbox",
                              key: "shareExpenseCheckbox",
                              label: "Share Expense",
                              customClass: "mt-4",
                              disabled:
                                isCalculating || !(dynamicFormData?.amount > 0),
                              input: true,
                            },
                          ]
                        : []),
                      {
                        type: "button",
                        action: "submit",
                        label: submitButtonLabel,
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
                            (_, i) => i % 2 === 0,
                          ),
                        },
                        {
                          components: dynamicFields.filter(
                            (_, i) => i % 2 !== 0,
                          ),
                        },
                      ],
                    },
                    {
                      type: "columns",
                      key: "actionsRow",
                      customClass: "mt-4",
                      columns: [
                        ...(isShareAllowed && !isEditingFromDetailsPage
                          ? [
                              {
                                width: 6,
                                components: [
                                  {
                                    type: "checkbox",
                                    key: "shareExpenseCheckbox",
                                    label: "Share Expense",
                                    disabled:
                                      isCalculating ||
                                      !(
                                        (editingExpenseId
                                          ? (expenses.find(
                                              (x) => x.uid === editingExpenseId,
                                            )?.amount ??
                                            dynamicFormData?.amount)
                                          : dynamicFormData?.amount) > 0
                                      ),
                                    input: true,
                                  },
                                ],
                              },
                            ]
                          : []),
                        {
                          width: isShareAllowed ? 6 : 12,
                          components: [
                            {
                              type: "button",
                              action: "submit",
                              label: submitButtonLabel,
                              theme: "primary",
                              key: "submitButton",
                              disabled: isCalculating,
                            },
                          ],
                        },
                      ],
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
                    "Please select Expense Category and Expense Type!",
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
                    String(calcParams.units) === String(currentParams.units) &&
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

                if (isEditingFromDetailsPage) {
                  const participants = dynamicFormData?.participants
                    ? dynamicFormData.participants.map((p: any) => ({
                        name: p.name,
                        employee_type: p.employee_type || p.employeetype,
                        employee: p.employee,
                        employee_name: p.employee_name || p.employeename,
                        guest_name: p.guest_name || p.guestname,
                        percentage: p.percentage,
                        allocated_amount: p.allocated_amount || p.amount,
                      }))
                    : [];
                  updateExpense(
                    {
                      expense_claim_name: expense_claim_name || "",
                      expenses: [newExpense],
                      participants: participants,
                    },
                    {
                      onSuccess: () => {
                        setEditingExpenseId(null);
                        formRef.current?.reset();
                        dynamicFormRef.current?.reset();
                        setShowCategoryAndType(false);
                        setMainFormData({});
                        setDynamicFormData({});
                        setDynamicFields([]);
                        navigate("/webapp/expenses-app/expenses-list");
                      },
                    },
                  );
                  return;
                }

                if (editingExpenseId) {
                  setExpenses((prev) =>
                    prev.map((e) =>
                      e.uid === editingExpenseId ? newExpense : e,
                    ),
                  );
                } else {
                  setExpenses((prev) => [...prev, newExpense]);
                }

                setIsSharePanelOpen(false);
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

                if (change.data?.shareExpenseCheckbox !== undefined) {
                  setIsSharePanelOpen(change.data.shareExpenseCheckbox);
                }

                if (change.data?.vehicle_type) {
                  setVehicleType(change.data.vehicle_type);
                }

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

            {!isEditingFromDetailsPage &&
              displayParticipants &&
              displayParticipants.length > 0 && (
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
                          <th className="px-2 py-1">Employee Name</th>
                          <th className="px-2 py-1">Percentage</th>
                          <th className="px-2 py-1">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {console.log(displayParticipants)}
                        {displayParticipants.map((p: any, idx: number) => (
                          <tr key={idx} className="border-t">
                            <td className="px-2 py-2 align-top">{idx + 1}</td>
                            <td className="px-2 py-2 align-top">
                              {p.employee_type ?? "-"}
                            </td>

                            <td className="px-2 py-2 align-top">
                              {(() => {
                                if (
                                  p.employee_type === "Guest" ||
                                  p.guest_name
                                ) {
                                  return p.guest_name || "-";
                                }

                                if (p.employee_name) {
                                  return p.employee_name;
                                }

                                if (p.employee) {
                                  const found = employeeOptionsForDrawer.find(
                                    (opt) => opt.name === p.employee,
                                  );
                                  return found?.employee_name || p.employee;
                                }

                                return "-";
                              })()}
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
                      Submission Failed for {failedExpenseUids.size} items
                    </h3>
                    <p className="mt-1 text-sm text-red-700">
                      The highlighted expense items below failed to submit.
                      Please review and correct them, then try submitting again.
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
                            e.target.checked ? expenses.map((e) => e.uid) : [],
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
                            ? formatToIndianDate(expense.expense_date)
                            : "-"}
                        </td>
                        <td className="px-4 py-2">{expense.merchant || "-"}</td>
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
                                prev.filter((e) => e.uid !== expense.uid),
                              );
                              setSelectedExpenses((prev) =>
                                prev.filter((id) => id !== expense.uid),
                              );
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

            {/* FIX 5: Comprehensive state reset in "Add More" button */}
            <div className="flex justify-end mt-4 gap-3">
              <button
                className="bg-blue-500 text-white font-bold px-6 py-2 rounded hover:bg-blue-600"
                onClick={() => {
                  setShowCategoryAndType(true);
                  setEditingExpenseId(null);
                  setMainFormData({ categoryType: "General" });
                  setDynamicFormData({});
                  setDynamicFields([]);
                  setCalcParams(undefined);
                  setVehicleType(null);
                  setPreviousCategory(null);
                  setSelectedCategoryType("General");
                  setFormKey((prev) => prev + 1);

                  setTimeout(() => {
                    if (formRef.current?.reset) {
                      formRef.current.reset();
                    }
                    if (dynamicFormRef.current?.reset) {
                      dynamicFormRef.current.reset();
                    }
                  }, 0);
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

      {isSharePanelOpen && (
        <ParticipantsDrawer
          isOpen={isSharePanelOpen}
          onClose={() => setIsSharePanelOpen(false)}
          expenseAmount={Number(
            editingExpenseId
              ? (expenses.find((x) => x.uid === editingExpenseId)?.amount ??
                  dynamicFormData?.amount)
              : (dynamicFormData?.amount ?? 0),
          )}
          editingExpenseId={editingExpenseId}
          expenses={expenses}
          setExpenses={(fn) => setExpenses(fn)}
          currentEmployee={currentEmployee || undefined}
          maxParticipants={maxAllowedParticipants}
          employeeOptions={employeeOptionsForDrawer}
          employeeOptionsLoading={isLoadingEmployees as boolean}
          onSave={(formattedParticipants) => {
            if (editingExpenseId) {
              setExpenses((prev) =>
                prev.map((e) =>
                  e.uid === editingExpenseId
                    ? { ...e, participants: formattedParticipants }
                    : e,
                ),
              );
            } else {
              setDynamicFormData((prev: any) => ({
                ...prev,
                participants: formattedParticipants,
              }));
            }
          }}
        />
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <DesktopLayoutWrapper title="Add Expense">
        {FormContent}
      </DesktopLayoutWrapper>
    );
  }

  return <div className="h-screen bg-white">{FormContent}</div>;
};

export default AddExpenseForm;
