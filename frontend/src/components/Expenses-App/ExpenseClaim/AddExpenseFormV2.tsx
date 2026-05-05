/* eslint-disable @typescript-eslint/no-explicit-any */
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.form.css";
import { expenseSchema } from "./expenseSchema";
import {
  useCurrentEmployeeAllDetails,
  useEmployees,
} from "../../../hooks/useEmployee";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  useCalculateExpenseAmount,
  useGetExpenseTypeFields,
  usePostExpenseClaim,
  useGetUnitPrice,
  useValidateExpense,
  useUpdateFileAttachment,
} from "../../../hooks/useExpense";
import { buildExpenseTypeDynamicSchema } from "./expenseTypeFieldsMapper";
import ExpenseFieldSkeleton from "./ExpenseFieldSkeleton";
import Button from "../../shared/atoms/Button";
import ParticipantsDrawer from "./ParticipantDrawer";
import toast from "react-hot-toast";
import { format, isValid, parseISO } from "date-fns";
import { useFileUploader } from "../../../hooks/useFileUploader";
import { useNavigate } from "react-router-dom";
import { SquarePen, Trash2 } from "lucide-react";
import DesktopLayoutWrapper from "../../DesktopLayoutWrapper";
import HeaderBar from "../../HeaderBar";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useLoadingOverlay } from "../../../context/OverlayContext";
import {
  FormioPreviewItem,
  FormioPreviewPortal,
} from "../../shared/molecules/FormioPreview";

