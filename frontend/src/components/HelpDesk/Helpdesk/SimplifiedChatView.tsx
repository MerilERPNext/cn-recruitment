/* eslint-disable @typescript-eslint/no-explicit-any */
import { Typography } from "../../shared/atoms/Typography";
import React, { useState, useMemo, useRef, useEffect } from "react";
import { X, Loader2, MessageSquare, CheckCircle, Reply, XCircle, Clock, ChevronDown, ChevronUp, FileText, Trash2, RotateCcw } from "lucide-react";
import {
  TicketDetail,
  useSendEmailReply,
  useCloseTicket,
  useCloseResolvedTicket,
  useRejectResolution,
  useResolutionHistory,
  useUserLookup,
  useEmployeeByUserEmail,
  useGetFeedbackFormJson,
  useGetExitFormJson,
  useRevokeTicket,
  useReopenTicket,
} from "../../../hooks/useHelpDeskTickets";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import SimplifiedChatInput from "../SimplifiedChatInput";
import toast from "react-hot-toast";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { showCloseTicketButton } from "../hdelpdeskUtils";
import { FormIOForm, getFileComponents } from "../../../utils/flowUtils";
import { getRequiredKeys } from "../../../utils/formioUtils";
import { Form } from "@tsed/react-formio";
import { FormioFormSkeleton } from "../LoadingSkeletons";
import { FormioPreviewItem, FormioPreviewPortal } from "../../shared/molecules/FormioPreview";
import { useFileUploader } from "../../../hooks/useFileUploader";
import Modal from "../../shared/Modal";
import FormPreview from "../../shared/molecules/FormPreview";
import { useLoadingOverlay } from "../../../context/OverlayContext";
import { FilePreviewModal } from "../../shared/molecules/FilePreviewModal";
import { FileTypeIcon, getFileTypeInfo } from "../../../utils/fileUtils";
import DropdownMenu from "../../shared/DropDownMenu";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../utils/uiPermission";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";

interface SimplifiedChatViewProps {
  ticket: TicketDetail;
  currentUserEmail: string;
  isDrawer?: boolean;
}

interface SimpleChatMessage {
  id: string;
  content: string;
  quotedContent?: string | null;
  quotedSender?: string | null;
  sender: {
    name: string;
    email: string;
    avatar?: string;
  };
  timestamp: Date;
  isCurrentUser: boolean;
  attachments: { file_name: string; file_url: string }[];
}

// Parse quoted content from HTML (blockquotes, gmail_quote, etc.)
interface ParsedMessage {
  quotedContent: string | null;
  quotedSender: string | null;
  mainContent: string;
  extractedAttachments?: { file_url: string; file_name: string }[];
}

const parseQuotedContent = (htmlContent: string): ParsedMessage => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    let extractedAttachments: { file_url: string; file_name: string }[] = [];

    // Extract injected attachments div before looking for blockquotes
    let attachmentsDiv = doc.querySelector('.attachments');
    let legacyAttachmentsUl: Element | null = null;
    let legacyAttachmentsTitle: Element | null = null;

    // Fallback for older tickets lacking the .attachments class
    if (!attachmentsDiv) {
      const divs = Array.from(doc.querySelectorAll('div'));
      legacyAttachmentsTitle = divs.find(d => d.innerHTML.includes('<strong>Attachments:</strong>')) || null;
      if (legacyAttachmentsTitle && legacyAttachmentsTitle.nextElementSibling?.tagName.toLowerCase() === 'ul') {
        legacyAttachmentsUl = legacyAttachmentsTitle.nextElementSibling;
      }
    }

    if (attachmentsDiv || legacyAttachmentsUl) {
      const targetContainer = attachmentsDiv || legacyAttachmentsUl;
      const links = targetContainer?.querySelectorAll('a');
      links?.forEach((link) => {
        const file_url = link.getAttribute('href');
        const file_name = link.textContent?.trim();
        if (file_url && file_name) {
          extractedAttachments.push({ file_url, file_name });
        }
      });

      if (attachmentsDiv) {
        const prev = attachmentsDiv.previousElementSibling;
        if (prev && prev.tagName.toLowerCase() === 'br') prev.remove();
        attachmentsDiv.remove();
      } else if (legacyAttachmentsTitle && legacyAttachmentsUl) {
        const prev = legacyAttachmentsTitle.previousElementSibling;
        if (prev && prev.tagName.toLowerCase() === 'br') prev.remove();
        legacyAttachmentsUl.remove();
        legacyAttachmentsTitle.remove();
      }
    }

    // Find blockquote or gmail_quote or outlook reply markers
    const blockquote = doc.querySelector('blockquote, .gmail_quote, #appendonsend, .reply-to-content');
    let quotedSender: string | null = null;

    if (blockquote) {

      // Try to parse sender from "On [date], [name] wrote:" pattern
      const prevSibling = blockquote.previousElementSibling;
      if (prevSibling && prevSibling.textContent) {
        const match = prevSibling.textContent.match(/On .+?, (.+?) wrote:/);
        if (match) {
          quotedSender = match[1];
        }
      }

      // Remove the blockquote from the document
      blockquote.remove();

      // Also remove the "On [date], [name] wrote:" line if present
      if (prevSibling && prevSibling.textContent?.includes(' wrote:')) {
        prevSibling.remove();
      }
    }

    const mainContent = doc.body.innerHTML.trim();

    return {
      quotedContent: blockquote ? blockquote.innerHTML.trim() || null : null,
      quotedSender,
      mainContent: mainContent || htmlContent,
      extractedAttachments
    };
  } catch {
    return { quotedContent: null, quotedSender: null, mainContent: htmlContent };
  }
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

