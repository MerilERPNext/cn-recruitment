/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";
import { OcrStatus, OcrSummary } from "../types/expense.types";
import { dedupeAttachments, toAttachmentArray } from "../utils/attachment.utils";
import {
  fileToBase64Content,
  getLocalReceiptFile,
  getReceiptFileFingerprint,
  isBlankExpenseValue,
} from "../utils/receipt.utils";
import { normalizeExpensePayloadData } from "../utils/expenseTransformers";
import { FrappeAPI } from "../utils/frappeAPI";

export interface UseReceiptOCRProps {
  isEditingExistingExpense: boolean;
  mainFormData: Record<string, any>;
  dynamicFormData: Record<string, any>;
  setDynamicFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setDynamicFormRevision: React.Dispatch<React.SetStateAction<number>>;
}

export const useReceiptOCR = ({
  isEditingExistingExpense,
  mainFormData,
  dynamicFormData,
  setDynamicFormData,
  setDynamicFormRevision,
}: UseReceiptOCRProps) => {
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>(
    isEditingExistingExpense ? "completed" : "idle",
  );
  const [ocrSummary, setOcrSummary] = useState<OcrSummary>({
    amount: "",
    merchant: "",
    expense_date: "",
  });
  const [isManualMode, setIsManualMode] = useState(false);
  const processedReceiptFilesRef = useRef<Set<string>>(new Set());

  const handleProceedManually = useCallback(() => {
    setIsManualMode(true);
  }, []);

  const applyReceiptExtraction = useCallback(
    (fields: Record<string, any>) => {
      if (!fields || typeof fields !== "object") return false;

      const hasUsableFields = [
        "expense_date",
        "amount",
        "description",
        "invoice_number",
        "merchant",
        "currency",
      ].some((key) => !isBlankExpenseValue(fields[key]));

      setDynamicFormData((prev) => {
        const nextData = { ...prev };
        let didApply = false;
        const fillIfBlank = (key: string, value: unknown) => {
          if (isBlankExpenseValue(value)) return;
          if (!isBlankExpenseValue(nextData[key])) return;
          nextData[key] = value;
          didApply = true;
        };

        fillIfBlank("expense_date", fields.expense_date);
        fillIfBlank("amount", fields.amount);
        fillIfBlank("description", fields.description);
        fillIfBlank("invoice_number", fields.invoice_number);
        fillIfBlank("merchant", fields.merchant);

        if (
          !isBlankExpenseValue(fields.currency) &&
          (isBlankExpenseValue(nextData.currency) ||
            (String(nextData.currency).toUpperCase() === "INR" &&
              String(fields.currency).toUpperCase() !== "INR"))
        ) {
          nextData.currency = fields.currency;
          didApply = true;
        }

        return didApply ? normalizeExpensePayloadData(nextData) : prev;
      });

      if (hasUsableFields) {
        setDynamicFormRevision((revision) => revision + 1);
      }

      return hasUsableFields;
    },
    [setDynamicFormData, setDynamicFormRevision],
  );

  const extractReceiptFromAttachments = useCallback(
    async (attachments: any[], latestDynamicData: Record<string, any>) => {
      const targetFile = toAttachmentArray(attachments)
        .map(getLocalReceiptFile)
        .find((file): file is File => Boolean(file));

      if (!targetFile) return;

      const fingerprint = getReceiptFileFingerprint(targetFile);
      if (processedReceiptFilesRef.current.has(fingerprint)) return;
      processedReceiptFilesRef.current.add(fingerprint);

      setOcrStatus("parsing");
      setOcrSummary({ amount: "", merchant: "", expense_date: "" });
      const toastId = toast.loading("Reading receipt...");

      try {
        const content = await fileToBase64Content(targetFile);
        const response = (await FrappeAPI.callMethod(
          "chatnext_expense_trips.document_extraction.api.extract_receipt_fields_from_base64",
          {
            file_name: targetFile.name,
            content,
            expense_category:
              mainFormData?.expenseCategory ||
              latestDynamicData?.expenseCategory ||
              "",
            expense_type:
              mainFormData?.expenseType || latestDynamicData?.expenseType || "",
          },
        )) as Record<string, any>;

        const fields =
          response && typeof response === "object" && "fields" in response
            ? (response.fields as Record<string, any>)
            : {};

        setOcrSummary({
          amount: fields.amount != null ? String(fields.amount) : "",
          merchant: typeof fields.merchant === "string" ? fields.merchant : "",
          expense_date:
            typeof fields.expense_date === "string" ? fields.expense_date : "",
        });

        if (applyReceiptExtraction(fields)) {
          toast.success(
            "Receipt details filled. Please review before saving.",
            {
              id: toastId,
            },
          );
        } else {
          toast("Receipt uploaded. I could not find new fields to fill.", {
            id: toastId,
          });
        }
        setOcrStatus("completed");
      } catch (error) {
        processedReceiptFilesRef.current.delete(fingerprint);
        console.error("Receipt extraction failed", error);
        toast.error(
          "Could not read this receipt. You can still enter it manually.",
          {
            id: toastId,
          },
        );
        setOcrStatus("failed");
      }
    },
    [applyReceiptExtraction, mainFormData?.expenseCategory, mainFormData?.expenseType],
  );

  const handleReceiptUpload = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const newAttachments = Array.from(files).map((file) => ({
        file,
        name: file.name,
        originalName: file.name,
        size: file.size,
        type: file.type,
        storage: "customfiles" as const,
      }));

      const merged = dedupeAttachments([
        ...toAttachmentArray(dynamicFormData?.attach_receipt),
        ...newAttachments,
      ]);

      setDynamicFormData((prev) => ({
        ...prev,
        attach_receipt: merged,
      }));

      void extractReceiptFromAttachments(merged, dynamicFormData);
    },
    [dynamicFormData, extractReceiptFromAttachments, setDynamicFormData],
  );

  return {
    ocrStatus,
    setOcrStatus,
    ocrSummary,
    setOcrSummary,
    isManualMode,
    setIsManualMode,
    handleReceiptUpload,
    handleProceedManually,
    processedReceiptFilesRef,
  };
};
