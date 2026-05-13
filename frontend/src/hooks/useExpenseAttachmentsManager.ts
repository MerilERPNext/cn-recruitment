/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { AttachmentDocument } from "../types/expense.types";
import {
  areAttachmentListsEqual,
  dedupeAttachments,
  findMatchingAttachmentDocument,
  isPendingLocalAttachment,
  mapClaimAttachments,
  toAttachmentArray,
} from "../utils/attachment.utils";

export interface UseExpenseAttachmentsManagerProps {
  dynamicFormData: Record<string, any>;
  setDynamicFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  customFileKeys: string[];
  claimAttachmentDocuments: AttachmentDocument[];
  hasFetchedClaimAttachments: boolean;
  linkedDocumentName: string | null | undefined;
  deleteExpenseAttachment: (name: string) => Promise<any>;
  refetchClaimAttachments: () => Promise<any>;
}

export const useExpenseAttachmentsManager = ({
  dynamicFormData,
  setDynamicFormData,
  customFileKeys,
  claimAttachmentDocuments,
  hasFetchedClaimAttachments,
  linkedDocumentName,
  deleteExpenseAttachment,
  refetchClaimAttachments,
}: UseExpenseAttachmentsManagerProps) => {
  const attachmentHydrationRef = useRef(false);

  useEffect(() => {
    if (!linkedDocumentName || !hasFetchedClaimAttachments) return;

    const nextAttachments = mapClaimAttachments(claimAttachmentDocuments);

    setDynamicFormData((prev) => {
      let changed = !attachmentHydrationRef.current;
      const nextData = { ...prev };

      const existingAttachments = toAttachmentArray(prev.attach_receipt);
      const pendingReceiptAttachments = existingAttachments.filter(
        isPendingLocalAttachment,
      );
      const mergedReceiptAttachments = dedupeAttachments([
        ...nextAttachments,
        ...pendingReceiptAttachments,
      ]);

      if (
        !areAttachmentListsEqual(existingAttachments, mergedReceiptAttachments)
      ) {
        nextData.attach_receipt = mergedReceiptAttachments;
        changed = true;
      }

      customFileKeys.forEach((key) => {
        const currentFiles = toAttachmentArray(prev[key]);
        if (currentFiles.length === 0) return;

        const filteredFiles = currentFiles.filter((file) => {
          if (isPendingLocalAttachment(file)) {
            return true;
          }

          return Boolean(
            findMatchingAttachmentDocument(claimAttachmentDocuments, file),
          );
        });

        if (!areAttachmentListsEqual(currentFiles, filteredFiles)) {
          nextData[key] = Array.isArray(prev[key])
            ? filteredFiles
            : (filteredFiles[0] ?? []);
          changed = true;
        }
      });

      attachmentHydrationRef.current = true;
      return changed ? nextData : prev;
    });
  }, [
    claimAttachmentDocuments,
    customFileKeys,
    hasFetchedClaimAttachments,
    linkedDocumentName,
    setDynamicFormData,
  ]);

  const currentAttachments = useMemo(() => {
    const raw = dynamicFormData?.attach_receipt;
    if (Array.isArray(raw)) return [...raw];
    return raw ? [raw] : [];
  }, [dynamicFormData]);

  const customFormFileUrls = useMemo(() => {
    const urls: string[] = [];
    customFileKeys.forEach((key) => {
      const val = dynamicFormData[key];
      const files = Array.isArray(val) ? val : val ? [val] : [];
      files.forEach((f: any) => {
        const url = f?.url || f?.file_url;
        if (url) urls.push(url);
      });
    });
    return new Set(urls);
  }, [dynamicFormData, customFileKeys]);

  const visibleAttachments = useMemo(
    () =>
      dedupeAttachments(
        currentAttachments.filter((item: any) => {
          if (item?.deleted === true) return false;
          if (item?.remove === true) return false;
          if (
            typeof item?.status === "string" &&
            item.status.toLowerCase().includes("remove")
          ) {
            return false;
          }
          const itemUrl = item?.url || item?.file_url;
          if (itemUrl && customFormFileUrls.has(itemUrl)) return false;
          return true;
        }),
      ),
    [currentAttachments, customFormFileUrls],
  );

  const removeFormioFile = async (compKey: string, index: number) => {
    const currentValue = dynamicFormData?.[compKey];
    const currentFiles = toAttachmentArray(currentValue);
    const targetAttachment = currentFiles[index];
    const isArrayField = Array.isArray(currentValue);
    const nextFiles = currentFiles.filter((_: any, i: number) => i !== index);

    const nextFieldValue =
      isArrayField || currentValue === undefined
        ? nextFiles
        : (nextFiles[0] ?? []);

    try {
      const container = document.querySelector(`.formio-component-${compKey}`);
      if (container) {
        const removeButtons = container.querySelectorAll(
          'i[ref="fileStatusRemove"], i[ref="removeLink"], button[ref="removeLink"], i.fa-times',
        );
        if (removeButtons && removeButtons[index]) {
          (removeButtons[index] as HTMLElement).click();
        } else {
          console.error("Form.io native remove button not found");
        }
      }

      setDynamicFormData((prev) => ({
        ...prev,
        [compKey]: nextFieldValue,
      }));

      if (
        !targetAttachment ||
        !linkedDocumentName ||
        isPendingLocalAttachment(targetAttachment)
      ) {
        return;
      }

      const matchingDocument = findMatchingAttachmentDocument(
        claimAttachmentDocuments,
        targetAttachment,
      );

      if (!matchingDocument?.name) {
        return;
      }

      await deleteExpenseAttachment(matchingDocument.name);
      attachmentHydrationRef.current = false;
      await refetchClaimAttachments();
    } catch (err) {
      console.error("Failed to cleanly remove attachment:", err);
    }
  };

  const hasFileFieldDelta = useCallback(
    (nextData: Record<string, any>) => {
      const watchedKeys = new Set<string>([
        "attach_receipt",
        ...customFileKeys,
      ]);

      for (const key of watchedKeys) {
        if (
          !areAttachmentListsEqual(
            toAttachmentArray(dynamicFormData?.[key]),
            toAttachmentArray(nextData?.[key]),
          )
        ) {
          return true;
        }
      }
      return false;
    },
    [customFileKeys, dynamicFormData],
  );

  return {
    visibleAttachments,
    currentAttachments,
    removeFormioFile,
    hasFileFieldDelta,
    attachmentHydrationRef,
  };
};