const renderFormioPreviews = (formId: string, formSchema: any, submissionData: any, readOnly: boolean = false) => {
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
                  readOnly={readOnly}
                />
              ))}
            </div>
          </FormioPreviewPortal>
        );
      })}
    </>
  );
};

// Resolution Modal Component
interface ResolutionModalProps {
  ticket: TicketDetail,
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (resolution: string, exitFormSubmission?: any, feedbackFormSubmission?: any, exitAttachments?: File[], feedbackAttachments?: File[]) => void;
  isLoading: boolean;
  isRaiser: boolean;
  isClosingTicket: boolean;
  isResolving?: boolean;
}

export const ResolutionModal: React.FC<ResolutionModalProps> = ({
  ticket,
  isOpen,
  onClose,
  onSubmit,
  isClosingTicket,
  isLoading,
  isResolving,
}) => {
  const [resolution, setResolution] = useState("");
  const [confirmClose, setConfirmClose] = useState<"yes" | "no">("no");

  /* Formio Exit and Feedback Form Logic */
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
  /* END:  Formio Exit and Feedback Form Logic */

  useEffect(() => {
    if (isOpen) {
      setResolution("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const payloadResolution = "resolved";

    if (isClosingTicket) {
      const exitData = exitFormJson ? { schema: exitFormJson, answer: exitFormSubmission ?? {} } : (exitFormSubmission ?? null);
      const feedbackData = feedbackFormJson ? { schema: feedbackFormJson, answer: feedbackFormSubmission ?? {} } : (feedbackFormSubmission ?? null);
      onSubmit(payloadResolution, exitData, feedbackData, exitFormAttachment, feedbackFormAttachment);
    }
    else {
      onSubmit(payloadResolution);
    }
  };

  const disableSubmit = isLoading ||
    (isClosingTicket ? confirmClose === "no" : !resolution.trim()) ||
    (isClosingTicket && (!isExitFormValid || !isFeedbackFormValid));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="formio-hide-attachment  relative w-full max-w-lg sm:mx-4  flex flex-col sm:max-h-[80vh] max-sm:h-full bg-white sm:rounded-xl shadow-xl">
        {/** Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {isResolving ? "Resolve Ticket" : "Close Ticket"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/** Body */}
        <div className="px-6 overflow-y-auto flex-1 py-4">
          {isClosingTicket ? (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-800 mb-4">
                Do you want to close the ticket?
              </p>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="confirmClose"
                    value="yes"
                    checked={confirmClose === "yes"}
                    onChange={() => setConfirmClose("yes")}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="confirmClose"
                    value="no"
                    checked={confirmClose === "no"}
                    onChange={() => setConfirmClose("no")}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">No</span>
                </label>
              </div>
            </div>
          ) : (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolution Details <span className="text-red-500">*</span>
              </label>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Describe how this issue was resolved..."
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                {isResolving
                  ? "This will save the resolution and set the ticket status to Resolved."
                  : "This will close the ticket and save the resolution details."}
              </p>
            </>
          )}

          {
            feedbackFormJsonLoading &&
            <FormioFormSkeleton />
          }
          {!feedbackFormJsonLoading && feedbackFormJson && <div className="w-full show-req-astrik mt-4 ">
            <Typography variant="subheading" className="mb-1">Feedback Form Details</Typography>
            <div id={`feedback-form-container-chat-${ticket.name}`} className="w-full border-gray-100 rounded-lg p-4 border-1">
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
              {renderFormioPreviews(`feedback-form-container-chat-${ticket.name}`, feedbackFormJson, feedbackFormSubmission)}
            </div>
          </div>
          }
          {
            exitFormJsonLoading &&
            <FormioFormSkeleton />
          }
          {!exitFormJsonLoading && exitFormJson && <div className="w-full show-req-astrik mt-4 ">
            <Typography variant="subheading" className="mb-1">Issue Closure Form</Typography>
            <div id={`exit-form-container-chat-${ticket.name}`} className="w-full border-gray-100 rounded-lg p-4 border-1">
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
              {renderFormioPreviews(`exit-form-container-chat-${ticket.name}`, exitFormJson, exitFormSubmission)}
            </div>
          </div>
          }
        </div>

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
            ) : isResolving ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Resolve Ticket
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Close Ticket
              </>
            )}
          </button>
        </div>
      </div>
      {/** Footer */}
    </div>
  );
};

// Reject Resolution Modal Component
interface RejectResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  isLoading: boolean;
}