const AttachmentPreviewPortalV2: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [targetDom, setTargetDom] = useState<Element | null>(null);

  useLayoutEffect(() => {
    let currentTarget: Element | null = null;

    const findAndSetTarget = () => {
      const slot = document.getElementById("attachment-preview-portal-v2");
      if (!slot) return;

      if (currentTarget !== slot) {
        currentTarget = slot;
        setTargetDom(slot);
      }
    };

    findAndSetTarget();

    const observer = new MutationObserver(() => {
      if (!currentTarget || !document.body.contains(currentTarget)) {
        findAndSetTarget();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, []);

  if (!targetDom) return null;

  return createPortal(children, targetDom);
};

const normalizeDateOnly = (value: unknown) => {
  if (!value) return value;

  if (value instanceof Date) {
    return format(value, "yyyy-MM-dd");
  }

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(value)) {
      const [year, month, day] = value.split("-").map(Number);
      return [
        String(year),
        String(month).padStart(2, "0"),
        String(day).padStart(2, "0"),
      ].join("-");
    }

    const isoCandidate = value.includes(" ") ? value.replace(" ", "T") : value;
    const parsedFromIso = parseISO(isoCandidate);
    if (isValid(parsedFromIso)) {
      return format(parsedFromIso, "yyyy-MM-dd");
    }

    const parsedFromDate = new Date(value);
    if (!Number.isNaN(parsedFromDate.getTime())) {
      return format(parsedFromDate, "yyyy-MM-dd");
    }
  }

  return value;
};

const normalizeExpensePayloadData = (data: Record<string, any>) => {
  const normalizedData = { ...data };

  if (normalizedData.expense_date) {
    normalizedData.expense_date = normalizeDateOnly(
      normalizedData.expense_date,
    );
  }

  if (normalizedData.start_datetime) {
    normalizedData.start_datetime = format(
      new Date(normalizedData.start_datetime),
      "yyyy-MM-dd HH:mm:ss",
    );
  }

  if (normalizedData.end_datetime) {
    normalizedData.end_datetime = format(
      new Date(normalizedData.end_datetime),
      "yyyy-MM-dd HH:mm:ss",
    );
  }

  return normalizedData;
};

export interface AddExpenseFormV2Props {
  initialExpense?: any;
  expense_claim_name?: string | null;
  draft_document_name?: string | null;
  isEditingFromDetailsPage?: boolean;
  isResubmit?: boolean;
}

const AddExpenseFormV2: React.FC<AddExpenseFormV2Props> = ({
  initialExpense,
  expense_claim_name,
  draft_document_name,
  isEditingFromDetailsPage,
  isResubmit,
}) => {

  console.log('initialExpense', initialExpense, expense_claim_name, draft_document_name, isEditingFromDetailsPage, isResubmit);
  const { data: currentEmployee } = useCurrentEmployeeAllDetails({
    fields: ["name", "employee_name", "company"],
  });

  const [selectedExpenseType, setSelectedExpenseType] = useState<string>("");
  const [mainFormData, setMainFormData] = useState<Record<string, any>>({});
  const [dynamicFormData, setDynamicFormData] = useState<Record<string, any>>(
    {},
  );
  const [isSharePanelOpen, setIsSharePanelOpen] = useState(false);
  const [isDeleteShareConfirmOpen, setIsDeleteShareConfirmOpen] =
    useState(false);
  const [isAcknowledgementOpen, setIsAcknowledgementOpen] = useState(false);
  const [isAcknowledgementChecked, setIsAcknowledgementChecked] =
    useState(false);
  const [
    isRelocationAcknowledgementChecked,
    setIsRelocationAcknowledgementChecked,
  ] = useState(false);
  const [pendingSubmissionType, setPendingSubmissionType] = useState<
    "General" | "Relocation" | null
  >(null);
  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();
  const loading = useLoadingOverlay();

  const mainSubmission = useMemo(
    () => ({
      data: {
        employee: currentEmployee?.name || "",
        category_type: "General",
      },
    }),
    [currentEmployee?.name],
  );

  const { data: expenseTypeFieldsData, isFetching: isFetchingExpenseFields } =
    useGetExpenseTypeFields(selectedExpenseType);
  const { mutateAsync: validateExpense } = useValidateExpense();
  const { mutateAsync: submitExpenseClaim } = usePostExpenseClaim();
  const { mutateAsync: updateFileLink } = useUpdateFileAttachment();
  const { uploadFiles } = useFileUploader();

  const expenseTypePayload = useMemo(
    () =>
      expenseTypeFieldsData?.message &&
        typeof expenseTypeFieldsData.message === "object"
        ? expenseTypeFieldsData.message
        : expenseTypeFieldsData || {},
    [expenseTypeFieldsData],
  );

  const claimTypeBasedOn = expenseTypePayload?.claim_type_based_on;
  const isAmountReadonly = !!expenseTypePayload?.is_amount_readonly;
  const isShareAllowed = Boolean(expenseTypePayload?.shared_expense_allowed);
  const maxAllowedParticipants =
    Number(expenseTypePayload?.shared_expense_limit) || 5;
  const isAttachmentMandatory = useMemo(() => {
    const fields = expenseTypePayload?.fields;
    if (!Array.isArray(fields)) return false;
    return fields.some(
      (f: any) =>
        f?.fieldname === "attach_receipt" &&
        (f?.required === true || f?.required === 1),
    );
  }, [expenseTypePayload]);
  const hasAttachReceiptField = useMemo(() => {
    const fields = expenseTypePayload?.fields;
    if (!Array.isArray(fields)) return false;
    return fields.some((f: any) => f?.fieldname === "attach_receipt");
  }, [expenseTypePayload]);
  const displayParticipants = useMemo(
    () =>
      Array.isArray(dynamicFormData?.participants)
        ? dynamicFormData.participants
        : [],
    [dynamicFormData?.participants],
  );

  const customFileComponents = useMemo(() => {
    const customData = expenseTypePayload?.custom_form_data;
    if (!customData) return [];
    try {
      const parsed =
        typeof customData === "string" ? JSON.parse(customData) : customData;
      if (!parsed || !Array.isArray(parsed.components)) return [];

      const findFiles = (comps: any[]): any[] => {
        let files: any[] = [];
        comps.forEach((c) => {
          if (c.type === "file") files.push(c);
          if (Array.isArray(c.components))
            files = [...files, ...findFiles(c.components)];
          if (Array.isArray(c.columns)) {
            c.columns.forEach((col: any) => {
              if (Array.isArray(col.components))
                files = [...files, ...findFiles(col.components)];
            });
          }
        });
        return files;
      };

      return findFiles(parsed.components);
    } catch (e) {
      console.error("Failed to parse custom_form_data for file search", e);
      return [];
    }
  }, [expenseTypePayload?.custom_form_data]);

  const customFileKeys = useMemo(() => {
    return customFileComponents.map((c: any) => c.key);
  }, [customFileComponents]);

  const hiddenFileListKeys = useMemo(() => {
    const keys = customFileComponents.map((comp: any) => String(comp.key));
    if (hasAttachReceiptField) {
      keys.push("attach_receipt");
    }
    return Array.from(new Set(keys));
  }, [customFileComponents, hasAttachReceiptField]);

  const extractCustomFiles = useCallback(() => {
    const filesToUpload: any[] = [];
    const fileKeyMap: Record<number, { key: string; index: number }> = {};

    customFileKeys.forEach((key) => {
      const val = dynamicFormData[key];
      const files = Array.isArray(val) ? val : val ? [val] : [];
      files.forEach((f: any, idx: number) => {
        if (f && f.file && !f.url && !f.file_url) {
          fileKeyMap[filesToUpload.length] = { key, index: idx };
          filesToUpload.push(f);
        }
      });
    });

    return { filesToUpload, fileKeyMap };
  }, [customFileKeys, dynamicFormData]);

  const applyUploadedCustomFileUrls = (
    currentDynamicData: Record<string, any>,
    uploadResults: any[],
    fileKeyMap: Record<number, { key: string; index: number }>,
  ) => {
    const nextData = { ...currentDynamicData };
    uploadResults.forEach((res, i) => {
      if (!res) return;
      const mapInfo = fileKeyMap[i];
      if (!mapInfo) return;
      const { key, index } = mapInfo;
      const val = nextData[key];
      const files = Array.isArray(val) ? [...val] : [val];

      if (files[index]) {
        files[index] = {
          ...files[index],
          name: res.file_name || files[index].name,
          originalName: files[index].name || res.file_name,
          size: res.file_size || files[index].size,
          type: res.file_type || files[index].type,
          url: res.file_url,
          file_url: res.file_url,
          storage: "url",
        };
      }

      nextData[key] = Array.isArray(val) ? files : files[0];
    });
    return nextData;
  };

  const removeFormioFile = (compKey: string, index: number) => {
    setDynamicFormData((prev) => {
      const next = { ...prev };
      const files = Array.isArray(next[compKey]) ? [...next[compKey]] : [];
      files.splice(index, 1);
      next[compKey] = files;
      return next;
    });
  };

  const { data: employeesList, isFetching: isLoadingEmployees } = useEmployees([
    "name",
    "employee_name",
  ]);

  const vehicleType =
    typeof dynamicFormData?.vehicle_type === "string"
      ? dynamicFormData.vehicle_type
      : dynamicFormData?.vehicle_type?.name || "";

  const rawUnits = dynamicFormData?.units ?? dynamicFormData?.no_of_units;
  const unitsValue =
    rawUnits !== undefined && rawUnits !== null && rawUnits !== ""
      ? Number(rawUnits)
      : undefined;
  const hasValidUnits =
    unitsValue !== undefined && Number.isFinite(unitsValue) && unitsValue >= 0;

  const shouldCalculateAmount =
    !!selectedExpenseType &&
    hasValidUnits &&
    (claimTypeBasedOn !== "Per Mileage" || !!vehicleType);

  const calcParams = useMemo(
    () =>
      shouldCalculateAmount
        ? {
          expense_type: selectedExpenseType,
          units: Number(unitsValue),
          vehicle_type: vehicleType || undefined,
        }
        : undefined,
    [shouldCalculateAmount, selectedExpenseType, unitsValue, vehicleType],
  );

  const { data: calculatedAmountData } = useCalculateExpenseAmount(calcParams);

  const { data: unitPriceData } = useGetUnitPrice(
    selectedExpenseType || undefined,
    vehicleType || undefined,
  );

  const unitFieldLabel = useMemo(() => {
    // Primary: handle direct string returned by callMethod (response.data.message)
    if (typeof unitPriceData === "string" && unitPriceData.trim()) {
      return unitPriceData;
    }

    // Secondary: handle object payload variants safely
    if (
      unitPriceData &&
      typeof unitPriceData === "object" &&
      "message" in unitPriceData
    ) {
      if (typeof unitPriceData.message === "string") {
        return unitPriceData.message;
      }

      if (
        unitPriceData.message &&
        typeof unitPriceData.message === "object" &&
        "label" in unitPriceData.message
      ) {
        return String(unitPriceData.message.label || "");
      }
    }

    // Fallback: API field label from get_expense_type_fields payload
    const unitsField = Array.isArray(expenseTypePayload?.fields)
      ? expenseTypePayload.fields.find(
        (field: any) =>
          field?.fieldname === "units" || field?.fieldname === "no_of_units",
      )
      : null;

    // Final fallback
    return unitsField?.label || "Units";
  }, [unitPriceData, expenseTypePayload]);

  useEffect(() => {
    if (!selectedExpenseType) {
      setMainFormData({});
      setDynamicFormData({});
      setIsSharePanelOpen(false);
    }
  }, [selectedExpenseType]);

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

  const calculatedAmount = useMemo(() => {
    const rawAmount =
      calculatedAmountData &&
        typeof calculatedAmountData === "object" &&
        "amount" in calculatedAmountData
        ? (calculatedAmountData as any).amount
        : (calculatedAmountData as any)?.message?.amount;
    const numeric = Number(rawAmount);
    return Number.isFinite(numeric) ? numeric : null;
  }, [calculatedAmountData]);

  useEffect(() => {
    if (calculatedAmount === null) return;

    setDynamicFormData((prev) => {
      if (prev?.amount === calculatedAmount) return prev;
      return {
        ...prev,
        amount: calculatedAmount,
      };
    });
  }, [calculatedAmount]);

  const dynamicSchema = useMemo(
    () =>
      buildExpenseTypeDynamicSchema(expenseTypeFieldsData, {
        employeeName: currentEmployee?.name || "",
        expenseType: selectedExpenseType,
        isAmountReadonly,
        unitFieldLabel,
      }),
    [
      expenseTypeFieldsData,
      currentEmployee?.name,
      selectedExpenseType,
      isAmountReadonly,
      unitFieldLabel,
    ],
  );

  const dynamicFormRenderKey = useMemo(
    () => selectedExpenseType || "no-expense-type",
    [selectedExpenseType],
  );

  const dynamicSubmission = useMemo(
    () => ({ data: dynamicFormData }),
    [dynamicFormData],
  );

  const currentAttachments = useMemo(() => {
    const raw = dynamicFormData?.attach_receipt;
    if (Array.isArray(raw)) return [...raw];
    return raw ? [raw] : [];
  }, [dynamicFormData]);

  const visibleAttachments = useMemo(
    () =>
      currentAttachments.filter((item: any) => {
        if (item?.deleted === true) return false;
        if (item?.remove === true) return false;
        if (
          typeof item?.status === "string" &&
          item.status.toLowerCase().includes("remove")
        ) {
          return false;
        }
        return true;
      }),
    [currentAttachments],
  );

  const buildCombinedData = () => {
    return normalizeExpensePayloadData({ ...mainFormData, ...dynamicFormData });
  };

  const buildExpenseRecord = (
    combinedData: Record<string, any>,
    forSubmit: boolean,
  ) => {
    const record: Record<string, any> = {
      ...combinedData,
      expense_type: combinedData.expenseType,
      reimbursement_category: combinedData.expenseCategory,
      categoryType: combinedData.category_type || "General",
      custom_expense_category_name: combinedData.expenseCategory,
      custom_expense_type: combinedData.expenseType,
    };

    // Format attachments as a comma-separated string of filenames
    const files = Array.isArray(combinedData.attach_receipt)
      ? combinedData.attach_receipt
      : combinedData.attach_receipt
        ? [combinedData.attach_receipt]
        : [];

    if (files.length > 0) {
      record.attachments = files
        .map((f: any) => f.name || f.originalName || "file")
        .join(", ");
    } else {
      record.attachments = "";
    }

    // Remove unwanted keys as requested
    delete record.uid;
    delete record.categoryTypeOptions;
    delete record.submitButton;
    delete record.saveAndSubmit;
    delete record.attach_receipt; // Remove the original array/object

    // Keep original keys for V1 compatibility if needed, but buildExpenseRecord usually maps them
    // The user's example shows expenseCategory and expenseType are still there.
    // record.expense_type and record.reimbursement_category are also added above.

    if (forSubmit) {
      record.custom_is_acknowledged = isAcknowledgementChecked;
      if ((combinedData.category_type || "General") === "Relocation") {
        record.custom_is_last_relocation_expense =
          isRelocationAcknowledgementChecked;
      }
    }

    // Handle custom_form_data extraction to match V1 behavior
    if (expenseTypePayload?.custom_form_data) {
      const standardKeys = new Set([
        "attachments",
        "shareExpenseCheckbox",
        "saveAndSubmit",
        "submitButton",
        "submit",
        "participants",
        "amount",
        "expenseType",
        "expenseCategory",
        "category_type",
        "custom_expense_category_name",
        "custom_expense_type",
        ...(expenseTypePayload?.fields?.map((f: any) => f.fieldname) || []),
      ]);

      const customFormDataObj: Record<string, any> = {};
      Object.keys(combinedData).forEach((key) => {
        if (!standardKeys.has(key)) {
          customFormDataObj[key] = combinedData[key];
          delete record[key];
        }
      });

      if (Object.keys(customFormDataObj).length > 0) {
        record.custom_form_data = JSON.stringify(customFormDataObj);
      }
    }

    // Clean up file objects
    Object.keys(record).forEach((key) => {
      const val = record[key];
      if (
        Array.isArray(val) &&
        val.some(
          (item: any) =>
            item?.storage === "customfiles" || item?.storage === "base64",
        )
      ) {
        record[key] = "";
      }
    });

    return record;
  };

  const submitValidation = async (combinedData: Record<string, any>) => {
    const validationPayload = {
      employee: currentEmployee?.name,
      employee_name: currentEmployee?.employee_name,
      company: currentEmployee?.company,
      posting_date: format(new Date(), "yyyy-MM-dd"),
      expense_claim_name: "",
      expenses: [buildExpenseRecord(combinedData, true)],
    };

    await validateExpense(JSON.stringify(validationPayload));
  };

  const submitExpenseFlow = async ({
    forSubmit,
    approvalStatus,
    onSuccess,
  }: {
    forSubmit: boolean;
    approvalStatus?: string;
    onSuccess?: () => void;
  }) => {
    try {
      const combinedDataBeforeUpload = buildCombinedData();
      if (
        !combinedDataBeforeUpload.expenseCategory ||
        !combinedDataBeforeUpload.expenseType
      ) {
        toast.error("Please select Expense Category and Expense Type!");
        return;
      }
      if (isAttachmentMandatory && currentAttachments.length === 0) {
        toast.error("Please attach a receipt to proceed.");
        return;
      }

      loading.show("Saving Expense...");

      // 1. Validate first before submitting or uploading linked data.
      await submitValidation(combinedDataBeforeUpload);

      const { filesToUpload, fileKeyMap } = extractCustomFiles();
      let finalDynamicData = dynamicFormData;
      let customUploadResults: any[] = [];

      // 2. Upload custom files first so their final URLs can be part of the claim payload.
      if (filesToUpload.length > 0) {
        customUploadResults = await uploadFiles(filesToUpload);
        finalDynamicData = applyUploadedCustomFileUrls(
          dynamicFormData,
          customUploadResults,
          fileKeyMap,
        );
      }

      const finalCombinedData = normalizeExpensePayloadData({
        ...combinedDataBeforeUpload,
        ...finalDynamicData,
      });

      // 3. Submit the actual expense claim payload.
      const submitPayload: any = {
        employee: currentEmployee?.name,
        employee_name: currentEmployee?.employee_name,
        company: currentEmployee?.company,
        posting_date: format(new Date(), "yyyy-MM-dd"),
        expenses: [
          buildExpenseRecord(finalCombinedData, forSubmit),
        ],
      };

      if (approvalStatus) {
        submitPayload.approval_status = approvalStatus;
      }

      const response: any = await submitExpenseClaim(
        JSON.stringify(submitPayload),
      );
      const claimName =
        response?.claims?.[0]?.name ||
        (typeof response?.message === "string" ? response.message : null);

      if (claimName) {
        // 4. Upload standard receipts after the claim exists so they are linked correctly.
        if (currentAttachments.length > 0) {
          await uploadFiles(currentAttachments, "Expense Claim", claimName);
        }

        // 5. Link uploaded custom files back to the created claim.
        if (customUploadResults.length > 0) {
          for (const res of customUploadResults) {
            if (res && (res.name || res.file_name)) {
              await updateFileLink({
                fileName: res.name || res.file_name,
                data: {
                  attached_to_doctype: "Expense Claim",
                  attached_to_name: claimName,
                },
              });
            }
          }
        }
      }

      onSuccess?.();
      navigate("/webapp/expenses-app/expenses-list", {
        state: { refresh: true, initialFilter: approvalStatus ? "Pending" : "Draft" },
      });
    } catch (error) {
      console.error("Expense submission flow failed:", error);
    } finally {
      loading.hide();
    }
  };

  const handleSave = async () => {
    await submitExpenseFlow({
      forSubmit: false,
    });
  };

  const handleSaveAndSubmitClick = () => {
    const categoryType = (mainFormData?.category_type || "General") as
      | "General"
      | "Relocation";
    setPendingSubmissionType(categoryType);
    setIsAcknowledgementChecked(false);
    setIsRelocationAcknowledgementChecked(false);
    setIsAcknowledgementOpen(true);
  };

  const handleProceedSubmit = async () => {
    if (!isAcknowledgementChecked) {
      toast.error("Please acknowledge the terms to proceed.");
      return;
    }

    await submitExpenseFlow({
      forSubmit: true,
      approvalStatus: "Pending",
      onSuccess: () => setIsAcknowledgementOpen(false),
    });
  };

  const FormContent = (
    <div className="flex flex-col h-full bg-white">
      <HeaderBar title="Add Expense" onBack={() => navigate(-1)} />
      <div className="flex-1 overflow-y-auto p-4 pb-10">
        <Form
          form={expenseSchema}
          submission={mainSubmission}
          className="show-req-astrik"
          onChange={(change: any) => {
            setMainFormData(change?.data || {});
            const rawExpenseType = change?.data?.expenseType;
            const nextExpenseType =
              typeof rawExpenseType === "string"
                ? rawExpenseType
                : rawExpenseType?.name || rawExpenseType?.value || "";
            setSelectedExpenseType((prev) =>
              prev === nextExpenseType ? prev : nextExpenseType,
            );
          }}
        />

        {selectedExpenseType && (
          <div style={{ marginTop: "1rem" }}>
            {isFetchingExpenseFields ? (
              <ExpenseFieldSkeleton />
            ) : (
              <>
                {hiddenFileListKeys.length > 0 && (
                  <style>{`
                  ${hiddenFileListKeys
                      .map(
                        (key) =>
                          `.formio-component-${key} .list-group { display: none !important; }`,
                      )
                      .join("\n")}
                `}</style>
                )}
                <Form
                  key={dynamicFormRenderKey}
                  form={dynamicSchema}
                  submission={dynamicSubmission}
                  className="show-req-astrik"
                  onChange={(change: any) => {
                    const nextData = change?.data || {};
                    const changedKey = change?.changed?.component?.key;

                    if (
                      changedKey === "shareExpenseCheckbox" &&
                      isShareAllowed
                    ) {
                      const isChecked = Boolean(nextData?.shareExpenseCheckbox);
                      const currentAmount = Number(nextData?.amount ?? 0);

                      if (isChecked && !(currentAmount > 0)) {
                        toast.error(
                          "Please enter an amount before sharing the expense.",
                        );
                        setDynamicFormData({
                          ...nextData,
                          shareExpenseCheckbox: false,
                        });
                        setIsSharePanelOpen(false);
                        return;
                      }

                      if (
                        !isChecked &&
                        Array.isArray(nextData?.participants) &&
                        nextData.participants.length > 0
                      ) {
                        setDynamicFormData({
                          ...nextData,
                          shareExpenseCheckbox: true,
                        });
                        setIsDeleteShareConfirmOpen(true);
                        return;
                      }

                      setIsSharePanelOpen(isChecked);
                    }

                    setDynamicFormData({ ...nextData });
                  }}
                />
              </>
            )}

            {customFileComponents.map((comp: any) => {
              const files = Array.isArray(dynamicFormData[comp.key])
                ? dynamicFormData[comp.key]
                : [];
              if (files.length === 0) return null;

              return (
                <FormioPreviewPortal
                  key={comp.key as string}
                  compKey={comp.key as string}
                >
                  <div className="mt-2 space-y-2 w-full">
                    {files.map((fileObj: any, idx: number) => (
                      <FormioPreviewItem
                        key={`${String(comp.key)}-${idx}`}
                        fileObj={fileObj}
                        onRemove={() =>
                          removeFormioFile(comp.key as string, idx)
                        }
                      />
                    ))}
                  </div>
                </FormioPreviewPortal>
              );
            })}
          </div>
        )}

        {displayParticipants.length > 0 && (
          <div className="mt-4 rounded-lg border bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-md font-medium">Participants</div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSharePanelOpen(true)}
                  className="text-md flex items-center font-bold text-primary hover:underline"
                >
                  <SquarePen className="mr-1 h-4 w-4" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleteShareConfirmOpen(true)}
                  className="text-md flex items-center font-bold text-red-600 hover:underline"
                >
                  <Trash2 className="mr-1 h-4 w-4" />
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
                  {displayParticipants.map((p: any, idx: number) => (
                    <tr key={idx} className="border-t">
                      <td className="px-2 py-2 align-top">{idx + 1}</td>
                      <td className="px-2 py-2 align-top">
                        {p.employee_type ?? "-"}
                      </td>
                      <td className="px-2 py-2 align-top">
                        {p.guest_name ||
                          p.employee_name ||
                          p.employee ||
                          p.name ||
                          "-"}
                      </td>
                      <td className="px-2 py-2 align-top">
                        {p.percentage !== undefined && p.percentage !== null
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

        {visibleAttachments.length > 0 && (
          <AttachmentPreviewPortalV2>
            <div className="mt-2 w-full space-y-2">
              <h3 className="text-md font-medium text-gray-800">
                Attachments Preview
              </h3>
              {visibleAttachments.map((fileObj: any, idx: number) => (
                <FormioPreviewItem
                  key={`attach_receipt-${idx}`}
                  fileObj={fileObj}
                  onRemove={() => removeFormioFile("attach_receipt", idx)}
                />
              ))}
            </div>
          </AttachmentPreviewPortalV2>
        )}

        {selectedExpenseType && !isFetchingExpenseFields && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              size="md"
              onClick={handleSave}
              className="w-full font-semibold sm:w-fit"
            >
              Save
            </Button>
            <Button
              bgColor="primary"
              size="md"
              onClick={handleSaveAndSubmitClick}
              className="w-full font-semibold shadow-sm sm:w-fit"
            >
              Save & Submit
            </Button>
          </div>
        )}

        {isAcknowledgementOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h3 className="mb-4 text-lg font-semibold">Acknowledgement</h3>
              <p className="mb-2 font-medium">I acknowledge that:</p>
              <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-gray-700">
                <li>
                  I have raised the expense as per the policy-defined limits
                </li>
                <li>I have attached payment proof for all bills</li>
                <li>
                  I have uploaded the approval email screenshot for exceptional
                  expenses.
                </li>
              </ul>
              <div className="mb-4 flex items-start gap-2">
                <input
                  type="checkbox"
                  id="ack-checkbox-v2"
                  checked={isAcknowledgementChecked}
                  onChange={(e) =>
                    setIsAcknowledgementChecked(e.target.checked)
                  }
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label
                  htmlFor="ack-checkbox-v2"
                  className="cursor-pointer text-sm text-gray-800"
                >
                  Otherwise I acknowledge that, the claim may be rejected on a
                  later stage.
                </label>
              </div>

              {pendingSubmissionType === "Relocation" && (
                <div className="mb-6 flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="relocation-ack-checkbox-v2"
                    checked={isRelocationAcknowledgementChecked}
                    onChange={(e) =>
                      setIsRelocationAcknowledgementChecked(e.target.checked)
                    }
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label
                    htmlFor="relocation-ack-checkbox-v2"
                    className="cursor-pointer text-sm text-gray-800"
                  >
                    I acknowledge that I am claiming this for my family
                    relocation
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsAcknowledgementOpen(false)}
                >
                  Cancel
                </Button>
                <Button bgColor="primary" onClick={handleProceedSubmit}>
                  Confirm & Submit
                </Button>
              </div>
            </div>
          </div>
        )}

        {isSharePanelOpen && isShareAllowed && (
          <ParticipantsDrawer
            isOpen={isSharePanelOpen}
            onClose={() => setIsSharePanelOpen(false)}
            expenseAmount={Number(dynamicFormData?.amount ?? 0)}
            initialParticipants={displayParticipants}
            currentEmployee={currentEmployee as any}
            maxParticipants={maxAllowedParticipants}
            employeeOptions={employeesList as any}
            employeeOptionsLoading={isLoadingEmployees}
            onSave={(formattedParticipants) => {
              setDynamicFormData((prev: any) => ({
                ...prev,
                participants: formattedParticipants,
                shareExpenseCheckbox:
                  formattedParticipants.length > 0
                    ? true
                    : prev?.shareExpenseCheckbox,
              }));
              setIsSharePanelOpen(false);
            }}
          />
        )}

        {isDeleteShareConfirmOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-red-600">
                <Trash2 className="h-5 w-5" /> Confirm Removal
              </h3>
              <p className="mb-6 text-sm text-gray-700">
                Are you sure you want to remove the shared expense? This will
                delete all added participants.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  size="md"
                  className="font-semibold"
                  onClick={() => setIsDeleteShareConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="md"
                  className="bg-red-600 font-semibold text-white"
                  onClick={() => {
                    setDynamicFormData((prev) => ({
                      ...prev,
                      participants: [],
                      shareExpenseCheckbox: false,
                    }));
                    setIsDeleteShareConfirmOpen(false);
                    setIsSharePanelOpen(false);
                  }}
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
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

export default AddExpenseFormV2;
