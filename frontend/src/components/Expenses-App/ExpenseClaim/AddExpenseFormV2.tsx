/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.form.css";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Upload } from "lucide-react";

import { expenseSchema } from "./expenseSchema";
import ExpenseFieldSkeleton from "./ExpenseFieldSkeleton";
import DesktopLayoutWrapper from "../../DesktopLayoutWrapper";
import HeaderBar from "../../HeaderBar";
import { ExpenseNavigationExpense } from "./expenseNavigationHelper";

import { useCurrentEmployeeAllDetails, useEmployees } from "../../../hooks/useEmployee";
import {
  useCalculateExpenseAmount,
  useGetExpenseTypeFields,
  useGetExpenseAttachments,
  usePostExpenseClaim,
  useGetUnitPrice,
  useUpdateExpense,
  useValidateExpense,
  useDeleteExpenseAttachment,
  useUpdateFileAttachment,
} from "../../../hooks/useExpense";
import { useFileUploader } from "../../../hooks/useFileUploader";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useLoadingOverlay } from "../../../context/OverlayContext";

import { buildExpenseTypeDynamicSchema } from "./expenseTypeFieldsMapper";
import { toAttachmentArray } from "../../../utils/attachment.utils";
import { getCustomFileComponents, getHiddenFileListKeys, extractPendingCustomFiles, applyUploadedUrlsToFormData } from "../../../utils/formio.utils";
import { buildInitialDynamicFormData } from "../../../utils/expenseTransformers";

import { useExpenseFormState } from "../../../hooks/useExpenseFormState";
import { useReceiptOCR } from "../../../hooks/useReceiptOCR";
import { useExpenseAttachmentsManager } from "../../../hooks/useExpenseAttachmentsManager";
import { useExpenseModals } from "../../../hooks/useExpenseModals";
import { submitExpenseFlow } from "../../../services/expenseSubmission.service";

import { ReceiptUploadSection } from "./ReceiptUploadSection";
import { ExpenseParticipantsSection } from "./ExpenseParticipantsSection";
import { ExpenseActionBar } from "./ExpenseActionBar";
import { AttachmentPreviewVanillaV2 } from "./AttachmentPreview";
import { ExpenseAcknowledgementModal } from "./ExpenseAcknowledgementModal";