const RejectResolutionModal: React.FC<RejectResolutionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error("Please enter a rejection reason");
      return;
    }
    onSubmit(reason);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Reject Resolution</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rejection Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why the resolution is not acceptable..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
          />
          <p className="text-xs text-gray-500 mt-2">
            This will reject the resolution and set the ticket status back to Replied.
          </p>
        </div>

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
            disabled={isLoading || !reason.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Rejecting...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Reject Resolution
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const formatTime = (date: Date) => {
  return date
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();
};

interface AvatarProps {
  sender: SimpleChatMessage["sender"];
  isCurrentUser: boolean;
}

const Avatar: React.FC<AvatarProps> = ({ sender, isCurrentUser }) => (
  <div className="flex-shrink-0">
    {sender.avatar ? (
      <img
        src={sender.avatar}
        alt={sender.name}
        className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm"
      />
    ) : (
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shadow-sm ${isCurrentUser ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"
          }`}
      >
        {getInitials(sender.name)}
      </div>
    )}
  </div>
);

interface AttachmentListProps {
  attachments: SimpleChatMessage["attachments"];
  isCurrentUser: boolean;
  onPreviewFile: (file: { url: string; name: string }) => void;
}

const AttachmentList: React.FC<AttachmentListProps> = ({
  attachments,
  isCurrentUser,
  onPreviewFile,
}) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className={`mt-3 pt-3 border-t flex flex-wrap gap-2 ${isCurrentUser ? "border-white/20" : "border-gray-100"}`}>
      {attachments.map((attachment, index) => {
        const { category, iconColor, bgColor } = getFileTypeInfo(attachment.file_name);
        return (
          <button
            key={index}
            onClick={() =>
              onPreviewFile({ url: attachment.file_url, name: attachment.file_name })
            }
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all border max-w-full shadow-sm ${
              isCurrentUser
                ? "bg-white/15 border-white/20 text-white hover:bg-white/25"
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${bgColor}`}>
              <FileTypeIcon
                category={category}
                className={`w-3.5 h-3.5 ${iconColor}`}
              />
            </div>
            <span className={`truncate max-w-[150px] font-medium ${isCurrentUser ? "text-white" : "text-gray-700"}`}>
              {attachment.file_name}
            </span>
          </button>
        );
      })}
    </div>
  );
};

