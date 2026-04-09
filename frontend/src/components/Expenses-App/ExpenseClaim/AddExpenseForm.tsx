/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useState, useMemo, useEffect } from "react";
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.form.css";
import { useCurrentEmployeeAllDetails, useEmployees } from "../../../hooks/useEmployee";
import {
  useGetExpenseTypeFields,
  usePostExpenseClaim,
  useCalculateExpenseAmount,
  useGetUnitPrice,
  useUpdateExpense,
  useGetExpenseCategoryTypes,
  useValidateExpense,
  useGetApplicableExpenseCategoriesMutation,
  useGetExpenseTypesByCategoryMutation,
  useCreateDraftExpenseClaim,
  useUpdateDraftExpenseClaim,
  useGetExpenseAttachments,
} from "../../../hooks/useExpense";
import { useFileUploader } from "../../../hooks/useFileUploader";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useScreenSize } from "../../../hooks/useScreenSize";
import HeaderBar from "../../HeaderBar";
import { useNavigate } from "react-router-dom";
import ExpenseFieldSkeleton from "./ExpenseFieldSkeleton";
import { CalculateExpenseParams } from "../../../types/expenseAdvance";
import { AlertCircle, SquarePen, Trash2 } from "lucide-react";
import ParticipantsDrawer from "./ParticipantDrawer";
import { Employee } from "../../../types/employee";
import DesktopLayoutWrapper from "../../DesktopLayoutWrapper";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { useLoadingOverlay } from "../../../context/OverlayContext";
import Button from "../../shared/atoms/Button";
import { FilePreviewModal } from "../../shared/molecules/FilePreviewModal";

export interface EmployeeOption {
  name: string;
  employee_name?: string;
}

interface AddExpenseFormProps {
  initialExpense?: Expense | null;
  expense_claim_name?: string | null;
  draft_document_name?: string | null;
  isEditingFromDetailsPage?: boolean;
  isResubmit?: boolean;
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

const AttachmentPreviewVanilla: React.FC<{ currentAttachments: any[] }> = ({ currentAttachments }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const portal = document.getElementById("attachment-preview-portal");
      if (!portal) return;

      const hash = currentAttachments.map(a => a.url || a.originalName || a.name || "file").join("|");

      // Only rebuild if the Formio portal has been wiped, or if the files have changed.
      if (portal.getAttribute("data-hash") === hash) {
        if (portal.children.length > 0) return; // Already rendered and intact!
      }

      portal.setAttribute("data-hash", hash);

      if (currentAttachments.length === 0) {
        portal.innerHTML = "";
        return;
      }

      let html = '<div class="h-full px-2 lg:px-6">';
      html += '<h3 class="text-md font-medium mb-2 text-gray-800">Attachments Preview</h3>';
      html += '<div class="flex flex-wrap gap-3">';

      currentAttachments.forEach((f: any) => {
        let actualFile = f.file;
        if (actualFile && !(actualFile instanceof Blob || actualFile instanceof File)) {
          actualFile = null;
        }
        const url = f.url;
        if (!actualFile && !url) return;
        let parsedUrl = url;
        if (url && typeof url === 'string' && !url.startsWith('http') && !url.startsWith('/') && !url.startsWith('blob:')) {
          parsedUrl = `/files/${url}`;
        }
        const previewUrl = actualFile ? URL.createObjectURL(actualFile) : parsedUrl;
        const isImage = actualFile
          ? actualFile.type?.startsWith("image/")
          : (f.type?.startsWith("image/") || /\.(jpeg|jpg|gif|png|webp|svg|ico)$/i.test(f.name || ""));
        const safeName = (f.originalName || f.name || "Attachment").replace(/"/g, '&quot;');

        html += '<div class="flex items-center gap-3 rounded-lg p-2 shadow-sm bg-gray-50 hover:bg-white transition-colors w-fit max-w-[300px]" style="border: 1px solid #cbd5e1 !important;">';

        if (isImage) {
          html += `<img src="${previewUrl}" alt="${safeName}" class="w-12 h-12 object-cover rounded shadow-sm cursor-pointer shrink-0 preview-image-trigger" data-preview-url="${previewUrl}" style="border: 1px solid #cbd5e1 !important;" />`;
        } else {
          html += `<div class="w-12 h-12 flex items-center justify-center bg-gray-200 shadow-sm rounded cursor-pointer text-[10px] font-semibold text-gray-600 uppercase shrink-0 preview-image-trigger" data-preview-url="${previewUrl}" style="border: 1px solid #cbd5e1 !important;">Open</div>`;
        }
        html += `<p class="text-sm text-gray-700 font-medium truncate max-w-[180px]" title="${safeName}">${safeName}</p>`;
        html += '</div>';
      });

      html += '</div></div>';
      portal.innerHTML = html;

      // Safely attach click listeners natively to bypass inline string eval sanitizers
      const triggers = portal.querySelectorAll('.preview-image-trigger');
      triggers.forEach(el => {
        el.addEventListener('click', () => {
          const uri = el.getAttribute('data-preview-url');
          if (uri) setPreviewUrl(uri);
        });
      });

    }, 500);

    return () => clearInterval(interval);
  }, [currentAttachments]);

  return previewUrl ? <FilePreviewModal fileUrl={previewUrl} onClose={() => setPreviewUrl(null)} /> : null;
};