export interface AddExpenseFormV2Props {
  initialExpense?: ExpenseNavigationExpense | null;
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
}) => {
  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();
  const loading = useLoadingOverlay();

  const { data: currentEmployee } = useCurrentEmployeeAllDetails({
    fields: ["name", "employee_name", "company"],
  });

  const { data: employeesList, isFetching: isLoadingEmployees } = useEmployees([
    "name",
    "employee_name",
  ]);

  const { mutateAsync: submitExpenseClaim } = usePostExpenseClaim();
  const { mutateAsync: updateExpenseClaim } = useUpdateExpense();
  const { mutateAsync: validateExpense } = useValidateExpense();
  const { mutateAsync: updateFileLink } = useUpdateFileAttachment();
  const { mutateAsync: deleteExpenseAttachment } = useDeleteExpenseAttachment();
  const { uploadFiles } = useFileUploader();

  const isEditingExistingExpense = Boolean(
    initialExpense &&
    (expense_claim_name || draft_document_name || isEditingFromDetailsPage),
  );

  // Form.io fires an initial onChange for shareExpenseCheckbox ONLY when the submission
  // already contains it as `true` (i.e., the expense has existing participants).
  // The ref absorbs that single hydration fire so the drawer doesn't auto-open.
  // For all other cases (no participants, new expense) the ref starts as `true` so
  // the user's first manual toggle is never accidentally swallowed.
  const hasInitialParticipants =
    isEditingExistingExpense &&
    Array.isArray(initialExpense?.participants) &&
    (initialExpense?.participants as any[]).length > 0;
  const shareCheckboxHydratedRef = useRef(!hasInitialParticipants);
  const isDraftExpenseEdit = Boolean(
    draft_document_name || initialExpense?.approval_status === "Draft",
  );
  const linkedDocumentName = draft_document_name || expense_claim_name || undefined;
  const linkedDocumentType = draft_document_name ? "Draft Expense Claim" : "Expense Claim";

  const {
    isSharePanelOpen,
    setIsSharePanelOpen,
    isDeleteShareConfirmOpen,
    setIsDeleteShareConfirmOpen,
    isAcknowledgementOpen,
    setIsAcknowledgementOpen,
    isAcknowledgementChecked,
    setIsAcknowledgementChecked,
    isRelocationAcknowledgementChecked,
    setIsRelocationAcknowledgementChecked,
  } = useExpenseModals();

  const {
    setOcrStatus,
    setOcrSummary,
    setIsManualMode,
  } = useReceiptOCR({
    isEditingExistingExpense,
    mainFormData: {}, // Initialized fully in context later
    dynamicFormData: {},
    setDynamicFormData: () => { },
    setDynamicFormRevision: () => { },
  });

  const {
    selectedExpenseType,
    setSelectedExpenseType,
    mainFormData,
    setMainFormData,
    dynamicFormData,
    setDynamicFormData,
    dynamicFormRevision,
    setDynamicFormRevision,
    hydrationRef,
  } = useExpenseFormState({
    initialExpense,
    isEditingExistingExpense,
    setOcrStatus,
    setOcrSummary,
    setIsManualMode,
    setIsSharePanelOpen,
  });

  // Re-patch OCR hooks since they need access to exact state dispatchers
  const ocrDeps = useReceiptOCR({
    isEditingExistingExpense,
    mainFormData,
    dynamicFormData,
    setDynamicFormData,
    setDynamicFormRevision,
  });
  const handleReceiptUploadOverride = ocrDeps.handleReceiptUpload;

  const {
    data: claimAttachmentDocuments = [],
    isFetched: hasFetchedClaimAttachments,
    refetch: refetchClaimAttachments,
  } = useGetExpenseAttachments(linkedDocumentName, linkedDocumentType);

  const { data: expenseTypePayload, isFetching: isFetchingExpenseFields } =
    useGetExpenseTypeFields(selectedExpenseType);

  const customFileComponents = useMemo(
    () => getCustomFileComponents(expenseTypePayload?.custom_form_data),
    [expenseTypePayload?.custom_form_data]
  );
  const customFileKeys = useMemo(
    () => customFileComponents.map((c: any) => c.key),
    [customFileComponents]
  );
  const hasAttachReceiptField = useMemo(() => {
    const fields = expenseTypePayload?.fields;
    return Array.isArray(fields) && fields.some((f: any) => f?.fieldname === "attach_receipt");
  }, [expenseTypePayload]);

  const hiddenFileListKeys = useMemo(() =>
    getHiddenFileListKeys(customFileComponents, hasAttachReceiptField),
    [customFileComponents, hasAttachReceiptField]
  );

  const {
    visibleAttachments,
    currentAttachments,
    removeFormioFile,
    hasFileFieldDelta,
  } = useExpenseAttachmentsManager({
    dynamicFormData,
    setDynamicFormData,
    customFileKeys,
    claimAttachmentDocuments,
    hasFetchedClaimAttachments,
    linkedDocumentName,
    deleteExpenseAttachment,
    refetchClaimAttachments,
    onAttachmentsChanged: () => {
      setDataVersion((v) => v + 1);
    },
  });

  useEffect(() => {
    if (hydrationRef.current || isEditingExistingExpense) return;
    if (expenseTypePayload?.fields) {
      const defaultValues = expenseTypePayload.fields.reduce(
        (acc: Record<string, any>, field: any) => {
          if (field.default !== undefined) {
            acc[field.fieldname] = field.default;
          }
          return acc;
        },
        {},
      );
      if (Object.keys(defaultValues).length > 0) {
        setDynamicFormData((prev) => ({ ...defaultValues, ...prev }));
        hydrationRef.current = true;
      }
    }
  }, [expenseTypePayload, isEditingExistingExpense, setDynamicFormData, hydrationRef]);

  const vehicleType =
    typeof dynamicFormData?.vehicle_type === "string"
      ? dynamicFormData.vehicle_type
      : dynamicFormData?.vehicle_type?.name || "";

  // ── Odometer → Units pure computation helper ──
  const computeUnitsFromOdometer = useCallback(
    (formData: Record<string, any>): number | null => {
      const rawFrom = formData?.odometer_from;
      const rawTo = formData?.odometer_to;
      const numFrom = rawFrom !== undefined && rawFrom !== null && rawFrom !== "" ? Number(rawFrom) : NaN;
      const numTo = rawTo !== undefined && rawTo !== null && rawTo !== "" ? Number(rawTo) : NaN;
      if (Number.isFinite(numFrom) && Number.isFinite(numTo) && numTo >= numFrom) {
        return numTo - numFrom;
      }
      return null;
    },
    [],
  );

  /**
   * dataVersion: drives dynamicSubmission recalculation (in-place update, no remount).
   * dynamicFormRevision: drives Form key change (full remount — only for structural resets).
   * Separating these eliminates flicker from computed-value updates.
   */
  const [dataVersion, setDataVersion] = useState(0);

  // Whether odometer fields drive units (makes units field readonly)
  const isUnitsFromOdometer = useMemo(() => {
    const fields = expenseTypePayload?.fields;
    if (!Array.isArray(fields)) return false;
    return fields.some((f: any) => f?.fieldname === "odometer_from") &&
      fields.some((f: any) => f?.fieldname === "odometer_to");
  }, [expenseTypePayload]);

  const rawUnits = dynamicFormData?.units ?? dynamicFormData?.no_of_units;
  const unitsValue =
    rawUnits !== undefined && rawUnits !== null && rawUnits !== ""
      ? Number(rawUnits)
      : undefined;

  const { data: unitPriceData } = useGetUnitPrice(selectedExpenseType, vehicleType);

  const { data: calculatedAmountData } = useCalculateExpenseAmount({
    expense_type: selectedExpenseType,
    units: unitsValue as number,
    vehicle_type: vehicleType,
  });

  const calculatedAmount = useMemo(() => {
    const rawAmount =
      calculatedAmountData && typeof calculatedAmountData === "object" && "amount" in calculatedAmountData
        ? (calculatedAmountData as any).amount
        : (calculatedAmountData as any)?.message?.amount;
    const numeric = Number(rawAmount);
    return Number.isFinite(numeric) ? numeric : null;
  }, [calculatedAmountData]);

  // When amount comes from API, update React state and bump dataVersion for in-place resync
  useEffect(() => {
    if (calculatedAmount === null) return;
    setDynamicFormData((prev) => {
      if (prev?.amount === calculatedAmount) return prev;
      return { ...prev, amount: calculatedAmount };
    });
    // Bump dataVersion so dynamicSubmission recalculates → Form.io updates in-place (no remount)
    setDataVersion((v) => v + 1);
  }, [calculatedAmount, setDynamicFormData]);

  const isAmountReadonly = useMemo(() => {
    return expenseTypePayload?.is_amount_readonly ?? false;
  }, [expenseTypePayload]);

  const isAttachmentMandatory = useMemo(() => {
    const fields = expenseTypePayload?.fields;
    if (!Array.isArray(fields)) return false;
    return fields.some(
      (f: any) =>
        f?.fieldname === "attach_receipt" &&
        (f?.required === true || f?.required === 1),
    );
  }, [expenseTypePayload]);

  const unitFieldLabel = useMemo(() => {
    if (unitPriceData) {
      if (typeof unitPriceData === "object" && "message" in unitPriceData) {
        return (unitPriceData as any).message;
      }
      if (typeof unitPriceData === "string") {
        return unitPriceData;
      }
    }
    const fields = expenseTypePayload?.fields;
    if (!Array.isArray(fields)) return undefined;
    const unitField = fields.find((f: any) => f?.fieldname === "no_of_units");
    return unitField?.label || undefined;
  }, [expenseTypePayload, unitPriceData]);

  const dynamicSchema = useMemo(
    () =>
      buildExpenseTypeDynamicSchema(expenseTypePayload, {
        employeeName: currentEmployee?.name || "",
        expenseType: selectedExpenseType,
        isAmountReadonly,
        unitFieldLabel,
        isUnitsReadonly: isUnitsFromOdometer,
      }),
    [expenseTypePayload, currentEmployee?.name, selectedExpenseType, isAmountReadonly, unitFieldLabel, isUnitsFromOdometer],
  );

  const mainSubmission = useMemo(() => {
    const nextData = { ...mainFormData };
    if (!nextData.employee) nextData.employee = currentEmployee?.name || "";
    if (isEditingExistingExpense && initialExpense) {
      if (!nextData.expenseCategory) nextData.expenseCategory = initialExpense.reimbursement_category || initialExpense.expenseCategory || "";
      if (!nextData.expenseType) nextData.expenseType = initialExpense.expense_type || initialExpense.expenseType || "";
    }
    return { data: nextData };
  }, [mainFormData, currentEmployee?.name, isEditingExistingExpense, initialExpense]);

  /**
   * CRITICAL: dynamicSubmission must NOT depend on dynamicFormData.
   * If it does, every onChange → setDynamicFormData → new submission object → Form.io
   * re-renders ALL fields → flicker. Instead, we snapshot the data only when
   * dynamicFormRevision changes (explicit resets like amount from API or expense type switch).
   */
  const dynamicFormDataRef = useRef(dynamicFormData);
  dynamicFormDataRef.current = dynamicFormData;

  const dynamicSubmission = useMemo(
    () => ({
      data: {
        ...buildInitialDynamicFormData(initialExpense),
        ...dynamicFormDataRef.current,
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialExpense, dynamicFormRevision, dataVersion],
  );

  const displayParticipants = useMemo(
    () => Array.isArray(dynamicFormData?.participants) ? dynamicFormData.participants : [],
    [dynamicFormData?.participants],
  );
  const maxAllowedParticipants = Number(expenseTypePayload?.shared_expense_limit || 0);
  const isShareAllowed = Boolean(expenseTypePayload?.shared_expense_allowed);

  const isPerMileage = useMemo(() => {
    const expenseTypeObj = mainFormData?.expenseType;
    if (expenseTypeObj && typeof expenseTypeObj === "object") {
      return expenseTypeObj.claim_type_based_on === "Per Mileage";
    }
    return false;
  }, [mainFormData?.expenseType]);

  const shouldShowDynamicForm =
    isEditingExistingExpense || isPerMileage || ocrDeps.isManualMode || ocrDeps.ocrStatus === "completed" || ocrDeps.ocrStatus === "failed";

  const handleActionFlow = async (forSubmit: boolean, approvalStatus?: string) => {
    await submitExpenseFlow({
      forSubmit,
      approvalStatus,
      onSuccess: () => setIsAcknowledgementOpen(false),
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
      extractCustomFiles: () => extractPendingCustomFiles(customFileKeys, dynamicFormData),
      uploadFiles,
      applyUploadedCustomFileUrls: applyUploadedUrlsToFormData,
      validateExpense: async (payload: string) => { await validateExpense(payload); },
      updateExpenseClaim: async (payload: any) => { await updateExpenseClaim(payload); },
      submitExpenseClaim,
      updateFileLink: async (payload: any) => { await updateFileLink(payload); },
      loading,
      navigate,
      toast,
    });
  };

  const ocrParsingSteps = useMemo(() => {
    if (ocrDeps.ocrStatus !== "parsing") return [];
    return [
      { label: "Analyzing receipt...", delay: 0 },
      { label: "Extracting amount...", delay: 800 },
      { label: "Matching expense fields...", delay: 1600 },
    ];
  }, [ocrDeps.ocrStatus]);

  const [pendingSubmissionType, setPendingSubmissionType] = useState<"General" | "Relocation" | null>(null);

  const FormContent = (
    <div className="flex flex-col h-full bg-white">
      <HeaderBar
        title={isEditingExistingExpense ? "Edit Expense" : "Add Expense"}
        onBack={() => navigate(-1)}
      />
      <div className="flex-1 overflow-y-auto p-4 pb-10">
        <Form
          form={expenseSchema}
          submission={mainSubmission}
          className="show-req-astrik"
          onChange={(change: any) => {
            const nextData = change?.data || {};
            const changedKey = change?.changed?.component?.key;
            const rawExpenseType = change?.data?.expenseType;

            const nextExpenseType =
              typeof rawExpenseType === "string" ? rawExpenseType : rawExpenseType?.name || rawExpenseType?.value || "";
            const nextExpenseCategory =
              typeof nextData.expenseCategory === "string" ? nextData.expenseCategory : nextData.expenseCategory?.name || nextData.expenseCategory?.value || "";

            if (isEditingExistingExpense && !changedKey && (!nextExpenseType || !nextExpenseCategory)) return;

            setMainFormData(nextData);

            if (changedKey && (changedKey === "category_type" || changedKey === "expenseCategory")) {
              setDynamicFormData({});
              setIsSharePanelOpen(false);
              ocrDeps.setOcrStatus("idle");
              ocrDeps.setOcrSummary({ amount: "", merchant: "", expense_date: "" });
              ocrDeps.setIsManualMode(false);
            }

            setSelectedExpenseType((prev) => {
              if (!nextExpenseType && isEditingExistingExpense && !changedKey) return prev;
              const next = prev === nextExpenseType ? prev : nextExpenseType;
              if (next !== prev) {
                ocrDeps.setOcrStatus(isEditingExistingExpense ? "completed" : "idle");
                ocrDeps.setOcrSummary({ amount: "", merchant: "", expense_date: "" });
                ocrDeps.setIsManualMode(false);
              }
              return next;
            });
          }}
        />

        {!isPerMileage && (
          <ReceiptUploadSection
            visibleAttachments={visibleAttachments}
            ocrStatus={ocrDeps.ocrStatus}
            ocrSummary={ocrDeps.ocrSummary}
            ocrParsingSteps={ocrParsingSteps}
            isEditingExistingExpense={isEditingExistingExpense}
            isManualMode={ocrDeps.isManualMode}
            selectedExpenseType={selectedExpenseType}
            isFetchingExpenseFields={isFetchingExpenseFields}
            onUpload={handleReceiptUploadOverride}
            onProceedManually={ocrDeps.handleProceedManually}
          />
        )}

        {selectedExpenseType && shouldShowDynamicForm && (
          <div
            style={{
              marginTop: "1rem",
              animation: isEditingExistingExpense ? "none" : "formReveal 0.5s ease-out forwards",
            }}
          >
            <style>{`
              @keyframes formReveal {
                from { opacity: 0; transform: translateY(12px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
            {isFetchingExpenseFields ? (
              <ExpenseFieldSkeleton />
            ) : (
              <>
                {hiddenFileListKeys.length > 0 && (
                  <style>{`
                  ${hiddenFileListKeys.map((key) => `.formio-component-${key} .list-group { display: none !important; }`).join("\n")}
                `}</style>
                )}
                {!isEditingExistingExpense && ocrDeps.isManualMode && (
                  <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/40 to-indigo-50/40 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-gray-800">
                          Entering details manually
                        </p>
                        <p className="text-[10px] text-gray-500">
                          You can switch back to scan a receipt for auto-filling.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        ocrDeps.setIsManualMode(false);
                        ocrDeps.setOcrStatus("idle");
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-xs font-bold text-blue-600 shadow-sm transition-all hover:bg-blue-50/80 active:scale-[0.98] sm:w-auto"
                    >
                      <Upload className="h-3.5 w-3.5 text-blue-500" />
                      Upload Receipt Instead
                    </button>
                  </div>
                )}
                <Form
                  key={`${selectedExpenseType || "no-expense-type"}-${dynamicFormRevision}`}
                  form={dynamicSchema}
                  submission={dynamicSubmission}
                  className="show-req-astrik"
                  onChange={(change: any) => {
                    const changedKey = change?.changed?.component?.key;
                    const nextData = change?.data || {};

                    if (!changedKey) {
                      if (hasFileFieldDelta(nextData)) {
                        setDynamicFormData((prev) => ({ ...prev, ...nextData }));
                      }
                      return;
                    }

                    // ── Odometer → Units: inline computation for instant feedback ──
                    if (
                      isUnitsFromOdometer &&
                      (changedKey === "odometer_from" || changedKey === "odometer_to")
                    ) {
                      const computed = computeUnitsFromOdometer(nextData);
                      // Functional merge: preserves existing computed values (amount) that Form.io may not have yet
                      setDynamicFormData((prev) => ({
                        ...prev,
                        ...nextData,
                        ...(computed !== null ? { units: computed } : {}),
                      }));
                      // Bump dataVersion for in-place submission update (no remount)
                      if (computed !== null) {
                        setDataVersion((v) => v + 1);
                      }
                      return;
                    }

                    if (changedKey === "shareExpenseCheckbox" && isShareAllowed) {
                      // Skip only the very first fire in edit mode — that is always
                      // Form.io's initial hydration event, not a real user interaction.
                      if (!shareCheckboxHydratedRef.current) {
                        shareCheckboxHydratedRef.current = true;
                        setDynamicFormData((prev) => ({ ...prev, ...nextData }));
                        return;
                      }

                      const isChecked = Boolean(nextData?.shareExpenseCheckbox);
                      const currentAmount = Number(nextData?.amount ?? dynamicFormDataRef.current?.amount ?? 0);

                      if (isChecked && !(currentAmount > 0)) {
                        toast.error("Please enter an amount before sharing the expense.");
                        setDynamicFormData((prev) => ({ ...prev, ...nextData, shareExpenseCheckbox: false }));
                        setIsSharePanelOpen(false);
                        return;
                      }

                      if (!isChecked && displayParticipants.length > 0) {
                        setDynamicFormData((prev) => ({ ...prev, ...nextData, shareExpenseCheckbox: true }));
                        setIsDeleteShareConfirmOpen(true);
                        return;
                      }

                      setIsSharePanelOpen(isChecked);
                    }

                    setDynamicFormData((prev) => ({ ...prev, ...nextData }));
                  }}
                />
              </>
            )}
          </div>
        )}

        {shouldShowDynamicForm && (
          <>
            <ExpenseParticipantsSection
              displayParticipants={displayParticipants}
              isDesktop={isDesktop}
              isShareAllowed={isShareAllowed}
              isSharePanelOpen={isSharePanelOpen}
              setIsSharePanelOpen={setIsSharePanelOpen}
              isDeleteShareConfirmOpen={isDeleteShareConfirmOpen}
              setIsDeleteShareConfirmOpen={setIsDeleteShareConfirmOpen}
              dynamicFormData={dynamicFormData}
              setDynamicFormData={setDynamicFormData}
              setDynamicFormRevision={setDynamicFormRevision}
              currentEmployee={currentEmployee}
              maxAllowedParticipants={maxAllowedParticipants}
              employeesList={employeesList}
              isLoadingEmployees={isLoadingEmployees}
            />

            <AttachmentPreviewVanillaV2
              currentAttachments={visibleAttachments}
              onRemove={(index) => removeFormioFile("attach_receipt", index)}
              portalId="attachment-preview-portal-v2"
            />

            {customFileComponents.map((comp: any) => {
              const files = toAttachmentArray(dynamicFormData[comp.key]);
              if (files.length === 0) return null;
              return (
                <AttachmentPreviewVanillaV2
                  key={String(comp.key)}
                  currentAttachments={files}
                  onRemove={(index) => removeFormioFile(String(comp.key), index)}
                  compKey={String(comp.key)}
                  heading={comp.label || "Attachments Preview"}
                />
              );
            })}
          </>
        )}

        {selectedExpenseType && shouldShowDynamicForm && !isFetchingExpenseFields && (
          <ExpenseActionBar
            isEditingExistingExpense={isEditingExistingExpense}
            isDraftExpenseEdit={isDraftExpenseEdit}
            onSave={() => handleActionFlow(false)}
            onUpdate={() => handleActionFlow(false)}
            onSaveAndSubmit={() => {
              const categoryType = (mainFormData?.category_type || "General") as "General" | "Relocation";
              setPendingSubmissionType(categoryType);
              setIsAcknowledgementChecked(false);
              setIsRelocationAcknowledgementChecked(false);
              setIsAcknowledgementOpen(true);
            }}
          />
        )}

        <ExpenseAcknowledgementModal
          isOpen={isAcknowledgementOpen}
          onClose={() => setIsAcknowledgementOpen(false)}
          isAcknowledgementChecked={isAcknowledgementChecked}
          setIsAcknowledgementChecked={setIsAcknowledgementChecked}
          pendingSubmissionType={pendingSubmissionType}
          isRelocationAcknowledgementChecked={isRelocationAcknowledgementChecked}
          setIsRelocationAcknowledgementChecked={setIsRelocationAcknowledgementChecked}
          onConfirm={(status) => handleActionFlow(true, status)}
        />
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <DesktopLayoutWrapper title={isEditingExistingExpense ? "Edit Expense" : "Add Expense"}>
        {FormContent}
      </DesktopLayoutWrapper>
    );
  }

  return <div className="h-screen bg-white">{FormContent}</div>;
};

export default AddExpenseFormV2;