interface QuotedMessageProps {
  content: string;
  sender?: string | null;
  isCurrentUser: boolean;
  onContentClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const QuotedMessage: React.FC<QuotedMessageProps> = ({
  content,
  sender,
  isCurrentUser,
  onContentClick,
}) => (
  <div
    onClick={onContentClick}
    className={`mb-2 p-3 rounded-lg border-l-4 cursor-pointer ${isCurrentUser
      ? "bg-blue-400/20 border-blue-300 text-blue-100"
      : "bg-gray-100 border-gray-300 text-gray-600"
      }`}
  >
    <div
      className={`text-xs mb-1 font-medium ${isCurrentUser ? "text-blue-200" : "text-gray-500"}`}
    >
      {sender ? `${sender} wrote:` : "Previous message:"}
    </div>
    <div
      className={`text-sm line-clamp-3 prose prose-sm max-w-none ${isCurrentUser ? "prose-invert" : ""
        } [&>p]:mb-0 [&_img]:!max-w-full [&_img]:h-auto [&_img]:rounded-lg`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  </div>
);

interface ChatBubbleProps {
  message: SimpleChatMessage;
  isTicketClosed: boolean;
  onReplyingTo: (message: SimpleChatMessage) => void;
  onPreviewFile: (file: { url: string; name: string }) => void;
  onContentClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  formatTime: (date: Date) => string;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isTicketClosed,
  onReplyingTo,
  onPreviewFile,
  onContentClick,
  formatTime,
}) => {
  const { content, quotedContent, quotedSender, sender, timestamp, isCurrentUser, attachments } =
    message;

  if (isCurrentUser) {
    return (
      <div className="group flex justify-end items-end gap-2.5 mb-5 simplified-chat-view-quoted-message-a">
        {!isTicketClosed && (
          <button
            onClick={() => onReplyingTo(message)}
            className="opacity-0 group-hover:opacity-100 self-center p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all mb-5"
            title="Reply"
          >
            <Reply className="w-4 h-4" />
          </button>
        )}
        <div className="flex flex-col items-end max-w-[75%]">
          <div className="bg-blue-500 text-white rounded-2xl rounded-br-sm px-4 py-3 max-w-full overflow-hidden shadow-sm shadow-blue-200">
            {quotedContent && (
              <QuotedMessage
                content={quotedContent}
                sender={quotedSender}
                isCurrentUser={true}
                onContentClick={onContentClick}
              />
            )}
            <div
              onClick={onContentClick}
              className="text-sm prose prose-sm prose-invert max-w-none [&>p]:mb-0 [&>p:last-child]:mb-0 cursor-pointer [&_img]:!max-w-full [&_img]:h-auto [&_img]:rounded-lg leading-relaxed"
              dangerouslySetInnerHTML={{ __html: content }}
            />
            <AttachmentList
              attachments={attachments}
              isCurrentUser={true}
              onPreviewFile={onPreviewFile}
            />
          </div>
          <span className="text-[11px] text-gray-400 mt-1.5 mr-1">{formatTime(timestamp)}</span>
        </div>
        <Avatar sender={sender} isCurrentUser={true} />
      </div>
    );
  }

  return (
    <div className="group flex justify-start items-end gap-2.5 mb-5">
      <Avatar sender={sender} isCurrentUser={false} />
      <div className="flex flex-col items-start max-w-[75%]">
        <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 max-w-full overflow-hidden shadow-sm border border-gray-100">
          <div className="text-[11px] text-gray-400 mb-1.5 font-medium tracking-wide">{sender.name}</div>
          {quotedContent && (
            <QuotedMessage
              content={quotedContent}
              sender={quotedSender}
              isCurrentUser={false}
              onContentClick={onContentClick}
            />
          )}
          <div
            onClick={onContentClick}
            className="text-sm text-gray-800 prose prose-sm max-w-none [&>p]:mb-0 [&>p:last-child]:mb-0 cursor-pointer [&_img]:!max-w-full [&_img]:h-auto [&_img]:rounded-lg leading-relaxed"
            dangerouslySetInnerHTML={{ __html: content }}
          />
          <AttachmentList
            attachments={attachments}
            isCurrentUser={false}
            onPreviewFile={onPreviewFile}
          />
        </div>
        <span className="text-[11px] text-gray-400 mt-1.5 ml-1">{formatTime(timestamp)}</span>
      </div>
      {!isTicketClosed && (
        <button
          onClick={() => onReplyingTo(message)}
          className="opacity-0 group-hover:opacity-100 self-center p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all mb-5"
          title="Reply"
        >
          <Reply className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

const SimplifiedChatView: React.FC<SimplifiedChatViewProps> = ({
  ticket,
  currentUserEmail,
  isDrawer = false,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "resolution">("chat");
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isResolvingTicket, setIsResolvingTicket] = useState(false);
  const [replyingTo, setReplyingTo] = useState<SimpleChatMessage | null>(null);
  const { isDesktop } = useScreenSize();
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
  // Mutations
  const sendEmailMutation = useSendEmailReply();
  const closeTicketMutation = useCloseTicket();
  const closeResolvedMutation = useCloseResolvedTicket();
  const rejectResolutionMutation = useRejectResolution();
  const revokeTicketMutation = useRevokeTicket();
  const reopenTicketMutation = useReopenTicket();

  // UI Permissions
  const { data: userUiPermission } = useGetUiPermission("Help Desk");
  const permRevoke = isActionEnabled(userUiPermission, "revoke", "Help Desk");
  const permReopen = isActionEnabled(userUiPermission, "reopen", "Help Desk");

  // User lookup for displaying names instead of emails
  const { data: userLookup } = useUserLookup();

  // Resolution history
  const { data: resolutionHistory } = useResolutionHistory(ticket.name);
  const [expandedHistoryEntries, setExpandedHistoryEntries] = useState<Record<string, boolean>>({});

  // Check ticket status - only "Closed" is truly closed; "Resolved" requires user action
  const isTicketClosed = ticket.status === "Closed";

  // Scroll to bottom when messages change
  // Transform ticket data into simple chat messages (emails only, no comments/activity)
  const messages = useMemo<SimpleChatMessage[]>(() => {
    const msgs: SimpleChatMessage[] = [];
    const ticketCreationTime = new Date(ticket.creation).getTime();

    // Parse the original description to extract embedded attachments
    const parsedDescription = parseQuotedContent(ticket.description || `<p>${ticket.subject}</p>`);

    // Add original request as first message
    msgs.push({
      id: `${ticket.name}-original`,
      content: parsedDescription.mainContent,
      sender: {
        name: ticket.contact?.name || ticket.raised_by,
        email: ticket.raised_by,
        avatar: ticket.contact?.image,
      },
      timestamp: new Date(ticket.creation),
      isCurrentUser: ticket.raised_by === currentUserEmail,
      attachments: parsedDescription.extractedAttachments || [],
    });

    // Add communications (emails) - skip the first one if it matches ticket creation time
    // (to avoid duplicate description message)
    ticket.communications?.forEach((comm) => {
      const commCreationTime = new Date(comm.creation).getTime();
      // Skip if this communication was created at the same time as the ticket (within 5 seconds)
      // This is likely the initial description being saved as a communication
      if (Math.abs(commCreationTime - ticketCreationTime) < 5000) {
        return;
      }

      // Parse quoted content from the message
      const parsed = parseQuotedContent(comm.content || '');

      // Combine real attachments with extracted attachments from HTML
      const combinedAttachments = [
        ...(comm.attachments || []),
        ...(parsed.extractedAttachments || [])
      ];

      msgs.push({
        id: comm.name,
        content: parsed.mainContent,
        quotedContent: parsed.quotedContent,
        quotedSender: parsed.quotedSender,
        sender: {
          name: comm.user?.full_name || comm.user?.name || comm.sender,
          email: comm.sender,
          avatar: comm.user?.user_image,
        },
        timestamp: new Date(comm.creation),
        isCurrentUser: comm.sender === currentUserEmail,
        attachments: combinedAttachments,
      });
    });

    // Sort by timestamp
    return msgs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [ticket, currentUserEmail]);

  // Scroll to bottom when messages change
  const isInitialScroll = useRef(true);
  useEffect(() => {
    if (activeTab === "chat" && messagesEndRef.current) {
      // Use a small timeout to ensure the layout has updated and animations are settled
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: isInitialScroll.current ? "auto" : "smooth",
          block: "end",
        });
        isInitialScroll.current = false;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages.length, activeTab]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { [key: string]: SimpleChatMessage[] } = {};

    messages.forEach((msg) => {
      const dateKey = formatDateKey(msg.timestamp);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });

    return groups;
  }, [messages]);

  // Format date for grouping
  function formatDateKey(date: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    }
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }



  // Get assigned user email
  const getAssignedUserEmail = (): string | null => {
    if (!ticket._assign) return null;
    try {
      const assigned = JSON.parse(ticket._assign);
      if (Array.isArray(assigned) && assigned.length > 0) {
        return assigned[0];
      }
    } catch {
      return ticket._assign;
    }
    return null;
  };

  // Get assigned user name (display name instead of email)
  const getAssignedUser = (): string => {
    const email = getAssignedUserEmail();
    if (!email) return "Unassigned";
    // Use full name from lookup if available, otherwise extract from email
    return userLookup?.get(email) || email.split("@")[0].replace(/[._]/g, " ");
  };

  // Get employee data for hover card
  const assignedEmail = getAssignedUserEmail();
  const { data: employeeData } = useEmployeeByUserEmail(assignedEmail);

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-blue-100 text-blue-700";
      case "Replied":
        return "bg-purple-100 text-purple-700";
      case "Resolved":
        return "bg-green-100 text-green-700";
      case "Closed":
        return "bg-app text-gray-700";
      case "Reopened":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-app text-gray-700";
    }
  };

  // Helper to truncate HTML content for quoted messages
  const truncateHtml = (html: string, maxLength: number): string => {
    const div = document.createElement('div');
    div.innerHTML = html;
    const text = div.textContent || div.innerText || '';
    if (text.length <= maxLength) return html;
    return `<span>${text.substring(0, maxLength)}...</span>`;
  };

  // Build message with attachments embedded as HTML
  const buildMessageWithAttachments = (
    msg: string,
    files: { file_url: string; file_name: string }[]
  ): string => {
    let htmlMessage = msg.startsWith("<") ? msg : `<p>${msg.replace(/\n/g, "<br/>")}</p>`;

    if (files.length > 0) {
      let attachmentHtml = '<br/><div class="attachments"><strong>Attachments:</strong><ul>';
      files.forEach((file) => {
        const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.file_name);
        if (isImage) {
          attachmentHtml += `<li><a href="${file.file_url}" target="_blank"><img src="${file.file_url}" alt="${file.file_name}" style="max-width: 100%; max-height: 200px; object-fit: contain; border-radius: 8px;" /><br/>${file.file_name}</a></li>`;
        } else {
          attachmentHtml += `<li><a href="${file.file_url}" target="_blank">${file.file_name}</a></li>`;
        }
      });
      attachmentHtml += '</ul></div>';
      htmlMessage += attachmentHtml;
    }

    return htmlMessage;
  };