const AddExpenseForm: React.FC<AddExpenseFormProps> = ({
  initialExpense,
  expense_claim_name,
  draft_document_name,
  isEditingFromDetailsPage = false,
  isResubmit = false,
}) => {
  const formRef = useRef<any>(null);
  const dynamicFormRef = useRef<any>(null);
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
  const [isAcknowledgementOpen, setIsAcknowledgementOpen] = useState(false);
  const [isAcknowledgementChecked, setIsAcknowledgementChecked] = useState(false);
  const [isRelocationAcknowledgementChecked, setIsRelocationAcknowledgementChecked] = useState(false);
  const [pendingSubmissionType, setPendingSubmissionType] = useState<"General" | "Relocation" | null>(null);
  const [isDeleteShareConfirmOpen, setIsDeleteShareConfirmOpen] = useState(false);
  const [filesMap, setFilesMap] = useState<Record<string, any[]>>({});
  const [currentAttachments, setCurrentAttachments] = useState<any[]>([]);
  const [pendingExpensesToSubmit, setPendingExpensesToSubmit] = useState<Expense[] | undefined>(undefined);
  const [isFileProcessing, setIsFileProcessing] = useState(false);
  const hydrationRef = useRef(false);

  const isEditActive = Boolean(initialExpense || editingExpenseId || isEditingFromDetailsPage || draft_document_name);

  const { data: currentEmployee } = useCurrentEmployeeAllDetails(undefined, undefined, ["name", "employee_name", "company"]);
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

  const handleDeleteParticipants = () => {
    if (editingExpenseId) {
      setExpenses((prev) =>
        prev.map((e) =>
          e.uid === editingExpenseId ? { ...e, participants: [] } : e,
        ),
      );
    }
    setDynamicFormData((prev: any) => ({
      ...prev,
      participants: [],
      shareExpenseCheckbox: false,
    }));
    // We increment formKey to ensure the dynamic form re-renders and reads the updated state correctly (e.g. enabling the share toggle)
    setFormKey(k => k + 1);
    setIsDeleteShareConfirmOpen(false);
  };

  const { mutate: submitExpenseClaim } = usePostExpenseClaim();

  const { mutate: updateExpense, isPending: isUpdating } = useUpdateExpense();

  const { mutate: saveDraftExpense, isPending: isSavingDraft } = useCreateDraftExpenseClaim();

  const { mutate: updateDraftExpense, isPending: isUpdatingDraft } = useUpdateDraftExpenseClaim();

  const { mutateAsync: validateExpense, isPending: isValidating } =
    useValidateExpense();
  const { uploadFiles, loading: isUploadingFiles } = useFileUploader();
  const { mutateAsync: fetchApplicableCategories } = useGetApplicableExpenseCategoriesMutation();
  const { mutateAsync: fetchExpenseTypesByCategory } = useGetExpenseTypesByCategoryMutation();
  const { data: claimAttachments } = useGetExpenseAttachments(
    draft_document_name || expense_claim_name || undefined,
    draft_document_name ? "Draft Expense Claim" : "Expense Claim"
  );

  useEffect(() => {
    if (claimAttachments && Array.isArray(claimAttachments) && claimAttachments.length > 0 && currentAttachments.length === 0) {
      const files = claimAttachments.map((att: any) => ({
        name: att.file_name,
        size: 4000,
        url: att.file_url,
        storage: "url",
        originalName: att.file_name,
      }));

      setCurrentAttachments(files);
      setDynamicFormData((curr: any) => ({
        ...curr,
        attachments: files
      }));
    }
    // Handle URL mapping for existing metadata if needed
    else if (claimAttachments && Array.isArray(claimAttachments) && claimAttachments.length > 0) {
      setCurrentAttachments(prev => {
        let changed = false;
        const next = prev.map(p => {
          if (!p.file && p.url && !p.url.startsWith('/') && !p.url.startsWith('http')) {
            const matchedFile = claimAttachments?.find((c: any) => c.file_name === p.name || c.file_url?.includes(p.name));
            if (matchedFile && matchedFile.file_url) {
              changed = true;
              return { ...p, url: matchedFile.file_url };
            }
          }
          return p;
        });
        return changed ? next : prev;
      });
    }
  }, [claimAttachments, currentAttachments.length]);

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
    if (hydrationRef.current) return;
    hydrationRef.current = true;

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
    } else if (Array.isArray(copy.attach_receipt)) {
      // Handle multiple attachments if they are already in the correct format
    }

    // Set currentAttachments from attach_receipt if available
    if (copy.attach_receipt && Array.isArray(copy.attach_receipt)) {
      // Also set attachments in dynamicFormData for Form.io file component
      copy.attachments = copy.attach_receipt;
      setCurrentAttachments(copy.attach_receipt);
    }

    setDynamicFormData(copy);

    const mainForm = {
      categoryType: initialExpense.categoryType || "General",
      expenseCategory: initialExpense.expenseCategory,
      expenseType: initialExpense.expenseType,
    };
    setMainFormData(mainForm);
    setSelectedCategoryType(initialExpense.categoryType || "General");
    setPreviousCategory(initialExpense.expenseCategory);
    setShowCategoryAndType(true);
  }, [initialExpense, isEditActive]);


  useEffect(() => {
    const expenseType =
      mainFormData?.expenseType || mainFormData?.expense_type || null;

    if (isEditActive) {
      return;
    }

    if (expenseType) {
      setDynamicFormData({});
      setCalcParams(undefined);
      setVehicleType(null);
      // Note: Do NOT increment formKey here. The dynamic form uses its own
      // key based on expenseTypeValue, so it will re-mount automatically.
      // Incrementing formKey here caused a double re-mount race condition
      // that made the dynamic form fail to render on mobile.
    }
  }, [mainFormData?.expenseType, mainFormData?.expense_type, editingExpenseId, isEditActive]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_KEYS.EXPENSES, JSON.stringify(expenses || []));
    } catch (e) {
      console.warn("Failed to persist expenses", e);
    }
  }, [expenses]);

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
      if (e && Array.isArray(e.participants) && e.participants.length > 0) return e.participants;
    }
    if (
      dynamicFormData?.participants &&
      Array.isArray(dynamicFormData.participants)
    ) {
      return dynamicFormData.participants;
    }
    return [];
  }, [editingExpenseId, expenses, dynamicFormData]);

  const initialDrawerParticipants = useMemo(() => {
    if (editingExpenseId) {
      const found = expenses.find(
        (x) => x.id === editingExpenseId || x.uid === editingExpenseId,
      );
      if (found && Array.isArray(found.participants) && found.participants.length > 0) {
        return found.participants;
      }
    }
    return dynamicFormData?.participants || [];
  }, [editingExpenseId, expenses, dynamicFormData?.participants]);

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
                  refreshOn: "categoryType",
                  clearOnRefresh: true,
                  clearOnHide: true,
                  validateOn: "blur",
                  validate: {
                    required: true,
                    customMessage: "Expense Category is required",
                  },
                  input: true,
                  html: true,
                  redrawOn: "categoryType",
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
                  template: "<span>{{ item.expense_type }}</span>",
                  refreshOn: "expenseCategory",
                  clearOnRefresh: true,
                  clearOnHide: true,
                  validateOn: "blur",
                  validate: {
                    required: true,
                    customMessage: "Expense Type is required",
                  },
                  input: true,
                  customClass: "mt-4 md:mt-0",
                  html: true,
                  redrawOn: "expenseCategory",
                },
              ],
            },
          ],
        },
      ],
    }),
    [currentEmployee],
  );


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
              ...(field?.fieldname === "expense_date"
                ? {
                  widget: {
                    type: "calendar",
                    displayInTimezone: "viewer",
                    locale: "en",
                    maxDate: format(new Date(), "yyyy-MM-dd"),
                  },
                  datePicker: {
                    maxDate: format(new Date(), "yyyy-MM-dd"),
                  },
                }
                : {}),
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
              if (field?.required !== true && field?.required !== 1) {
                return null;
              }
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
              rows: 1,
              input: true,
              html: true,
            };
          case "Attach":
            return null;
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
    [mainFormData?.expenseType],
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

  const isAttachmentMandatory = useMemo(() => {
    if (!expenseTypeData?.fields) return false;
    return expenseTypeData.fields.some(
      (f: any) => f.fieldname === "attach_receipt" && (f.required === true || f.required === 1)
    );
  }, [expenseTypeData]);


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

  const submitAll = async (type: "General" | "Relocation", specificExpenses?: Expense[]) => {
    if (type === "Relocation") {
      toast.success("You have chosen this option and in future cannot reapply");
    }
    await loading?.wrap(async () => {
      const selectedForCategory = specificExpenses || expenses.filter(e =>
        (e.categoryType || "General") === type &&
        selectedExpenses.includes(e.uid)
      );

      if (selectedForCategory.length === 0) {
        toast.error(`No ${type} expenses selected for submission.`);
        return;
      }

      const payload = {
        employee: currentEmployee?.name,
        employee_name: currentEmployee?.employee_name,
        company: currentEmployee?.company,
        posting_date: format(new Date(), "yyyy-MM-dd"),
        expenses: selectedForCategory.map(
          (
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            { id, submitButton, expenseType, expenseCategory, ...rest },
            index,
          ) => {
            const filteredRest = Object.fromEntries(
              Object.entries(rest).filter(
                ([, value]) =>
                  value !== null && value !== undefined && value !== "",
              ),
            );

            if (filteredRest.expense_date) {
              const dateVal = filteredRest.expense_date;
              if (typeof dateVal === "string" && dateVal.includes("T")) {
                filteredRest.expense_date = dateVal.split("T")[0];
              } else if (dateVal instanceof Date) {
                filteredRest.expense_date = format(dateVal, "yyyy-MM-dd");
              }
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

            const isLast = index === selectedForCategory.length - 1;
            const extraParams: any = {};
            if (type === "General") {
              extraParams.custom_is_acknowledged = isAcknowledgementChecked;
            } else if (type === "Relocation") {
              extraParams.custom_is_acknowledged = isAcknowledgementChecked;
              if (isLast) {
                extraParams.custom_is_last_relocation_expense = isRelocationAcknowledgementChecked;
              }
            }

            return {
              ...filteredRest,
              ...extraParams,
              expense_type: expenseType,
              reimbursement_category: expenseCategory,
            };
          },
        ),
      };

      await new Promise<void>((resolve, reject) => {
        submitExpenseClaim(JSON.stringify(payload), {
          onSuccess: async (response: any) => {
            // Handle file uploads for each created expense
            // Supporting both single document and multiple document results
            const message = response?.message;
            const claims = response?.claims;

            if (Array.isArray(claims) && claims.length > 0) {
              // Map each claim to its respective expense's attachments
              const uploadPromises = claims.map(async (claim: any, idx: number) => {
                const name = claim.name || (typeof claim === "string" ? claim : null);
                if (!name) return;

                // Map claim to expense by index
                const expense = selectedForCategory[idx];
                if (!expense) return;

                const attachments = filesMap[expense.uid];
                if (attachments && Array.isArray(attachments) && attachments.length > 0) {
                  return uploadFiles(attachments, "Expense Claim", name);
                }
              });
              await Promise.all(uploadPromises);
            } else {
              // Fallback for single document or alternative response structures
              const docName = response?.name ||
                message?.name ||
                (typeof message === "string" ? message : null);

              if (docName) {
                // Single document created for this category
                const allAttachments: any[] = [];
                selectedForCategory.forEach((exp) => {
                  const attachments = filesMap[exp.uid];
                  if (attachments && Array.isArray(attachments)) {
                    allAttachments.push(...attachments);
                  }
                });

                if (allAttachments.length > 0) {
                  await uploadFiles(allAttachments, "Expense Claim", docName);
                }
              } else {
                // Multiple documents might have been created via results array
                const results = message?.results || (Array.isArray(message) ? message : []);
                if (results.length > 0) {
                  const uploadPromises = results.map(async (res: any, idx: number) => {
                    const name = res.name || (typeof res === "string" ? res : null);
                    if (!name) return;

                    // If the result has a UID, use it. Otherwise, assume order matches.
                    const uid = res.uid || selectedForCategory[idx]?.uid;
                    const attachments = filesMap[uid];

                    if (attachments && attachments.length > 0) {
                      return uploadFiles(attachments, "Expense Claim", name);
                    }
                  });
                  await Promise.all(uploadPromises);
                }
              }
            }

            const submittedUids = selectedForCategory.map(e => e.uid);

            // Filter expenses and update state
            setExpenses(prev => {
              const next = prev.filter(e => !submittedUids.includes(e.uid));
              // Persist to localStorage immediately to avoid race conditions with navigation
              localStorage.setItem(LOCAL_KEYS.EXPENSES, JSON.stringify(next));
              return next;
            });

            setSelectedExpenses(prev => prev.filter(uid => !submittedUids.includes(uid)));

            // Clear files map for submitted UIDs
            setFilesMap(prev => {
              const next = { ...prev };
              submittedUids.forEach(uid => delete next[uid]);
              return next;
            });

            // Navigate to the list page after everything is done
            navigate("/webapp/expenses-app/expenses-list", {
              state: { refresh: true },
            });

            resolve();
          },
          onError: (err: any) => {
            reject(err);
          },
        } as any);
      });
    }, `Submitting selected ${type} expenses…`);
  };

  const handleInitialSubmit = (type: "General" | "Relocation") => {
    setPendingSubmissionType(type);
    setPendingExpensesToSubmit(undefined);
    setIsAcknowledgementChecked(false);
    setIsRelocationAcknowledgementChecked(false);
    setCurrentAttachments(initialExpense?.attachments ? [] : []); // We can't easily map server URLs to File objects here, but we can reset
    if (initialExpense) {
      setIsAcknowledgementOpen(true);
    }
    setIsAcknowledgementOpen(true);
  };

  const handleProceed = () => {
    if (!isAcknowledgementChecked) {
      toast.error("Please acknowledge the terms to proceed.");
      return;
    }

    if (!pendingSubmissionType) return;
    setIsAcknowledgementOpen(false);
    submitAll(pendingSubmissionType, pendingExpensesToSubmit);
    setPendingExpensesToSubmit(undefined);
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

    // Sync currentAttachments with the files stored for this expense
    if (filesMap[expense.uid]) {
      setCurrentAttachments(filesMap[expense.uid]);
    } else {
      setCurrentAttachments([]);
    }


    setMainFormData({
      categoryType: expense.categoryType || "General",
      expenseCategory: expense.expenseCategory,
      expenseType: expense.expenseType,
    });

    setSelectedCategoryType(expense.categoryType || "General");
    setPreviousCategory(expense.expenseCategory);
    setFormKey((k) => k + 1);
    clearFailedStatus(expense.uid);
    setShowCategoryAndType(true);
  };


  const submitButtonLabel = isCalculating
    ? "Calculating..."
    : isValidating
      ? "Validating..."
      : isUpdating
        ? isResubmit ? "Resubmitting..." : "Updating..."
        : isSavingDraft || isUpdatingDraft
          ? "Saving..."
          : draft_document_name
            ? "Update"
            : isEditingFromDetailsPage || editingExpenseId
              ? isResubmit ? "Resubmit" : "Update"
              : "Save";

  const showSelectionForm = showCategoryAndType || expenses.length === 0 || isEditActive;

  const FormContent = (
    <div className="flex flex-col h-full bg-white">
      <HeaderBar title="Add Expense" onBack={() => navigate(-1)} />

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {isEditActive && isFetchingFields && !dynamicFields.length && (
          <div className="mt-4">
            <ExpenseFieldSkeleton columns={isMobile ? 1 : 2} />
          </div>
        )}

        {showSelectionForm && (
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
              // Guard: skip onChange processing during hydration (edit mode init)
              if (isEditActive) return;
              if (hydrationRef.current) return;

              const newCategoryType = change.data.categoryType;
              const newCategory = change.data.expenseCategory;
              const newExpenseType = change.data.expenseType;
              const prevCategory = previousCategory;


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
                // Note: Removed setFormKey increment here. Formio handles
                // cascading updates via refreshOn/clearOnRefresh. Re-keying
                // the form on every selection change caused re-mount loops
                // that prevented the dynamic form from rendering on mobile.
                return;
              }


              if (prevCategory && !newCategory) {
                setPreviousCategory(null);
                setDynamicFormData({});
                setDynamicFields([]);
                setVehicleType(null);
                setMainFormData({ ...change.data });
                return;
              }

              if (newCategory && prevCategory !== newCategory) {
                change.data.expenseType = null;

                setDynamicFormData({});
                setVehicleType(null);
                setPreviousCategory(newCategory);
                setMainFormData({ ...change.data });
                return;
              }

              if (newExpenseType !== mainFormData?.expenseType) {
                setMainFormData(change.data);
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

        {expenseTypeValue && (isFetchingFields || dynamicFields.length === 0) && (
          <ExpenseFieldSkeleton columns={isMobile ? 1 : 2} />
        )}

        {dynamicFields.length > 0 && !isFetchingFields && (
          <div className="mt-4">
            <Form
              key={`dynamic-${expenseTypeValue}-${formKey}`}
              ref={dynamicFormRef}
              submission={{ data: dynamicFormData }}
              form={{
                display: "form",
                components: (() => {
                  const attachmentsField = {
                    label: isAttachmentMandatory
                      ? `Attachments <span style="color:red">&nbsp;*</span>`
                      : "Attachments",
                    key: "attachments",
                    type: "file",
                    input: true,
                    multiple: true,
                    storage: "customfiles",
                    filePattern: ".pdf,.doc,.docx,.jpg,.jpeg,.png",
                    customClass: "mb-4",
                    html: true,
                    validate: {
                      required: isAttachmentMandatory,
                      customMessage: "Please attach a receipt",
                    },
                  };

                  const attachmentPreviewTarget = {
                    type: "htmlelement",
                    tag: "div",
                    attrs: [{ attr: "id", value: "attachment-preview-portal" }],
                    content: "",
                  };

                  if (isMobile) {
                    return [
                      ...dynamicFields.map((comp) => comp),
                      ...(isShareAllowed
                        ? [
                          {
                            type: "checkbox",
                            key: "shareExpenseCheckbox",
                            label: "Share Expense",
                            input: true,
                            defaultValue: displayParticipants.length > 0,
                            hidden: displayParticipants.length > 0,
                            customClass: "custom-halfday-toggle border rounded-lg shadow-sm p-4 bg-gray-50 mt-4",
                          },
                        ]
                        : []),
                      {
                        type: "columns",
                        key: "attachmentsRow",
                        columns: [
                          {
                            width: 12,
                            components: [attachmentsField]
                          },
                          {
                            width: 12,
                            components: [attachmentPreviewTarget]
                          }
                        ]
                      },
                      {
                        type: "columns",
                        key: "submitButtonsRow",
                        customClass: "hidden",
                        columns: [
                          {
                            width: 6,
                            components: [
                              {
                                type: "button",
                                action: "submit",
                                label: isFileProcessing ? "Processing Files..." : (isSavingDraft || isUpdatingDraft ? "Saving..." : submitButtonLabel),
                                theme: "primary",
                                key: "submitButton",
                                customClass: "w-full",
                                disabled: isCalculating || isSavingDraft || isUpdatingDraft || isFileProcessing,
                              },
                            ],
                          },
                          ...(!(isEditingFromDetailsPage || (editingExpenseId && !draft_document_name)) ? [{
                            width: 6,
                            components: [
                              {
                                type: "button",
                                action: "submit",
                                label: isFileProcessing ? "Processing Files..." : (draft_document_name ? "Submit" : "Save & Submit"),
                                theme: "primary",
                                key: "saveAndSubmit",
                                customClass: "w-full",
                                disabled: isCalculating || isUploadingFiles || isFileProcessing,
                              },
                            ],
                          }] : []),
                        ],
                      },
                    ];
                  }

                  return [
                    {
                      type: "columns",
                      key: "dynamicColumns",
                      columns: [
                        {
                          components: [
                            ...dynamicFields.filter((_, i) => i % 2 === 0),
                          ],
                        },
                        {
                          components: [
                            ...dynamicFields.filter((_, i) => i % 2 !== 0),
                          ],
                        },
                      ],
                    },
                    {
                      type: "columns",
                      key: "attachmentsRow",
                      customClass: "mt-6",
                      columns: [
                        {
                          width: 6,
                          components: [attachmentsField]
                        },
                        {
                          width: 6,
                          components: [attachmentPreviewTarget]
                        }
                      ],
                    },
                    {
                      type: "columns",
                      key: "actionsRow",
                      customClass: "mt-4",
                      columns: [
                        ...(isShareAllowed
                          ? [
                            {
                              width: 6,
                              components: [
                                {
                                  type: "checkbox",
                                  key: "shareExpenseCheckbox",
                                  label: "Share Expense",
                                  input: true,
                                  defaultValue: displayParticipants.length > 0,
                                  hidden: displayParticipants.length > 0,
                                  customClass: "custom-halfday-toggle border rounded-lg shadow-sm p-4 bg-gray-50",
                                },
                              ],
                            },
                          ]
                          : []),
                        {
                          width: isShareAllowed ? 6 : 12,
                          components: [
                            {
                              type: "columns",
                              key: "desktopSubmitButtons",
                              customClass: "hidden",
                              columns: [
                                {
                                  width: 9,
                                  components: [
                                    {
                                      type: "button",
                                      action: "submit",
                                      label: isFileProcessing ? "Processing Files..." : (isUploadingFiles ? "Uploading Files..." : submitButtonLabel),
                                      theme: "primary",
                                      key: "submitButton",
                                      customClass: "text-right",
                                      disabled: isCalculating || isUploadingFiles || isSavingDraft || isUpdatingDraft || isFileProcessing,
                                    },
                                  ],
                                },
                                ...(!(isEditingFromDetailsPage || (editingExpenseId && !draft_document_name)) ? [{
                                  width: 3,
                                  components: [
                                    {
                                      type: "button",
                                      action: "submit",
                                      label: isFileProcessing ? "Processing Files..." : (draft_document_name ? "Submit" : "Save & Submit"),
                                      theme: "primary",
                                      key: "saveAndSubmit",
                                      customClass: "text-left",
                                      disabled: isCalculating || isUploadingFiles || isFileProcessing,
                                    },
                                  ],
                                }] : []),
                              ],
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

                // Normalize dates safe from timezone shifts for both Save and Submit
                if (combinedData.expense_date) {
                  const dateVal = combinedData.expense_date;
                  if (typeof dateVal === "string" && dateVal.includes("T")) {
                    combinedData.expense_date = dateVal.split("T")[0];
                  } else if (dateVal instanceof Date) {
                    combinedData.expense_date = format(dateVal, "yyyy-MM-dd");
                  }
                }

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

                try {
                  const validationPayload: any = {
                    employee: currentEmployee?.name,
                    employee_name: currentEmployee?.employee_name,
                    company: currentEmployee?.company,
                    posting_date: format(new Date(), "yyyy-MM-dd"),
                    expenses: [
                      {
                        ...combinedData,
                        expense_date: combinedData.expense_date,
                        start_datetime: combinedData.start_datetime
                          ? format(
                            new Date(combinedData.start_datetime),
                            "yyyy-MM-dd HH:mm:ss",
                          )
                          : undefined,
                        end_datetime: combinedData.end_datetime
                          ? format(
                            new Date(combinedData.end_datetime),
                            "yyyy-MM-dd HH:mm:ss",
                          )
                          : undefined,
                        expense_type: combinedData.expenseType,
                        reimbursement_category: combinedData.expenseCategory,
                        amount: amountFromApi ?? combinedData.amount,
                      },
                    ],
                  };

                  if (isEditingFromDetailsPage && expense_claim_name) {
                    validationPayload.expense_claim_name = expense_claim_name;
                  }

                  await validateExpense(JSON.stringify(validationPayload));
                } catch (error) {
                  console.error("Expense validation failed:", error);
                  return;
                }

                const attachments = currentAttachments;

                if (isAttachmentMandatory && attachments.length === 0) {
                  toast.error("Please attach a receipt to proceed.");
                  return;
                }

                const expenseUid = editingExpenseId ?? Date.now().toString();

                if (attachments.length > 0) {
                  setFilesMap((prev) => ({
                    ...prev,
                    [expenseUid]: attachments,
                  }));
                }

                let custom_expense_category_name = combinedData.expenseCategory;
                let custom_expense_type = combinedData.expenseType;
                try {
                  const employee = currentEmployee?.name || "";
                  const categoryTypeReq = selectedCategoryType || "General";
                  const expenseCategoryReq = combinedData.expenseCategory;

                  const catRes = await fetchApplicableCategories(categoryTypeReq);
                  const catMatch = Array.isArray(catRes)
                    ? catRes.find((c: any) => c.name === combinedData.expenseCategory)
                    : undefined;
                  if (catMatch && catMatch.category_name)
                    custom_expense_category_name = catMatch.category_name;

                  const typeRes = await fetchExpenseTypesByCategory({
                    employee,
                    reimbursementCategory: expenseCategoryReq,
                  });
                  const typeMatch = Array.isArray(typeRes)
                    ? typeRes.find((t: any) => t.name === combinedData.expenseType)
                    : undefined;
                  if (typeMatch && typeMatch.expense_type)
                    custom_expense_type = typeMatch.expense_type;
                } catch (e) {
                  console.error(
                    "Failed to fetch display names for expense table",
                    e,
                  );
                }

                const cleanCombinedData = { ...combinedData };
                delete (cleanCombinedData as any).attach_receipt;

                const newExpense: Expense = {
                  uid: expenseUid,
                  ...cleanCombinedData,
                  custom_expense_category_name: custom_expense_category_name,
                  custom_expense_type: custom_expense_type,
                  attachments: attachments.length > 0
                    ? attachments.map((f: any) => f.name).join(", ")
                    : null,
                  amount: amountFromApi ?? combinedData.amount ?? undefined,
                };

                const isSaveAndSubmit = (submission.data as any).saveAndSubmit === true;

                if (isSaveAndSubmit) {
                  setPendingExpensesToSubmit([newExpense]);
                  setPendingSubmissionType(selectedCategoryType as any || "General");
                  setIsAcknowledgementOpen(true);
                  return;
                }

                // Update draft if editing from draft list
                if (draft_document_name) {
                  const updatePayload = {
                    json: JSON.stringify({
                      employee: currentEmployee?.name,
                      expense_claim_name: expense_claim_name || draft_document_name,
                      ...newExpense,
                    }),
                  };

                  updateDraftExpense(
                    { docName: draft_document_name, payload: updatePayload },
                    {
                      onSuccess: async () => {
                        if (draft_document_name && attachments.length > 0) {
                          await uploadFiles(attachments, "Draft Expense Claim", draft_document_name);
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
                        setCurrentAttachments([]);
                        setExpenses((prev) =>
                          prev.filter((e) => e.uid !== newExpense.uid),
                        );
                      },
                    },
                  );
                  return;
                }

                // Update expense claim if editing from details page
                if (isEditingFromDetailsPage) {
                  updateExpense(
                    {
                      expense_claim_name: expense_claim_name || "",
                      expenses: [newExpense],
                      isResubmit,
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

                const draftPayload = {
                  employee: currentEmployee?.name,
                  json: JSON.stringify({
                    employee: currentEmployee?.name,
                    expense_claim_name: expense_claim_name || "",
                    ...newExpense,
                  }),
                };

                saveDraftExpense(draftPayload, {
                  onSuccess: async (response: any) => {
                    const draftName = response?.name || response?.data?.name;
                    if (draftName && attachments.length > 0) {
                      await uploadFiles(attachments, "Draft Expense Claim", draftName);
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
                    setCurrentAttachments([]);
                    setExpenses((prev) =>
                      prev.filter((e) => e.uid !== newExpense.uid),
                    );
                  },
                });
              }}
              onChange={(change: any) => {
                // Warning: Do not spread change.data! Form.io relies on reference equality 
                // to prevent infinite onChange validation loops. 
                setDynamicFormData(change.data);

                // Form.io mutates arrays directly. We must create a new array reference 
                // to force React to re-render the Attachment Preview component below.
                const newAttachments = [...(change.data?.attachments || [])];

                setCurrentAttachments(prev => {
                  // Only map metadata to avoid serializing giant raw blob string blobs
                  const stripFile = (arr: any[]) => arr.map((p: any) => ({ ...p, file: undefined }));
                  if (JSON.stringify(stripFile(prev)) !== JSON.stringify(stripFile(newAttachments))) {
                    return newAttachments;
                  }
                  return prev;
                });

                const hasFilesWithoutUrl = newAttachments.some((f: any) => !f.url && !f.storage);
                const hasFilesWithUrl = newAttachments.some((f: any) => f.url || f.storage);

                if (hasFilesWithoutUrl && !hasFilesWithUrl) {
                  setIsFileProcessing(true);
                  if (change.changed?.component?.key === "attachments") {
                    toast.loading("Processing attachments...", { id: "file-processing" });
                  }
                } else {
                  setIsFileProcessing(false);
                  toast.dismiss("file-processing");
                }

                if (change.changed?.component?.key === "shareExpenseCheckbox") {
                  if (displayParticipants.length > 0 && change.data.shareExpenseCheckbox === false) {
                    change.data.shareExpenseCheckbox = true;
                    dynamicFormRef.current?.getComponent("shareExpenseCheckbox").setValue(true);
                  }

                  if (displayParticipants.length === 0) {
                    const currentAmount = Number(change.data?.amount);
                    if (change.data.shareExpenseCheckbox && !(currentAmount > 0)) {
                      toast.error(
                        "Please enter an amount before sharing the expense.",
                      );
                      change.data.shareExpenseCheckbox = false;
                      setDynamicFormData({
                        ...change.data,
                        shareExpenseCheckbox: false,
                      });
                      if (dynamicFormRef.current?.submission) {
                        dynamicFormRef.current.submission = {
                          data: {
                            ...dynamicFormRef.current.submission.data,
                            shareExpenseCheckbox: false,
                          },
                        };
                      }
                      setIsSharePanelOpen(false);
                    } else {
                      setIsSharePanelOpen(change.data.shareExpenseCheckbox);
                    }
                  }
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
                    debounceRef.current = window.setTimeout(() => {
                      const payload: CalculateExpenseParams = {
                        expense_type: String(expense_type).trim(),
                        units: Number(unitsStr),
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
            {/* Attachment Preview rendering moved into formio dynamic schema generation above via robust decoupled vanilla hook */}
            <AttachmentPreviewVanilla currentAttachments={currentAttachments} />

            {displayParticipants &&
              displayParticipants.length > 0 && (
                <div className="mt-4 border rounded-lg p-3 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-md font-medium">Participants</div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsSharePanelOpen(true)}
                        className="text-md flex items-center  text-primary font-bold hover:underline transition-all active:scale-95"
                      >
                        <SquarePen className="w-4 h-4 mr-1" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDeleteShareConfirmOpen(true)}
                        className="text-md flex items-center text-red-600 font-bold hover:underline transition-all active:scale-95"
                      >
                        <Trash2 className="w-4 h-4 mr-1 ml-1" />
                        Remove share %
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-md text-gray-600">
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

            <div className="flex flex-col md:flex-row md:justify-end gap-3 mt-6">
              <Button
                bgColor="primary"
                onClick={() => {
                  const btn = document.querySelector('button[name="data[submitButton]"]') as HTMLButtonElement | null;
                  if (btn) btn.click();
                }}
                disabled={isCalculating || isUploadingFiles || isSavingDraft || isUpdatingDraft || isFileProcessing}
                className="w-full md:w-auto font-semibold flex-1 md:flex-none justify-center"
                size="md"
              >
                {isFileProcessing ? "Processing Files..." : (isUploadingFiles ? "Uploading Files..." : (isSavingDraft || isUpdatingDraft ? "Saving..." : submitButtonLabel))}
              </Button>

              {!(isEditingFromDetailsPage || (editingExpenseId && !draft_document_name)) && (
                <Button
                  bgColor="primary"
                  onClick={() => {
                    const btn = document.querySelector('button[name="data[saveAndSubmit]"]') as HTMLButtonElement | null;
                    if (btn) btn.click();
                  }}
                  disabled={isCalculating || isUploadingFiles || isFileProcessing}
                  className="w-full md:w-auto font-semibold flex-1 md:flex-none justify-center"
                  size="md"
                >
                  {isFileProcessing ? "Processing Files..." : (draft_document_name ? "Submit" : "Save & Submit")}
                </Button>
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

            {/* Relocation Expense List */}
            {expenses.filter(e => e.categoryType === "Relocation").length > 0 && (
              <div className="mb-8">
                <div className=" text-gray-800 mb-2">
                  <h2 className="text-lg font-bold">Relocation Expense List</h2>
                  <div className="flex items-center gap-1 text-amber-600 ">
                    <AlertCircle size={20} />
                    <p className="text-sm">Please verify all relocation expenses below before acknowledging the full submission.</p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                  <table className="min-w-full bg-white">
                    <thead>
                      <tr className="bg-[#f9fafb] border-b border-gray-200">
                        <th className="w-14 px-4 py-4 text-center border-r border-gray-200">
                          <div className="flex justify-center">
                            <input
                              type="checkbox"
                              className="w-5 h-5 rounded-full border-2 border-gray-300 text-primary focus:ring-primary cursor-pointer appearance-none checked:bg-primary checked:border-primary relative transition-all before:content-[''] before:absolute before:w-2 before:h-1 before:border-b-2 before:border-l-2 before:border-white before:left-[5px] before:top-[6px] before:-rotate-45 before:opacity-0 checked:before:opacity-100"
                              onChange={(e) => {
                                const relocationUids = expenses
                                  .filter(ex => ex.categoryType === "Relocation")
                                  .map(ex => ex.uid);
                                setSelectedExpenses(prev =>
                                  e.target.checked
                                    ? Array.from(new Set([...prev, ...relocationUids]))
                                    : prev.filter(id => !relocationUids.includes(id))
                                );
                              }}
                              checked={
                                expenses.filter(ex => ex.categoryType === "Relocation").length > 0 &&
                                expenses.filter(ex => ex.categoryType === "Relocation").every(ex => selectedExpenses.includes(ex.uid))
                              }
                            />
                          </div>
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-bold text-[#64748b] uppercase tracking-wider border-r border-gray-200 whitespace-nowrap">Expense Category</th>
                        <th className="px-5 py-4 text-left text-[11px] font-bold text-[#64748b] uppercase tracking-wider border-r border-gray-200 whitespace-nowrap">Expense Type</th>
                        <th className="px-5 py-4 text-left text-[11px] font-bold text-[#64748b] uppercase tracking-wider border-r border-gray-200 whitespace-nowrap">Expense Date</th>
                        <th className="px-5 py-4 text-left text-[11px] font-bold text-[#64748b] uppercase tracking-wider border-r border-gray-200 whitespace-nowrap">Merchant</th>
                        <th className="px-5 py-4 text-left text-[11px] font-bold text-[#64748b] uppercase tracking-wider border-r border-gray-200 whitespace-nowrap">Invoice Number</th>
                        <th className="px-5 py-4 text-left text-[11px] font-bold text-[#64748b] uppercase tracking-wider border-r border-gray-200 whitespace-nowrap">Amount</th>
                        <th className="px-5 py-4 text-left text-[11px] font-bold text-[#64748b] uppercase tracking-wider whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {expenses
                        .filter(e => e.categoryType === "Relocation")
                        .map((expense) => {
                          const isFailed = failedExpenseUids.has(expense.uid);
                          return (
                            <tr
                              key={expense.uid}
                              className={`hover:bg-gray-50 transition-colors ${isFailed ? "bg-red-50" : ""
                                }`}
                            >
                              <td className="px-4 py-4 text-center border-r border-gray-200">
                                <div className="flex justify-center">
                                  <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded-full border-2 border-gray-300 text-primary-600 focus:ring-primary-600 cursor-pointer appearance-none checked:bg-primary checked:border-primary relative transition-all before:content-[''] before:absolute before:w-2 before:h-1 before:border-b-2 before:border-l-2 before:border-white before:left-[5px] before:top-[6px] before:-rotate-45 before:opacity-0 checked:before:opacity-100"
                                    checked={selectedExpenses.includes(expense.uid)}
                                    onChange={() => handleCheckboxChange(expense.uid)}
                                  />
                                </div>
                              </td>
                              <td className="px-5 py-4 text-sm text-gray-700 border-r border-gray-200">
                                <div className="flex items-center gap-2">
                                  {expense.custom_expense_category_name
                                    ? `${expense.custom_expense_category_name} (${expense.expenseCategory})`
                                    : expense.expenseCategory}
                                  {isFailed && (
                                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold text-red-600 bg-red-100 rounded-full">
                                      FAILED
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-4 text-sm text-gray-700 border-r border-gray-200">
                                {expense.custom_expense_type
                                  ? `${expense.custom_expense_type} (${expense.expenseType})`
                                  : expense.expenseType}
                              </td>
                              <td className="px-5 py-4 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">
                                {expense.expense_date
                                  ? formatToIndianDate(expense.expense_date)
                                  : "-"}
                              </td>
                              <td className="px-5 py-4 text-sm text-gray-600 border-r border-gray-200">{expense.merchant || "-"}</td>
                              <td className="px-5 py-4 text-sm text-gray-600 border-r border-gray-200">{expense.invoice_number || "-"}</td>
                              <td className="px-5 py-4 text-sm font-bold text-gray-900 border-r border-gray-200">{expense.amount ?? "-"}</td>
                              <td className="px-5 py-4 text-sm whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => handleEdit(expense)}
                                    className="p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors"
                                    title="Edit"
                                  >
                                    <SquarePen className="w-4 h-4" />
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
                                    className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end mt-4 gap-2">
                  {expenses.filter(e => e.categoryType === "General").length === 0 && <Button variant="outline" size="md" className="font-semibold" onClick={() => {
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
                  </Button>}
                  <Button
                    bgColor="primary"
                    size="md"
                    onClick={() => handleInitialSubmit("Relocation")}
                    disabled={!expenses.some(e => e.categoryType === "Relocation" && selectedExpenses.includes(e.uid))}
                    className="font-semibold shadow-sm"
                  >
                    Submit Selected
                  </Button>
                  <Button
                    bgColor="error"
                    size="md"
                    onClick={handleDeleteSelected}
                    disabled={!expenses.some(e => e.categoryType === "Relocation" && selectedExpenses.includes(e.uid))}
                    className="font-semibold shadow-sm"
                  >
                    Delete Selected
                  </Button>
                </div>
              </div>
            )}

            {/* General Expense List */}
            {expenses.filter(e => (e.categoryType || "General") === "General").length > 0 && (
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4 px-1 text-gray-800">
                  <h2 className="text-lg font-bold">General Expense List</h2>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                  <table className="min-w-full bg-white">
                    <thead>
                      <tr className="bg-[#f9fafb] border-b border-gray-200">
                        <th className="w-14 px-4 py-4 text-center border-r border-gray-200">
                          <div className="flex justify-center">
                            <input
                              type="checkbox"
                              className="w-5 h-5 rounded-full border-2 border-gray-300 text-primary focus:ring-primary cursor-pointer appearance-none checked:bg-primary checked:border-primary relative transition-all before:content-[''] before:absolute before:w-2 before:h-1 before:border-b-2 before:border-l-2 before:border-white before:left-[5px] before:top-[6px] before:-rotate-45 before:opacity-0 checked:before:opacity-100"
                              onChange={(e) => {
                                const generalUids = expenses
                                  .filter(ex => (ex.categoryType || "General") === "General")
                                  .map(ex => ex.uid);
                                setSelectedExpenses(prev =>
                                  e.target.checked
                                    ? Array.from(new Set([...prev, ...generalUids]))
                                    : prev.filter(id => !generalUids.includes(id))
                                );
                              }}
                              checked={
                                expenses.filter(ex => (ex.categoryType || "General") === "General").length > 0 &&
                                expenses.filter(ex => (ex.categoryType || "General") === "General").every(ex => selectedExpenses.includes(ex.uid))
                              }
                            />
                          </div>
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-bold text-[#64748b] uppercase tracking-wider border-r border-gray-200 whitespace-nowrap">Expense Category</th>
                        <th className="px-5 py-4 text-left text-[11px] font-bold text-[#64748b] uppercase tracking-wider border-r border-gray-200 whitespace-nowrap">Expense Type</th>
                        <th className="px-5 py-4 text-left text-[11px] font-bold text-[#64748b] uppercase tracking-wider border-r border-gray-200 whitespace-nowrap">Expense Date</th>
                        <th className="px-5 py-4 text-left text-[11px] font-bold text-[#64748b] uppercase tracking-wider border-r border-gray-200 whitespace-nowrap">Merchant</th>
                        <th className="px-5 py-4 text-left text-[11px] font-bold text-[#64748b] uppercase tracking-wider border-r border-gray-200 whitespace-nowrap">Invoice Number</th>
                        <th className="px-5 py-4 text-left text-[11px] font-bold text-[#64748b] uppercase tracking-wider border-r border-gray-200 whitespace-nowrap">Amount</th>
                        <th className="px-5 py-4 text-left text-[11px] font-bold text-[#64748b] uppercase tracking-wider whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {expenses
                        .filter(e => (e.categoryType || "General") === "General")
                        .map((expense) => {
                          const isFailed = failedExpenseUids.has(expense.uid);
                          return (
                            <tr
                              key={expense.uid}
                              className={`hover:bg-gray-50 transition-colors ${isFailed ? "bg-red-50" : ""
                                }`}
                            >
                              <td className="px-4 py-4 text-center border-r border-gray-200">
                                <div className="flex justify-center">
                                  <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded-full border-2 border-gray-300 text-primary focus:ring-primary cursor-pointer appearance-none checked:bg-primary checked:border-primary relative transition-all before:content-[''] before:absolute before:w-2 before:h-1 before:border-b-2 before:border-l-2 before:border-white before:left-[5px] before:top-[6px] before:-rotate-45 before:opacity-0 checked:before:opacity-100"
                                    checked={selectedExpenses.includes(expense.uid)}
                                    onChange={() => handleCheckboxChange(expense.uid)}
                                  />
                                </div>
                              </td>
                              <td className="px-5 py-4 text-sm text-gray-700 border-r border-gray-200">
                                <div className="flex items-center gap-2">
                                  {expense.custom_expense_category_name
                                    ? `${expense.custom_expense_category_name} (${expense.expenseCategory})`
                                    : expense.expenseCategory}
                                  {isFailed && (
                                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold text-red-600 bg-red-100 rounded-full">
                                      FAILED
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-4 text-sm text-gray-700 border-r border-gray-200">
                                {expense.custom_expense_type
                                  ? `${expense.custom_expense_type} (${expense.expenseType})`
                                  : expense.expenseType}
                              </td>
                              <td className="px-5 py-4 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">
                                {expense.expense_date
                                  ? formatToIndianDate(expense.expense_date)
                                  : "-"}
                              </td>
                              <td className="px-5 py-4 text-sm text-gray-600 border-r border-gray-200">{expense.merchant || "-"}</td>
                              <td className="px-5 py-4 text-sm text-gray-600 border-r border-gray-200">{expense.invoice_number || "-"}</td>
                              <td className="px-5 py-4 text-sm font-bold text-gray-900 border-r border-gray-200">{expense.amount ?? "-"}</td>
                              <td className="px-5 py-4 text-sm whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => handleEdit(expense)}
                                    className="p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors"
                                    title="Edit"
                                  >
                                    <SquarePen className="w-4 h-4" />
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
                                    className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col md:flex-row md:justify-end mt-4 gap-2">
                  <Button variant="outline" size="md" className="font-semibold w-full md:w-auto" onClick={() => {
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
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      bgColor="primary"
                      size="md"
                      onClick={() => handleInitialSubmit("General")}
                      disabled={!expenses.some(e => (e.categoryType || "General") === "General" && selectedExpenses.includes(e.uid))}
                      className="font-semibold shadow-sm flex-1 md:flex-none"
                    >
                      Submit Selected
                    </Button>
                    <Button
                      bgColor="error"
                      size="md"
                      onClick={handleDeleteSelected}
                      disabled={!expenses.some(e => (e.categoryType || "General") === "General" && selectedExpenses.includes(e.uid))}
                      className="font-semibold shadow-sm flex-1 md:flex-none"
                    >
                      Delete Selected
                    </Button>
                  </div>
                </div>
              </div>
            )}


            {/* FIX 5: Comprehensive state reset in "Add More" button */}
            {/* <div className="flex justify-end mt-4 gap-3">
              <Button variant="outline" size="md" className="font-semibold" onClick={() => {
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
              </Button>
            </div> */}
          </div>
        )}
      </div>

      {
        isAcknowledgementOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
              <h3 className="text-lg font-semibold mb-4">Acknowledgement</h3>
              <p className="mb-2 font-medium">I acknowledge that:</p>
              <ul className="list-disc pl-5 mb-4 text-sm space-y-1 text-gray-700">
                <li>
                  I have raised the expense as per the policy-defined limits
                </li>
                <li>I have attached payment proof for all bills</li>
                <li>
                  I have uploaded the approval email screenshot for exceptional
                  expenses.
                </li>
              </ul>
              <div className="flex items-start gap-2 mb-4">
                <input
                  type="checkbox"
                  id="ack-checkbox"
                  checked={isAcknowledgementChecked}
                  onChange={(e) => setIsAcknowledgementChecked(e.target.checked)}
                  className="mt-1 w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label
                  htmlFor="ack-checkbox"
                  className="text-sm text-gray-800 cursor-pointer"
                >
                  Otherwise I acknowledge that, the claim may be rejected on a
                  later stage.
                </label>
              </div>

              {pendingSubmissionType === "Relocation" && (
                <div className="flex items-start gap-2 mb-6">
                  <input
                    type="checkbox"
                    id="relocation-ack-checkbox"
                    checked={isRelocationAcknowledgementChecked}
                    onChange={(e) => setIsRelocationAcknowledgementChecked(e.target.checked)}
                    className="mt-1 w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label
                    htmlFor="relocation-ack-checkbox"
                    className="text-sm text-gray-800 cursor-pointer"
                  >
                    I confirm that I have submitted all my relocation expenses.
                  </label>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button variant="outline" size="md" className="font-semibold" onClick={() => setIsAcknowledgementOpen(false)}>
                  Cancel
                </Button>
                <Button size="md" className="font-semibold" onClick={handleProceed}>
                  Proceed
                </Button>
              </div>
            </div>
          </div>
        )
      }

      {isDeleteShareConfirmOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Confirm Removal
            </h3>
            <p className="mb-6 text-sm text-gray-700">Are you sure you want to remove the shared expense? This will delete all added participants.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="md" className="font-semibold" onClick={() => setIsDeleteShareConfirmOpen(false)}>
                Cancel
              </Button>
              <Button size="md" className="font-semibold text-white bg-red-600" onClick={handleDeleteParticipants}>
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}

      {
        isSharePanelOpen && (
          <ParticipantsDrawer
            isOpen={isSharePanelOpen}
            onClose={() => setIsSharePanelOpen(false)}
            expenseAmount={Number(
              editingExpenseId
                ? (expenses.find((x) => x.uid === editingExpenseId)?.amount ??
                  dynamicFormData?.amount)
                : (dynamicFormData?.amount ?? 0),
            )}
            initialParticipants={initialDrawerParticipants}
            editingExpenseId={editingExpenseId}
            expenses={expenses}
            setExpenses={(fn) => setExpenses(fn)}
            currentEmployee={currentEmployee as any}
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
              }

              // Always ensure dynamicFormData is updated so the current form UI (like the participants table) re-renders
              setDynamicFormData((prev: any) => ({
                ...prev,
                participants: formattedParticipants,
                // Automatically enable share checkbox if participants are added
                shareExpenseCheckbox: formattedParticipants.length > 0 ? true : prev?.shareExpenseCheckbox
              }));

              // If adding participants for the first time, we might need a quick re-key to ensure 
              // the Form.io checkbox "pointer-events-none" class updates based on the new displayParticipants.length
              if (formattedParticipants.length > 0) {
                // We use a small timeout to avoid sync state update during render issues if any
                setTimeout(() => setFormKey(k => k + 1), 100);
              }
            }}
          />
        )
      }
    </div >
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
