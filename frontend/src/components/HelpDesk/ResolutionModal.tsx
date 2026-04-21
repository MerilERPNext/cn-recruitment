import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Typography } from "../shared/atoms/Typography";
import Button from "../shared/atoms/Button";
import { HDTicket, useGetExitFormJson, useGetFeedbackFormJson } from "../../hooks/useHelpDeskTickets";
import { FormIOForm, getFileComponents } from "../../utils/flowUtils";
import { Form } from "@tsed/react-formio";
import { FormioFormSkeleton } from "./LoadingSkeletons";
import { getRequiredKeys } from "../../utils/formioUtils";
import { FormioPreviewItem, FormioPreviewPortal } from "../shared/molecules/FormioPreview";

interface ResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (resolution: string, exitFormSubmission?: any, feedbackFormSubmission?: any, exitAttachments?: File[], feedbackAttachments?: File[]) => void;
  ticket: HDTicket | null;
  isRequestClosure?: boolean;
  isLoading?: boolean;
}

const ResolutionModal: React.FC<ResolutionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  ticket,
  isRequestClosure = false,
  isLoading = false,
}) => {
  const [resolution, setResolution] = useState("");

  const { data: exitFormJsonData, isLoading: exitFormJsonLoading } = useGetExitFormJson({ category: ticket?.custom_category, sub_category: ticket?.custom_sub_category });
  const { data: feedbackFormJsonData, isLoading: feedbackFormJsonLoading } = useGetFeedbackFormJson({ category: ticket?.custom_category, sub_category: ticket?.custom_sub_category });
  const [feedbackFormAttachment, setFeedbackFormAttachment] = useState<File[]>([]);
  const [exitFormAttachment, setExitFormAttachment] = useState<File[]>([]);

  const exitFormRef = useRef(null)
  const feedbackFormRef = useRef(null)

  const [exitFormJson, setExitFormJson] = useState<FormIOForm | null>(null);
  const [feedbackFormJson, setFeedbackFormJson] = useState<FormIOForm | null>(null);

  const [isExitFormValid, setIsExitFormValid] = useState<boolean>(true);
  const [isFeedbackFormValid, setIsFeedbackFormValid] = useState<boolean>(true);

  const [exitFormSubmission, setExitFormSubmission] = useState<Record<string, unknown> | null>(null);
  const [feedbackFormSubmission, setFeedbackFormSubmission] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!ticket?.custom_category || !ticket?.custom_sub_category || !Array.isArray(exitFormJsonData?.form_json?.components)) return;
    const components = exitFormJsonData?.form_json?.components;
    const requiredKeys = getRequiredKeys(components);

    setIsExitFormValid(requiredKeys.length === 0);
    if (components.length < 1) return;
    const filteredComponents = components.filter((comp) => !(comp.type === "button" && comp.action === "submit"));

    setExitFormJson({ display: "form", components: filteredComponents });
  }, [exitFormJsonData, ticket?.custom_category, ticket?.custom_sub_category]);

  useEffect(() => {
    if (!ticket?.custom_category || !ticket?.custom_sub_category || !Array.isArray(feedbackFormJsonData?.form_json?.components)) return;
    const components = feedbackFormJsonData?.form_json?.components;
    const requiredKeys = getRequiredKeys(components);

    setIsFeedbackFormValid(requiredKeys.length === 0);
    if (components.length < 1) return;
    const filteredComponents = components.filter((comp) => !(comp.type === "button" && comp.action === "submit"));

    setFeedbackFormJson({ display: "form", components: filteredComponents });
  }, [feedbackFormJsonData, ticket?.custom_category, ticket?.custom_sub_category]);


  const handleFeedbackFormChange = (submission: { isValid: boolean, data: Record<string, unknown> }) => {
    setFeedbackFormSubmission(submission.data)
    setIsFeedbackFormValid(submission.isValid);
    const fileComponents = getFileComponents(feedbackFormJson?.components || []);
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

  const handleExitFormChange = (submission: { isValid: boolean, data: Record<string, unknown> }) => {
    setExitFormSubmission(submission.data)
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

  const removeFormioFile = (formId: string, compKey: string, index: number) => {
    try {
      const rootNode = document.getElementById(formId) || document;
      const container = rootNode.querySelector(`.formio-component-${compKey}`);
      if (container) {
        const removeButtons = container.querySelectorAll(
          'i[ref="fileStatusRemove"], i[ref="removeLink"], button[ref="removeLink"], i.fa-times'
        );
        if (removeButtons && removeButtons[index]) {
          (removeButtons[index] as HTMLElement).click();
        } else {
          console.error("Form.io native remove button not found");
        }
      }
    } catch (err) {
      console.error("Failed to remove file from formio", err);
    }
  };

  const renderFormioPreviews = (formId: string, formSchema: any, submissionData: any) => {
    if (!formSchema?.components) return null;
    const fileComps = getFileComponents(formSchema.components);
    if (fileComps.length === 0) return null;

    return (
      <>
        {fileComps.map((comp) => {
          const rawFiles = submissionData?.[comp.key as string];
          const files = Array.isArray(rawFiles) ? rawFiles : (rawFiles ? [rawFiles] : []);
          if (files.length === 0) return null;

          return (
            <FormioPreviewPortal key={comp.key} compKey={comp.key as string} formContainerId={formId}>
              <div className="space-y-2 mt-2 w-full">
                {files.map((fileObj, idx) => (
                  <FormioPreviewItem
                    key={`${comp.key}-${idx}`}
                    fileObj={fileObj}
                    onRemove={() => removeFormioFile(formId, comp.key as string, idx)}
                  />
                ))}
              </div>
            </FormioPreviewPortal>
          );
        })}
      </>
    );
  };

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (resolution.trim()) {
      if (isRequestClosure) {
        onSubmit(resolution);
      } else {
        const exitData = exitFormJson ? { schema: exitFormJson, answer: exitFormSubmission ?? {} } : (exitFormSubmission ?? null);
        const feedbackData = feedbackFormJson ? { schema: feedbackFormJson, answer: feedbackFormSubmission ?? {} } : (feedbackFormSubmission ?? null);
        onSubmit(resolution, exitData, feedbackData, exitFormAttachment, feedbackFormAttachment);
      }
    }
  };

  const title = isRequestClosure ? "Request Ticket Closure" : "Close Ticket";
  const description = isRequestClosure
    ? "Please provide a resolution note for the ticket owner to review."
    : "Please provide the resolution details before closing this ticket.";
  const buttonText = isRequestClosure ? "Request Closure" : "Close Ticket";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg sm:mx-4  flex flex-col sm:max-h-[80vh] max-sm:h-full bg-white sm:rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <Typography variant="h3" color="primary">
              {title}
            </Typography>
            <Typography variant="bodySmall" color="body2" className="mt-1">
              Ticket ID: {ticket?.name}
            </Typography>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 flex-1 overflow-y-auto py-4">
          <style>{`
            .formio-component-file .list-group {
              display: none !important;
            }
          `}</style>
          <Typography variant="bodySmall" color="body2" className="mb-3">
            {description}
          </Typography>

          <textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder="Enter resolution details..."
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none"
          />
          {
            feedbackFormJsonLoading &&
            <FormioFormSkeleton />
          }
          {!feedbackFormJsonLoading && feedbackFormJson && !isRequestClosure && <div className="w-full show-req-astrik mt-4 ">
            <Typography variant="subheading" className="mb-1">Feedback Form Details</Typography>
            <div id={`feedback-form-container-${ticket?.name}`} className="w-full border-gray-100 rounded-lg p-4 border-1">
              <Form
                form={feedbackFormJson}
                ref={feedbackFormRef}
                options={{
                  buttonSettings: {
                    showSubmit: false
                  }
                }}
                onChange={handleFeedbackFormChange}
              />
              {renderFormioPreviews(`feedback-form-container-${ticket?.name}`, feedbackFormJson, feedbackFormSubmission)}
            </div>
          </div>
          }
          {
            exitFormJsonLoading &&
            <FormioFormSkeleton />
          }
          {!exitFormJsonLoading && exitFormJson && !isRequestClosure && <div className="w-full show-req-astrik mt-4 ">
            <Typography variant="subheading" className="mb-1">Issue Closure Form</Typography>
            <div id={`exit-form-container-${ticket?.name}`} className="w-full border-gray-100 rounded-lg p-4 border-1">
              <Form
                form={exitFormJson}
                ref={exitFormRef}
                options={{
                  buttonSettings: {
                    showSubmit: false
                  }
                }}
                onChange={handleExitFormChange}
              />
              {renderFormioPreviews(`exit-form-container-${ticket?.name}`, exitFormJson, exitFormSubmission)}
            </div>
          </div>
          }
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <Button
            variant="outline"
            bgColor="primary"
            size="md"
            onClick={onClose}
            className="max-sm:w-full"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contain"
            bgColor="primary"
            size="md"
            className="max-sm:w-full"
            onClick={handleSubmit}
            disabled={!resolution.trim() || isLoading || (!isRequestClosure && (!isExitFormValid || !isFeedbackFormValid))}
          >
            {isLoading ? "Processing..." : buttonText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResolutionModal;