  // Handle send message (always as email for simplified view)
  const handleSendMessage = async (
    message: string,
    attachments: { file_url: string; file_name: string }[]
  ) => {
    try {
      // Get the assigned agent email to send to
      const assignedEmail = getAssignedUserEmail();
      const recipient = assignedEmail || ticket.raised_by;

      // Build final message with quoted content if replying
      let finalMessage = message;
      if (replyingTo) {
        const quotedContent = `
          <div class="reply-to-content" style="border-left: 3px solid #3b82f6; padding-left: 12px; margin-bottom: 12px; color: #6b7280;">
            <div style="font-size: 12px; font-weight: 500;">${replyingTo.sender.name} wrote:</div>
            <div style="font-size: 14px;">${truncateHtml(replyingTo.content, 200)}</div>
          </div>
        `;
        finalMessage = quotedContent + message;
      }

      // Embed attachments in message HTML instead of passing separately
      const messageWithAttachments = buildMessageWithAttachments(finalMessage, attachments);

      await sendEmailMutation.mutateAsync({
        ticketId: ticket.name,
        to: recipient,
        message: messageWithAttachments,
      });
      toast.success("Message sent successfully");
      setReplyingTo(null);
    } catch {
      toast.error("Failed to send message");
      throw new Error("Failed to send");
    }
  };

  // Handle close ticket button click
  const handleCloseButtonClick = async () => {
    // If resolution already exists, close directly without popup
    if (ticket.resolution_details) {
      try {
        await closeTicketMutation.mutateAsync({
          ticketId: ticket.name,
          resolutionDetails: ticket.resolution_details,
        });
        toast.success("Ticket closed successfully");
      } catch {
        toast.error("Failed to close ticket");
      }
    } else {
      // No resolution exists, show popup to enter resolution
      setIsResolutionModalOpen(true);
    }
  };

  // Handle resolve ticket button click
  const handleResolveButtonClick = () => {
    setIsResolvingTicket(true);
    setIsResolutionModalOpen(true);
  };
  const loadingContext = useLoadingOverlay();
  const { uploadFiles } = useFileUploader();
  // Handle close ticket with resolution from modal
  const handleCloseTicket = async (resolution: string, exitFormSubmission?: any, feedbackFormSubmission?: any, exitAttachments?: File[], feedbackAttachments?: File[]) => {
    try {
      const finalExitFormSubmission = exitFormSubmission;
      const finalFeedbackFormSubmission = feedbackFormSubmission;

      loadingContext.show("Closing ticket...");

      // 1. First upload Exit Form files if they exist
      if (exitAttachments && exitAttachments.length > 0) {
        loadingContext.show("Uploading exit form files...");
        const uploadResults = await uploadFiles(exitAttachments, "HD Ticket", ticket.name);

        // Map results back to exitFormSubmission
        if (exitFormSubmission?.answer) {
          let uploadIdx = 0;
          const fileComponents = getFileComponents(exitFormSubmission.schema?.components || []);
          fileComponents.forEach(comp => {
            const val = exitFormSubmission.answer[comp.key];
            if (Array.isArray(val)) {
              exitFormSubmission.answer[comp.key] = val.map(fileObj => {
                if (fileObj.file && uploadIdx < uploadResults.length) {
                  const uploadRes = uploadResults[uploadIdx++];
                  return {
                    storage: "url",
                    name: uploadRes.file_name,
                    url: uploadRes.file_url,
                    size: uploadRes.file_size,
                    type: uploadRes.file_type,
                    data: { role: "remote" }
                  };
                }
                return fileObj;
              });
            }
          });
        }
      }

      // 2. Upload Feedback Form files if they exist
      if (feedbackAttachments && feedbackAttachments.length > 0) {
        loadingContext.show("Uploading feedback form files...");
        const uploadResults = await uploadFiles(feedbackAttachments, "HD Ticket", ticket.name);

        // Map results back to feedbackFormSubmission
        if (feedbackFormSubmission?.answer) {
          let uploadIdx = 0;
          const fileComponents = getFileComponents(feedbackFormSubmission.schema?.components || []);
          fileComponents.forEach(comp => {
            const val = feedbackFormSubmission.answer[comp.key];
            if (Array.isArray(val)) {
              feedbackFormSubmission.answer[comp.key] = val.map(fileObj => {
                if (fileObj.file && uploadIdx < uploadResults.length) {
                  const uploadRes = uploadResults[uploadIdx++];
                  return {
                    storage: "url",
                    name: uploadRes.file_name,
                    url: uploadRes.file_url,
                    size: uploadRes.file_size,
                    type: uploadRes.file_type,
                    data: { role: "remote" }
                  };
                }
                return fileObj;
              });
            }
          });
        }
      }

      // 3. Close the ticket with updated form data
      await closeTicketMutation.mutateAsync({
        ticketId: ticket.name,
        resolutionDetails: resolution,
        closingFormData: finalExitFormSubmission ? JSON.stringify(finalExitFormSubmission) : undefined,
        feedbackFormData: finalFeedbackFormSubmission ? JSON.stringify(finalFeedbackFormSubmission) : undefined
      });

      toast.success("Ticket closed successfully");
      setIsResolutionModalOpen(false);
    } catch (error) {
      console.error("Failed to close ticket:", error);
      toast.error("Failed to close ticket");
    } finally {
      loadingContext.hide();
    }
  };

