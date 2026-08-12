/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { format } from "date-fns";
import { normalizeExpensePayloadData } from "../utils/expenseTransformers";

export const buildCombinedData = (
  mainFormData: Record<string, any>,
  dynamicFormData: Record<string, any>,
) => {
  return normalizeExpensePayloadData({ ...mainFormData, ...dynamicFormData });
};

export const buildExpenseRecord = (
  combinedData: Record<string, any>,
  forSubmit: boolean,
  isAcknowledgementChecked: boolean,
  isRelocationAcknowledgementChecked: boolean,
  expenseTypePayload: any,
) => {
  const rawExpenseType = combinedData.expenseType;
  const expenseTypeName =
    rawExpenseType && typeof rawExpenseType === "object"
      ? rawExpenseType.name || rawExpenseType.value || ""
      : rawExpenseType || "";

  // Resolve custom_location: Form.io may return the full City object; extract name as the value.
  const rawLocation = combinedData.custom_location;
  const resolvedLocation =
    rawLocation && typeof rawLocation === "object"
      ? rawLocation.name || ""
      : rawLocation || "";

  const record: Record<string, any> = {
    ...combinedData,
    expense_type: expenseTypeName,
    reimbursement_category: combinedData.expenseCategory,
    // `category_type` is the key the API reads; `custom_category_type` mirrors the
    // Expense Claim Detail fieldname. Keep both so the payload is unambiguous.
    category_type: combinedData.category_type || "General",
    custom_category_type: combinedData.category_type || "General",
    custom_expense_category_name: combinedData.expenseCategory,
    custom_expense_type: expenseTypeName,
    amount: combinedData.amount,
    ...(rawLocation !== undefined ? { custom_location: resolvedLocation } : {}),
  };

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

  delete record.uid;
  delete record.categoryTypeOptions;
  delete record.submitButton;
  delete record.saveAndSubmit;
  delete record.attach_receipt;
  delete record.expenseType;
  delete record.expenseCategory;
  delete record.custom_odometer_from;
  delete record.custom_odometer_to;

  if (forSubmit) {
    record.custom_is_acknowledged = isAcknowledgementChecked;
    if ((combinedData.category_type || "General") === "Relocation") {
      record.custom_is_last_relocation_expense =
        isRelocationAcknowledgementChecked;
    }
  }

  const customFormDataObj: Record<string, any> = {};

  if (expenseTypePayload?.custom_form_data) {
    try {
      const parsedCustomForm =
        typeof expenseTypePayload.custom_form_data === "string"
          ? JSON.parse(expenseTypePayload.custom_form_data)
          : expenseTypePayload.custom_form_data;

      const extractFieldKeys = (components: any[]): string[] => {
        const keys: string[] = [];
        if (!Array.isArray(components)) return keys;
        components.forEach((comp: any) => {
          if (comp?.key) keys.push(comp.key);
          if (Array.isArray(comp?.components))
            keys.push(...extractFieldKeys(comp.components));
          if (Array.isArray(comp?.columns)) {
            comp.columns.forEach((col: any) => {
              if (Array.isArray(col?.components))
                if (Array.isArray(col?.components))
                  keys.push(...extractFieldKeys(col.components));
            });
          }
        });
        return keys;
      };

      const customFormFieldKeys = extractFieldKeys(
        parsedCustomForm?.components || [],
      );

      customFormFieldKeys.forEach((key) => {
        if (combinedData[key] !== undefined) {
          customFormDataObj[key] = combinedData[key];
          delete record[key];
        }
      });

      if (Object.keys(customFormDataObj).length > 0) {
        record.custom_form_data = JSON.stringify(customFormDataObj);
      }
    } catch (e) {
      console.error("Failed to parse custom_form_data schema", e);
    }
  }

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

export const submitValidation = async (
  combinedData: Record<string, any>,
  currentEmployee: any,
  draft_document_name: string | null | undefined,
  expense_claim_name: string | null | undefined,
  validateExpense: (payload: string) => Promise<void>,
  buildExpenseRecordFn: (data: any, forSubmit: boolean) => any,
) => {
  const validationPayload: Record<string, unknown> = {
    employee: currentEmployee?.name,
    employee_name: currentEmployee?.employee_name,
    company: currentEmployee?.company,
    posting_date: format(new Date(), "yyyy-MM-dd"),
    expenses: [buildExpenseRecordFn(combinedData, true)],
  };

  if (draft_document_name) {
    validationPayload.expense_claim_name = draft_document_name;
  } else if (expense_claim_name) {
    validationPayload.expense_claim_name = expense_claim_name;
  }

  await validateExpense(JSON.stringify(validationPayload));
};

export interface SubmitExpenseFlowParams {
  forSubmit: boolean;
  approvalStatus?: string;
  onSuccess?: () => void;
  // context deps
  mainFormData: Record<string, any>;
  dynamicFormData: Record<string, any>;
  currentAttachments: any[];
  isAttachmentMandatory: boolean;
  isEditingExistingExpense: boolean;
  draft_document_name?: string | null;
  expense_claim_name?: string | null;
  linkedDocumentType: string;
  linkedDocumentName?: string;
  initialExpense: any;
  currentEmployee: any;
  isDraftExpenseEdit: boolean;
  expenseTypePayload: any;
  isAcknowledgementChecked: boolean;
  isRelocationAcknowledgementChecked: boolean;
  // actions
  extractCustomFiles: () => { filesToUpload: any[]; fileKeyMap: Record<number, any> };
  uploadFiles: (files: any[], doctype?: string, docname?: string) => Promise<any[]>;
  applyUploadedCustomFileUrls: (data: any, results: any[], map: any) => any;
  validateExpense: (payload: string) => Promise<void>;
  updateExpenseClaim: (payload: any) => Promise<void>;
  submitExpenseClaim: (payload: string) => Promise<any>;
  updateFileLink: (payload: any) => Promise<void>;
  loading: { show: (msg: string) => void; hide: () => void };
  navigate: (path: string, options?: any) => void;
  toast: any;
}

export const submitExpenseFlow = async ({
  forSubmit,
  approvalStatus,
  onSuccess,
  mainFormData,
  dynamicFormData,
  currentAttachments,
  isAttachmentMandatory,
  isEditingExistingExpense,
  draft_document_name,
  expense_claim_name,
  linkedDocumentType,
  linkedDocumentName,
  initialExpense,
  currentEmployee,
  isDraftExpenseEdit,
  expenseTypePayload,
  isAcknowledgementChecked,
  isRelocationAcknowledgementChecked,
  extractCustomFiles,
  uploadFiles,
  applyUploadedCustomFileUrls,
  validateExpense,
  updateExpenseClaim,
  submitExpenseClaim,
  updateFileLink,
  loading,
  navigate,
  toast,
}: SubmitExpenseFlowParams) => {
  try {
    const combinedDataBeforeUpload = buildCombinedData(mainFormData, dynamicFormData);
    const pendingReceiptUploads = currentAttachments.filter(
      (attachment: any) =>
        Boolean(attachment?.file) && !attachment?.url && !attachment?.file_url,
    );
    if (
      !combinedDataBeforeUpload.expenseCategory ||
      !combinedDataBeforeUpload.expenseType
    ) {
      toast.error("Please select Expense Category and Expense Type!");
      return;
    }
    if (isAttachmentMandatory && currentAttachments.length === 0 && forSubmit) {
      toast.error("Please attach a receipt to proceed.");
      return;
    }

    loading.show("Saving Expense...");

    const localBuildExpenseRecord = (data: any, isSubmit: boolean) =>
      buildExpenseRecord(
        data,
        isSubmit,
        isAcknowledgementChecked,
        isRelocationAcknowledgementChecked,
        expenseTypePayload,
      );

    if (forSubmit) {
      await submitValidation(
        combinedDataBeforeUpload,
        currentEmployee,
        draft_document_name,
        expense_claim_name,
        validateExpense,
        localBuildExpenseRecord,
      );
    }

    const { filesToUpload, fileKeyMap } = extractCustomFiles();
    let finalDynamicData = dynamicFormData;
    let customUploadResults: any[] = [];
    const customFileLinkDoctype = isEditingExistingExpense
      ? linkedDocumentType
      : undefined;
    const customFileLinkDocName = isEditingExistingExpense
      ? linkedDocumentName
      : undefined;

    if (filesToUpload.length > 0) {
      customUploadResults = await uploadFiles(
        filesToUpload,
        customFileLinkDoctype,
        customFileLinkDocName,
      );
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
    const expenseRecord = localBuildExpenseRecord(finalCombinedData, forSubmit);

    if (isEditingExistingExpense && (expense_claim_name || draft_document_name)) {
      const documentName = (draft_document_name || expense_claim_name) as string;

      const originalParticipants = (initialExpense?.participants as any[]) || [];

      const activeParticipants = Array.isArray(dynamicFormData?.participants)
        ? dynamicFormData.participants.filter(
            (p: any) => !!p.employee || !!p.guest_name,
          )
        : [];

      const activeMapped = activeParticipants.map((p: any) => {
        const match = originalParticipants.find((orig: any) => {
          if (p.employee_type === "Guest") {
            return (
              orig.employee_type === "Guest" && orig.guest_name === p.guest_name
            );
          }
          return orig.employee_type !== "Guest" && orig.employee === p.employee;
        });

        const dbName = match?.name || p.name;

        return {
          // Omit `name` for brand-new participants so the backend creates them;
          // include it for existing ones so the backend updates in place.
          ...(dbName ? { name: dbName } : {}),
          employee_type: p.employee_type,
          employee: p.employee,
          employee_name: p.employee_name,
          guest_name: p.guest_name,
          percentage:
            p.percentage !== undefined && p.percentage !== null
              ? Number(p.percentage)
              : undefined,
        };
      });

      // Use activeParticipants.length as fallback: when the expense was originally
      // created with no participants, shareExpenseCheckbox is never set during
      // hydration, so we must also check whether participants were actually added.
      const participantsData =
        (dynamicFormData?.shareExpenseCheckbox || activeParticipants.length > 0)
          ? activeMapped
          : [];

      const updatePayload = isDraftExpenseEdit
        ? {
            expense_claim_name: documentName,
            expenses: [expenseRecord],
            isResubmit: false,
            ...(forSubmit
              ? { approval_status: "Pending" }
              : approvalStatus
                ? { approval_status: approvalStatus }
                : {}),
            participants: participantsData,
          }
        : {
            expense_claim_name: documentName,
            expenses: [expenseRecord],
            isResubmit: true,
            participants: participantsData,
          };

      await updateExpenseClaim({
        ...updatePayload,
      });

      if (pendingReceiptUploads.length > 0) {
        await uploadFiles(
          pendingReceiptUploads,
          linkedDocumentType,
          documentName,
        );
      }

      onSuccess?.();
      navigate("/webapp/expenses-app/expenses-list", {
        state: { refresh: true },
      });
      return;
    }

    const submitPayload: any = {
      employee: currentEmployee?.name,
      employee_name: currentEmployee?.employee_name,
      company: currentEmployee?.company,
      posting_date: format(new Date(), "yyyy-MM-dd"),
      expenses: [expenseRecord],
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
      if (pendingReceiptUploads.length > 0) {
        await uploadFiles(pendingReceiptUploads, "Expense Claim", claimName);
      }

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
      state: {
        refresh: true,
        initialFilter: approvalStatus ? "Pending" : "Draft",
      },
    });
  } catch (error) {
    console.error("Expense submission flow failed:", error);
  } finally {
    loading.hide();
  }
};
