/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * TicketCloseModal — Centralized confirmation modal for closing/resolving tickets.
 *
 * Shows:
 *  - A simple "Do you want to close/resolve the ticket?" yes/no confirmation
 *  - Feedback form (if configured for the ticket's category)
 *  - Exit/closure form (if configured for the ticket's category)
 *
 * No textarea for resolution details — a default "resolved" value is sent automatically.
 */
import React, { useEffect, useRef, useState } from "react";
import { X, Loader2, CheckCircle } from "lucide-react";
import { Typography } from "../shared/atoms/Typography";
import {
  useGetExitFormJson,
  useGetFeedbackFormJson,
} from "../../hooks/useHelpDeskTickets";
import { FormIOForm, getFileComponents } from "../../utils/flowUtils";
import { getRequiredKeys } from "../../utils/formioUtils";
import { Form } from "@tsed/react-formio";
import { FormioFormSkeleton } from "./LoadingSkeletons";
import { FormioPreviewItem, FormioPreviewPortal } from "../shared/molecules/FormioPreview";
import type { CloseFlowModalState } from "../../hooks/useTicketCloseFlow";

interface TicketCloseModalProps {
  modalState: CloseFlowModalState;
  onClose: () => void;
  onSubmit: (
    exitFormSubmission?: any,
    feedbackFormSubmission?: any,
    exitAttachments?: File[],
    feedbackAttachments?: File[],
  ) => void;
  isLoading: boolean;
}

const removeFormioFile = (formId: string, compKey: string, index: number) => {
  try {
    const rootNode = document.getElementById(formId) || document;
    const container = rootNode.querySelector(`.formio-component-${compKey}`);
    if (container) {
      const removeButtons = container.querySelectorAll(
        'i[ref="fileStatusRemove"], i[ref="removeLink"], button[ref="removeLink"], i.fa-times',
      );
      if (removeButtons && removeButtons[index]) {
        (removeButtons[index] as HTMLElement).click();
      }
    }
  } catch (err) {
    console.error("Failed to remove file from formio", err);
  }
};

const renderFormioPreviews = (
  formId: string,
  formSchema: any,
  submissionData: any,
) => {
  if (!formSchema?.components) return null;
  const fileComps = getFileComponents(formSchema.components);
  if (fileComps.length === 0) return null;

  return (
    <>
      {fileComps.map((comp) => {
        const rawFiles = submissionData?.[comp.key as string];
        const files = Array.isArray(rawFiles)
          ? rawFiles
          : rawFiles
            ? [rawFiles]
            : [];
        if (files.length === 0) return null;

        return (
          <FormioPreviewPortal
            key={comp.key}
            compKey={comp.key as string}
            formContainerId={formId}
          >
            <div className="space-y-2 mt-2 w-full">
              {files.map((fileObj, idx) => (
                <FormioPreviewItem
                  key={`${comp.key}-${idx}`}
                  fileObj={fileObj}
                  onRemove={() =>
                    removeFormioFile(formId, comp.key as string, idx)
                  }
                />
              ))}
            </div>
          </FormioPreviewPortal>
        );
      })}
    </>
  );
};

const TicketCloseModal: React.FC<TicketCloseModalProps> = ({
  modalState,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const { isOpen, ticket, mode } = modalState;

  const [confirmAction, setConfirmAction] = useState<"yes" | "no">("no");

  /* ─── Formio Exit & Feedback Form Logic ─── */
  const { data: exitFormJsonData, isLoading: exitFormJsonLoading } =
    useGetExitFormJson({
      category: ticket?.custom_category,
      sub_category: ticket?.custom_sub_category,
    });
  const { data: feedbackFormJsonData, isLoading: feedbackFormJsonLoading } =
    useGetFeedbackFormJson({
      category: ticket?.custom_category,
      sub_category: ticket?.custom_sub_category,
    });

  const [feedbackFormAttachment, setFeedbackFormAttachment] = useState<File[]>(
    [],
  );
  const [exitFormAttachment, setExitFormAttachment] = useState<File[]>([]);

  const exitFormRef = useRef(null);
  const feedbackFormRef = useRef(null);

  const [exitFormJson, setExitFormJson] = useState<FormIOForm | null>(null);
  const [feedbackFormJson, setFeedbackFormJson] = useState<FormIOForm | null>(
    null,
  );

  const [isExitFormValid, setIsExitFormValid] = useState<boolean>(true);
  const [isFeedbackFormValid, setIsFeedbackFormValid] = useState<boolean>(true);

  const [exitFormSubmission, setExitFormSubmission] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [feedbackFormSubmission, setFeedbackFormSubmission] = useState<Record<
    string,
    unknown
  > | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setConfirmAction("no");
      setExitFormSubmission(null);
      setFeedbackFormSubmission(null);
      setExitFormAttachment([]);
      setFeedbackFormAttachment([]);
      setExitFormJson(null);
      setFeedbackFormJson(null);
      setIsExitFormValid(true);
      setIsFeedbackFormValid(true);
    }
  }, [isOpen]);

  // Parse exit form JSON
  useEffect(() => {
    if (!isOpen) return;
    if (
      !ticket?.custom_category ||
      !ticket?.custom_sub_category ||
      !Array.isArray(exitFormJsonData?.form_json?.components)
    )
      return;
    const components = exitFormJsonData?.form_json?.components;
    const requiredKeys = getRequiredKeys(components);

    setIsExitFormValid(requiredKeys.length === 0);
    if (components.length < 1) return;
    const filteredComponents = components.filter(
      (comp) => !(comp.type === "button" && comp.action === "submit"),
    );
    setExitFormJson({ display: "form", components: filteredComponents });
  }, [isOpen, exitFormJsonData, ticket?.custom_category, ticket?.custom_sub_category]);

  // Parse feedback form JSON
  useEffect(() => {
    if (!isOpen) return;
    if (
      !ticket?.custom_category ||
      !ticket?.custom_sub_category ||
      !Array.isArray(feedbackFormJsonData?.form_json?.components)
    )
      return;
    const components = feedbackFormJsonData?.form_json?.components;
    const requiredKeys = getRequiredKeys(components);

    setIsFeedbackFormValid(requiredKeys.length === 0);
    if (components.length < 1) return;
    const filteredComponents = components.filter(
      (comp) => !(comp.type === "button" && comp.action === "submit"),
    );
    setFeedbackFormJson({ display: "form", components: filteredComponents });
  }, [
    isOpen,
    feedbackFormJsonData,
    ticket?.custom_category,
    ticket?.custom_sub_category,
  ]);

  const handleFeedbackFormChange = (submission: {
    isValid: boolean;
    data: Record<string, unknown>;
  }) => {
    setFeedbackFormSubmission(submission.data);
    setIsFeedbackFormValid(submission.isValid);
    const fileComponents = getFileComponents(
      feedbackFormJson?.components || [],
    );
    const extractedFiles: File[] = [];

    fileComponents.forEach((comp) => {
      const value = submission.data[comp.key];
      if (Array.isArray(value)) {
        value.forEach((file) => {
          if (file?.file) {
            extractedFiles.push(file);
          }
        });
      }
    });
    setFeedbackFormAttachment(extractedFiles);
  };

  const handleExitFormChange = (submission: {
    isValid: boolean;
    data: Record<string, unknown>;
  }) => {
    setExitFormSubmission(submission.data);
    setIsExitFormValid(submission.isValid);

    const fileComponents = getFileComponents(exitFormJson?.components || []);
    const extractedFiles: File[] = [];

    fileComponents.forEach((comp) => {
      const value = submission.data[comp.key];
      if (Array.isArray(value)) {
        value.forEach((file) => {
          if (file?.file) {
            extractedFiles.push(file);
          }
        });
      }
    });
    setExitFormAttachment(extractedFiles);
  };
  /* ─── END: Formio Logic ─── */

  if (!isOpen || !ticket) return null;

  const isResolving = mode === "resolve";
  const isRequestClosure = mode === "requestClosure";

  const title = isResolving
    ? "Resolve Ticket"
    : isRequestClosure
      ? "Request Ticket Closure"
      : "Close Ticket";

  const handleSubmit = () => {
    if (isRequestClosure) {
      // Request closure doesn't need forms
      onSubmit();
      return;
    }

    const exitData = exitFormJson
      ? { schema: exitFormJson, answer: exitFormSubmission ?? {} }
      : exitFormSubmission ?? null;
    const feedbackData = feedbackFormJson
      ? { schema: feedbackFormJson, answer: feedbackFormSubmission ?? {} }
      : feedbackFormSubmission ?? null;

    onSubmit(
      exitData,
      feedbackData,
      exitFormAttachment,
      feedbackFormAttachment,
    );
  };

  // Disable submit if:
  // - Loading
  // - User hasn't confirmed "yes"
  // - Forms are invalid
  const disableSubmit =
    isLoading ||
    confirmAction === "no" ||
    (!isRequestClosure && (!isExitFormValid || !isFeedbackFormValid));

  // Whether the forms section should be shown (not for requestClosure and confirmed)
  const showForms = !isRequestClosure && confirmAction === "yes";
  const formsLoading = exitFormJsonLoading || feedbackFormJsonLoading;
  const hasForms = !!exitFormJson || !!feedbackFormJson;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="formio-hide-attachment relative w-full max-w-lg sm:mx-4 flex flex-col sm:max-h-[80vh] max-sm:h-full bg-white sm:rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 overflow-y-auto flex-1 py-4">
          {/* Confirmation radio */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-800 mb-4">
              {isResolving
                ? "Do you want to resolve this ticket?"
                : isRequestClosure
                  ? "Do you want to request closure for this ticket?"
                  : "Do you want to close this ticket?"}
            </p>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="confirmAction"
                  value="yes"
                  checked={confirmAction === "yes"}
                  onChange={() => setConfirmAction("yes")}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="confirmAction"
                  value="no"
                  checked={confirmAction === "no"}
                  onChange={() => setConfirmAction("no")}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">No</span>
              </label>
            </div>
          </div>

          {/* Forms (only when not requestClosure) */}
          {showForms && (
            <>
              {formsLoading && <FormioFormSkeleton />}

              {!feedbackFormJsonLoading && feedbackFormJson && (
                <div className="w-full show-req-astrik mt-4">
                  <Typography variant="subheading" className="mb-1">
                    Feedback Form Details
                  </Typography>
                  <div
                    id={`feedback-form-container-close-${ticket.name}`}
                    className="w-full border-gray-100 rounded-lg p-4 border-1"
                  >
                    <Form
                      form={feedbackFormJson}
                      ref={feedbackFormRef}
                      options={{
                        buttonSettings: {
                          showSubmit: false,
                        },
                      }}
                      onChange={handleFeedbackFormChange}
                    />
                    {renderFormioPreviews(
                      `feedback-form-container-close-${ticket.name}`,
                      feedbackFormJson,
                      feedbackFormSubmission,
                    )}
                  </div>
                </div>
              )}

              {!exitFormJsonLoading && exitFormJson && (
                <div className="w-full show-req-astrik mt-4">
                  <Typography variant="subheading" className="mb-1">
                    Issue Closure Form
                  </Typography>
                  <div
                    id={`exit-form-container-close-${ticket.name}`}
                    className="w-full border-gray-100 rounded-lg p-4 border-1"
                  >
                    <Form
                      form={exitFormJson}
                      ref={exitFormRef}
                      options={{
                        buttonSettings: {
                          showSubmit: false,
                        },
                      }}
                      onChange={handleExitFormChange}
                    />
                    {renderFormioPreviews(
                      `exit-form-container-close-${ticket.name}`,
                      exitFormJson,
                      exitFormSubmission,
                    )}
                  </div>
                </div>
              )}

              {/* Info text when no forms are configured */}
              {!formsLoading && !hasForms && (
                <p className="text-xs text-gray-500 mt-2">
                  {isResolving
                    ? "This will set the ticket status to Resolved."
                    : "This will close the ticket."}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={disableSubmit}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                {isResolving
                  ? "Resolve Ticket"
                  : isRequestClosure
                    ? "Request Closure"
                    : "Close Ticket"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketCloseModal;