  // Handle save resolution (sets status to Resolved, not Closed)
  const handleSaveResolution = async (resolution: string) => {
    try {
      await closeTicketMutation.mutateAsync({
        ticketId: ticket.name,
        resolutionDetails: resolution,
        status: "Resolved", // Set to Resolved, not Closed
      });
      toast.success("Resolution saved successfully");
      setIsResolutionModalOpen(false);
      setIsResolvingTicket(false);
    } catch {
      toast.error("Failed to save resolution");
    }
  };

  // Handle reject resolution
  const handleRejectResolution = async (rejectionReason: string) => {
    try {
      await rejectResolutionMutation.mutateAsync({
        ticketId: ticket.name,
        rejectionReason,
      });
      toast.success("Resolution rejected");
      setIsRejectModalOpen(false);
    } catch {
      toast.error("Failed to reject resolution");
    }
  };

  // Handle accept closure (for Resolved tickets)
  const handleAcceptClosure = async () => {
    try {
      await closeResolvedMutation.mutateAsync({ ticketId: ticket.name });
      toast.success("Ticket closed successfully");
    } catch {
      toast.error("Failed to close ticket");
    }
  };

  const handleRevoke = async () => {
    try {
      loadingContext.show("Revoking ticket...");
      await revokeTicketMutation.mutateAsync({ ticketId: ticket.name });
      toast.success("Ticket revoked successfully");
    } catch (error) {
      toast.error(errorResponseFormater(error, "Failed to revoke ticket"));
    } finally {
      loadingContext.hide();
    }
  };

  const handleReopen = async () => {
    try {
      loadingContext.show("Reopening ticket...");
      await reopenTicketMutation.mutateAsync({ ticketId: ticket.name });
      toast.success("Ticket reopened successfully");
    } catch (error) {
      toast.error(errorResponseFormater(error, "Failed to reopen ticket"));
    } finally {
      loadingContext.hide();
    }
  };

  const isSending = sendEmailMutation.isPending;
  const isClosing = closeTicketMutation.isPending || closeResolvedMutation.isPending;

  const parseForm = (form: string | null | undefined) => {
    if (typeof form === "string") {
      try {
        return JSON.parse(form);
      } catch (error) {
        console.error("Error parsing form data", error);
        return {};
      }
    }
    return form;
  };

  const creationForm = useMemo(() => parseForm(ticket.creation_form_data), [ticket.creation_form_data]);
  const feedbackForm = useMemo(() => parseForm(ticket.feedback_form_data), [ticket.feedback_form_data]);
  const closeForm = useMemo(() => parseForm(ticket.closing_form_data), [ticket.closing_form_data]);

  const [showForms, setShowForms] = useState<boolean>(false);

  const actionItems: { label: string; icon: React.ReactNode; onClick: () => void }[] = [];

  // Revoke action
  if (permRevoke && ticket.status === "Open" && !ticket?.custom_archived) {
    actionItems.push({
      label: "Revoke",
      icon: <Trash2 className="w-4 h-4 text-red-600" />,
      onClick: handleRevoke,
    });
  }

  // Reopen action
  if (permReopen && ticket.status === "Closed") {
    actionItems.push({
      label: "Reopen",
      icon: <RotateCcw className="w-4 h-4 text-amber-600" />,
      onClick: handleReopen,
    });
  }

  // Resolved ticket actions for raiser
  if (ticket.status === "Resolved" && ticket.raised_by === currentUserEmail) {
    actionItems.push({
      label: isClosing ? "Closing..." : "Accept Closure",
      icon: <CheckCircle className="w-4 h-4 text-green-600" />,
      onClick: handleAcceptClosure,
    });
    actionItems.push({
      label: "Reject",
      icon: <XCircle className="w-4 h-4 text-red-600" />,
      onClick: () => setIsRejectModalOpen(true),
    });
  }

  // Open/Replied ticket actions
  if (ticket.status !== "Closed" && ticket.status !== "Resolved") {
    if (!isDrawer) {
      actionItems.push({
        label: "Resolve",
        icon: <CheckCircle className="w-4 h-4 text-amber-600" />,
        onClick: handleResolveButtonClick,
      });
    }
    if (showCloseTicketButton(ticket.status)) {
      actionItems.push({
        label: isClosing ? "Closing..." : "Close Ticket",
        icon: <CheckCircle className="w-4 h-4 text-green-600" />,
        onClick: handleCloseButtonClick,
      });
    }
  }

