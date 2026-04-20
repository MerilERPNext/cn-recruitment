import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Typography } from "../shared/atoms/Typography";
import Button from "../shared/atoms/Button";
import { HDTicket, useGetExitFormJson, useGetFeedbackFormJson } from "../../hooks/useHelpDeskTickets";
import { FormIOForm, getFileComponents } from "../../utils/flowUtils";
import { Form } from "@tsed/react-formio";
import { FormioFormSkeleton } from "./LoadingSkeletons";
import { getRequiredKeys } from "../../utils/formioUtils";

interface ResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (resolution: string, closingFormData: string, feedbackFormData: string, attachments: File[]) => void;
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

  const [isExitFormValid, setIsExitFormValid] = useState<boolean>(false);
  const [isFeedbackFormValid, setIsFeedbackFormValid] = useState<boolean>(false);

  const [exitFormSubmission, setExitFormSubmission] = useState<Record<string, unknown> | null>(null);
  const [feedbackFormSubmission, setFeedbackFormSubmission] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!ticket?.custom_category || !ticket?.custom_sub_category || !Array.isArray(exitFormJsonData?.form_json?.components)) return;
    const components = exitFormJsonData?.form_json?.components;
    const requiredKeys = getRequiredKeys(components);

    if (requiredKeys.length > 0) {
      setIsExitFormValid(false);
    }
    if (components.length < 1) return;
    const filteredComponents = components.filter((comp) => !(comp.type === "button" && comp.action === "submit"));

    setExitFormJson({ display: "form", components: filteredComponents });
  }, [exitFormJsonData, ticket?.custom_category, ticket?.custom_sub_category]);

  useEffect(() => {
    if (!ticket?.custom_category || !ticket?.custom_sub_category || !Array.isArray(feedbackFormJsonData?.form_json?.components)) return;
    const components = feedbackFormJsonData?.form_json?.components;
    const requiredKeys = getRequiredKeys(components);

    if (requiredKeys.length > 0) {
      setIsFeedbackFormValid(false);
    }
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
          if (!file?.file) {
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

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (resolution.trim()) {
      const exitData = exitFormJson ? { schema: exitFormJson, answer: exitFormSubmission ?? {} } : (exitFormSubmission ?? "");
      const feedbackData = feedbackFormJson ? { schema: feedbackFormJson, answer: feedbackFormSubmission ?? {} } : (feedbackFormSubmission ?? "");
      onSubmit(resolution, JSON.stringify(exitData), JSON.stringify(feedbackData), [...exitFormAttachment, ...feedbackFormAttachment]);
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
          {!feedbackFormJsonLoading && feedbackFormJson && <div className="w-full show-req-astrik mt-4 ">
            <Typography variant="subheading" className="mb-1">Feedback Form Details</Typography>
            <div className="w-full border-gray-100 rounded-lg p-4 border-1">
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
            </div>
          </div>
          }
          {
            exitFormJsonLoading &&
            <FormioFormSkeleton />
          }
          {!exitFormJsonLoading && exitFormJson && <div className="w-full show-req-astrik mt-4 ">
            <Typography variant="subheading" className="mb-1">Issue Closure Form</Typography>
            <div className="w-full border-gray-100 rounded-lg p-4 border-1">
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
            disabled={!resolution.trim() || isLoading || !isExitFormValid || !isFeedbackFormValid}
          >
            {isLoading ? "Processing..." : buttonText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResolutionModal;