  // Show Forms action
  if (!!creationForm?.schema || !!closeForm?.schema || !!feedbackForm?.schema) {
    actionItems.push({
      label: "Show Forms",
      icon: <FileText className="w-4 h-4 text-blue-600" />,
      onClick: () => setShowForms(true),
    });
  }



  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest("a");
    if (anchor && anchor.href) {
      const { category } = getFileTypeInfo(anchor.href);
      // If it's a previewable file, intercept and show modal
      if (category !== "unknown") {
        e.preventDefault();
        const fileName = anchor.textContent?.trim() || anchor.href.split("/").pop() || "File";
        setPreviewFile({ url: anchor.href, name: fileName });
      }
    }
  };

  // Resolution content component
  const ResolutionContent = () => {
    // If no resolution and ticket not closed, show option to add
    if (!ticket.resolution_details && !isTicketClosed && ticket.status !== "Open") {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="w-16 h-16 bg-app rounded-xl flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No Resolution Yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">
            Add resolution details to close this ticket
          </p>
          <button
            onClick={() => setIsResolutionModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors bg-green-500 hover:bg-green-600"
          >
            <CheckCircle className="w-4 h-4" />
            Add Resolution & Close Ticket
          </button>
        </div>
      );
    }

    // If ticket is closed but no resolution details
    if (!ticket.resolution_details && isTicketClosed && ticket.status !== "Open") {
      return (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Ticket Closed</h3>
                <p className="text-sm text-gray-500">No resolution details provided</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Show resolution details
    const historyEntries = resolutionHistory || [];
    const pastEntries = historyEntries.filter((e) => !e.is_current_version);

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Resolution Details</h3>
                {ticket.resolution_date && (
                  <p className="text-sm text-gray-500">
                    Resolved on {new Date(ticket.resolution_date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {ticket.status === "Resolved" && ticket.raised_by === currentUserEmail && (
                <button
                  onClick={() => setIsRejectModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              )}
            </div>
          </div>
          <div
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: ticket.resolution_details || "" }}
          />
        </div>

        {/* Previous Resolutions */}
        {pastEntries.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-gray-500" />
              <h4 className="font-medium text-gray-700 text-sm">Previous Resolutions</h4>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {pastEntries.length}
              </span>
            </div>
            <div className="space-y-3">
              {pastEntries.map((entry) => {
                const isExpanded = expandedHistoryEntries[entry.name] || false;
                return (
                  <div
                    key={entry.name}
                    className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                          v{entry.version_number}
                        </span>
                        {entry.satisfaction_status && entry.satisfaction_status !== "Pending" && (
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${entry.satisfaction_status === "Satisfied"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                              }`}
                          >
                            {entry.satisfaction_status}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {entry.submitted_by_name || entry.submitted_by} &middot;{" "}
                        {entry.submitted_on
                          ? new Date(entry.submitted_on).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        setExpandedHistoryEntries((prev) => ({
                          ...prev,
                          [entry.name]: !isExpanded,
                        }))
                      }
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mb-1"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3 h-3" /> Hide details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" /> Show details
                        </>
                      )}
                    </button>
                    {isExpanded && (
                      <div
                        className="text-sm text-gray-600 prose prose-sm max-w-none mt-2"
                        dangerouslySetInnerHTML={{
                          __html: entry.resolution_content || "",
                        }}
                      />
                    )}
                    {entry.rejection_reason && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded p-2">
                        <span className="font-medium">Rejection reason:</span>{" "}
                        {entry.rejection_reason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const Header = ({ ticket }: { ticket: TicketDetail }) => {
    return (
      <header className="bg-white border-b border-gray-200 px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 shadow-sm">
        <div className="flex items-center gap-4">
          {/* Chat icon */}
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>

          {/* Title and assigned */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-gray-900 text-lg">
                Issue Discussion
                <span className="ml-2 text-blue-600">#{ticket.name}</span>
              </h1>
              <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${getStatusColor(ticket.status)}`}>
                {ticket.status}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-gray-500">Assigned to</span>
              <WrapperHoverCard employeeId={employeeData?.name} placement="bottom-left">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-app rounded-lg cursor-pointer">
                  <span className="w-2 h-2 rounded-lg bg-green-500"></span>
                  <span className="text-sm font-medium text-gray-700">
                    {getAssignedUser()}
                  </span>
                </div>
              </WrapperHoverCard>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 w-full md:w-auto pb-2 md:pb-0">
          {/* Actions Dropdown */}
          {actionItems.length > 0 && (
            <DropdownMenu items={actionItems} placement="bottom-left">
              {(isOpen) => (
                <button
                  disabled={isClosing}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                >
                  Actions
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </button>
              )}
            </DropdownMenu>
          )}
        </div>
      </header>
    );
  };

  return (
    <div className={`${isDrawer ? "flex-1 min-h-0" : "h-screen"} flex flex-col bg-app`}>
      {/* Header */}
      {isDesktop && <Header ticket={ticket} />}

      {/* Info banner when agent has requested closure */}
      {ticket.status === "Resolved" && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-2">
          <span className="text-amber-600 text-sm font-medium">
            The agent has requested closure for this ticket. Please review and accept or reject.
          </span>
        </div>
      )}

      {/* Tabs - Chat and Resolution */}
      <div className="bg-white border-b border-gray-200 px-6">
        <nav className="flex items-center justify-between w-full">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === "chat"
                ? "border-blue-500 text-blue-600 bg-blue-50/50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
            >
              Messages
              {messages.length > 0 && (
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-lg ${activeTab === "chat"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-app text-gray-600"
                  }`}>
                  {messages.length}
                </span>
              )}
            </button>

            {false && ticket.status !== "Open" && (
              <button
                onClick={() => setActiveTab("resolution")}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === "resolution"
                  ? "border-blue-500 text-blue-600 bg-blue-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
              >
                Resolution
                {ticket.resolution_details && (
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-lg ${activeTab === "resolution"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-app text-gray-600"
                    }`}>
                    1
                  </span>
                )}
              </button>
            )}
          </div>
          {!isDesktop && actionItems.length > 0 && (
            <div className="flex items-center">
              <DropdownMenu items={actionItems} placement="bottom-left">
                {(isOpen) => (
                  <button
                    disabled={isClosing}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                  >
                    Actions
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                )}
              </DropdownMenu>
            </div>
          )}
        </nav>
      </div>
      {/* Content Area */}
      {activeTab === "resolution" ? (
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <ResolutionContent />
        </div>
      ) : (
        <>
          {/* Chat Content Area */}
          <div className="flex-1 overflow-y-auto px-4 py-5" style={{ background: "#f7f8fa" }}>
            {Object.entries(groupedMessages).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500">No messages to display</p>
                <p className="text-sm text-gray-400 mt-1">
                  Start the conversation by sending a message below
                </p>
              </div>
            ) : (
              <div>
                {Object.entries(groupedMessages).map(([dateKey, dateMessages]) => (
                  <div key={dateKey}>
                    {/* Date separator - pill/lozenge style matching Figma */}
                    <div className="flex items-center justify-center my-5">
                      <span className="px-5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-500 shadow-sm tracking-wide">
                        {dateKey}
                      </span>
                    </div>

                    {/* Messages for this date */}
                    {dateMessages.map((msg) => (
                      <ChatBubble
                        key={msg.id}
                        message={msg}
                        isTicketClosed={isTicketClosed}
                        onReplyingTo={setReplyingTo}
                        onPreviewFile={setPreviewFile}
                        onContentClick={handleContentClick}
                        formatTime={formatTime}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Simplified Chat Input - no CC/BCC, no mode toggle */}
          <SimplifiedChatInput
            onSend={handleSendMessage}
            placeholder="Type your reply here....."
            isSending={isSending}
            disabled={isTicketClosed}
            replyingTo={replyingTo ? {
              id: replyingTo.id,
              content: replyingTo.content,
              senderName: replyingTo.sender.name
            } : null}
            onCancelReply={() => setReplyingTo(null)}
          />
        </>
      )}

      {/* Resolution Modal */}
      <ResolutionModal
        ticket={ticket}
        isOpen={isResolutionModalOpen}
        onClose={() => {
          setIsResolutionModalOpen(false);
          setIsResolvingTicket(false);
        }}
        onSubmit={isResolvingTicket ? handleSaveResolution : handleCloseTicket}
        isLoading={isClosing}
        isRaiser={true}
        isClosingTicket={!isResolvingTicket}
        isResolving={isResolvingTicket}
      />

      {/* Reject Resolution Modal */}
      <RejectResolutionModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onSubmit={handleRejectResolution}
        isLoading={rejectResolutionMutation.isPending}
      />

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Forms Modal */}
      {showForms && (
        <Modal
          isOpen={showForms}
          onClose={() => setShowForms(false)}
          className="flex flex-col overflow-hidden h-[85vh] sm:h-[80vh]"
          size="lg"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10 text-left">
            <div>
              <Typography variant="h3" color="primary" className="text-lg sm:text-[24px] font-bold">
                Ticket Submission Forms
              </Typography>
              <Typography variant="bodySmall" color="body2" className="mt-1 text-xs sm:text-[14px]">
                Ticket ID: {ticket.name}
              </Typography>
            </div>
            <button
              onClick={() => setShowForms(false)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto hide-attachment-readonly p-4 md:p-6 bg-gray-50/30">
            <div className="flex flex-col gap-6">
              {closeForm?.schema && (
                <div className="show-req-astrik border border-gray-200 bg-white rounded-xl p-4 md:p-6 shadow-sm">
                  <Typography variant="subheading" color="primary" className="mb-4 block text-base sm:text-[18px] font-semibold">
                    Close Form
                  </Typography>
                  <FormPreview
                    containerId={`close-form-container-chat-read-${ticket.name}`}
                    schema={closeForm.schema}
                    submissionData={closeForm.answer || {}}
                    readOnly={true}
                  />
                </div>
              )}

              {feedbackForm?.schema && (
                <div className="show-req-astrik border border-gray-200 bg-white rounded-xl p-4 md:p-6 shadow-sm">
                  <Typography variant="subheading" color="primary" className="mb-4 block text-base sm:text-[18px] font-semibold">
                    Feedback Form
                  </Typography>
                  <FormPreview
                    containerId={`feedback-form-container-chat-read-${ticket.name}`}
                    schema={feedbackForm.schema}
                    submissionData={feedbackForm.answer || {}}
                    readOnly={true}
                  />
                </div>
              )}

              {creationForm?.schema && (
                <div className="show-req-astrik border border-gray-200 bg-white rounded-xl p-4 md:p-6 shadow-sm">
                  <Typography variant="subheading" color="primary" className="mb-4 block text-base sm:text-[18px] font-semibold">
                    Creation Form
                  </Typography>
                  <FormPreview
                    containerId={`creation-form-container-chat-read-${ticket.name}`}
                    schema={creationForm.schema}
                    submissionData={creationForm.answer || {}}
                    readOnly={true}
                  />
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};


export default SimplifiedChatView;
