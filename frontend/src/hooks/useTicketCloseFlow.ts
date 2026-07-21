/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Centralized ticket close/resolve flow hook.
 *
 * Flow:
 * 1. Check if ticket has feedback/exit forms configured for its category.
 * 2. If forms exist → open the TicketCloseModal so user can fill them.
 * 3. If no forms → close/resolve directly with default resolution "resolved".
 * 4. On submit (from modal or direct) → upload form attachments → call close/resolve API.
 *
 * This hook owns the entire lifecycle:
 *   - Checking for forms
 *   - Managing modal open/close state
 *   - File uploads for form attachments
 *   - Calling the mutation
 *   - Toast notifications
 */
import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCloseTicket,
  useRequestClosure,
  useGetExitFormJson,
  useGetFeedbackFormJson,
} from "./useHelpDeskTickets";
import { FrappeAPI } from "../utils/frappeAPI";
import { useFileUploader } from "./useFileUploader";
import { useLoadingOverlay } from "../context/OverlayContext";
import { getFileComponents } from "../utils/flowUtils";
import { errorResponseFormater } from "../utils/errorResponseFormater";
import toast from "react-hot-toast";

/** Minimal ticket shape needed for the close flow */
export interface CloseFlowTicket {
  name: string;
  custom_category?: string;
  custom_sub_category?: string;
  raised_by?: string;
  owner?: string;
  resolution_details?: string;
  status?: string;
}

export interface TicketCloseFlowOptions {
  /** Current user's email – used to determine raiser vs. agent */
  currentUserEmail: string;
}

export interface CloseFlowModalState {
  isOpen: boolean;
  ticket: CloseFlowTicket | null;
  /** 'close' | 'resolve' | 'requestClosure' */
  mode: "close" | "resolve" | "requestClosure";
}

/**
 * Return type of useTicketCloseFlow.
 * Components only need to interact with `initiateClose`, `initiateResolve`,
 * `modalState`, `handleModalSubmit`, `closeModal`, and loading flags.
 */
export interface TicketCloseFlowReturn {
  /** Call this to start the close flow for a ticket */
  initiateClose: (ticket: CloseFlowTicket) => void;
  /** Call this to start the resolve flow for a ticket */
  initiateResolve: (ticket: CloseFlowTicket) => void;
  /** Current modal state – pass to <TicketCloseModal /> */
  modalState: CloseFlowModalState;
  /** Submit handler – pass to <TicketCloseModal onSubmit /> */
  handleModalSubmit: (
    exitFormSubmission?: any,
    feedbackFormSubmission?: any,
    exitAttachments?: File[],
    feedbackAttachments?: File[],
  ) => Promise<void>;
  /** Close the modal */
  closeModal: () => void;
  /** Whether a mutation is in progress */
  isProcessing: boolean;

  /** Hooks for the modal to conditionally render forms */
  formHooks: {
    useExitForm: typeof useGetExitFormJson;
    useFeedbackForm: typeof useGetFeedbackFormJson;
  };
}

const DEFAULT_RESOLUTION = "resolved";

export const useTicketCloseFlow = ({
  currentUserEmail,
}: TicketCloseFlowOptions): TicketCloseFlowReturn => {
  const queryClient = useQueryClient();
  const [modalState, setModalState] = useState<CloseFlowModalState>({
    isOpen: false,
    ticket: null,
    mode: "close",
  });

  const closeTicketMutation = useCloseTicket();
  const requestClosureMutation = useRequestClosure();
  const { uploadFiles } = useFileUploader();
  const { show, hide } = useLoadingOverlay();

  const isProcessing =
    closeTicketMutation.isPending || requestClosureMutation.isPending;

  const closeModal = useCallback(() => {
    setModalState({ isOpen: false, ticket: null, mode: "close" });
  }, []);

  /**
   * Upload form file attachments and map their URLs back into submission data.
   * Mutates formSubmission in place for efficiency.
   */
  const uploadFormFiles = useCallback(
    async (
      attachments: File[],
      formSubmission: any,
      ticketId: string,
      label: string,
    ) => {
      if (!attachments || attachments.length === 0) return;
      show(`Uploading ${label} files...`);
      const uploadResults = await uploadFiles(
        attachments,
        "HD Ticket",
        ticketId,
      );
      if (formSubmission?.answer) {
        let uploadIdx = 0;
        const fileComponents = getFileComponents(
          formSubmission.schema?.components || [],
        );
        fileComponents.forEach((comp) => {
          const val = formSubmission.answer[comp.key];
          if (Array.isArray(val)) {
            formSubmission.answer[comp.key] = val.map(
              (fileObj: any) => {
                if (fileObj.file && uploadIdx < uploadResults.length) {
                  const uploadRes = uploadResults[uploadIdx++];
                  return {
                    storage: "url",
                    name: uploadRes.file_name,
                    url: uploadRes.file_url,
                    size: uploadRes.file_size,
                    type: uploadRes.file_type,
                    data: { role: "remote" },
                  };
                }
                return fileObj;
              },
            );
          }
        });
      }
    },
    [uploadFiles, show],
  );

  /**
   * Core close/resolve execution.
   * Handles file uploads and API calls.
   */
  const executeCloseOrResolve = useCallback(
    async (
      ticket: CloseFlowTicket,
      mode: "close" | "resolve" | "requestClosure",
      exitFormSubmission?: any,
      feedbackFormSubmission?: any,
      exitAttachments?: File[],
      feedbackAttachments?: File[],
    ) => {
      try {
        show("Processing...");

        if (mode === "requestClosure") {
          await requestClosureMutation.mutateAsync({
            ticketId: ticket.name,
            resolutionNotes: DEFAULT_RESOLUTION,
          });
          toast.success("Closure request sent");
          return;
        }

        // Deep clone submissions to avoid mutating the original state in place
        const clonedExitSubmission = exitFormSubmission ? JSON.parse(JSON.stringify(exitFormSubmission)) : null;
        const clonedFeedbackSubmission = feedbackFormSubmission ? JSON.parse(JSON.stringify(feedbackFormSubmission)) : null;

        // Upload exit form files
        if (exitAttachments && exitAttachments.length > 0) {
          await uploadFormFiles(
            exitAttachments,
            clonedExitSubmission,
            ticket.name,
            "exit form",
          );
        }

        // Upload feedback form files
        if (feedbackAttachments && feedbackAttachments.length > 0) {
          await uploadFormFiles(
            feedbackAttachments,
            clonedFeedbackSubmission,
            ticket.name,
            "feedback form",
          );
        }

        if (mode === "resolve") {
          await closeTicketMutation.mutateAsync({
            ticketId: ticket.name,
            resolutionDetails: DEFAULT_RESOLUTION,
            closingFormData: clonedExitSubmission
              ? JSON.stringify(clonedExitSubmission)
              : undefined,
            feedbackFormData: clonedFeedbackSubmission
              ? JSON.stringify(clonedFeedbackSubmission)
              : undefined,
          });
          toast.success("Ticket resolved successfully");
        } else {
          // mode === "close"
          await closeTicketMutation.mutateAsync({
            ticketId: ticket.name,
            resolutionDetails:
              ticket.resolution_details || DEFAULT_RESOLUTION,
            closingFormData: clonedExitSubmission
              ? JSON.stringify(clonedExitSubmission)
              : undefined,
            feedbackFormData: clonedFeedbackSubmission
              ? JSON.stringify(clonedFeedbackSubmission)
              : undefined,
          });
          toast.success("Ticket closed successfully");
        }
      } catch (error) {
        const msg = errorResponseFormater(
          error,
          `Failed to ${mode === "resolve" ? "resolve" : "close"} ticket`,
        );
        toast.error(msg);
        throw error; // re-throw so caller knows it failed
      } finally {
        hide();
      }
    },
    [
      closeTicketMutation,
      requestClosureMutation,
      uploadFormFiles,
      show,
      hide,
    ],
  );

  /**
   * Initiate the close flow.
   *
   * Checks for forms internally.
   * If no forms exist, executes close directly.
   */
  const initiateClose = useCallback(
    async (ticket: CloseFlowTicket) => {
      const isRaiserOrAdmin =
        ticket.raised_by === currentUserEmail ||
        ticket.owner === currentUserEmail;
        
      const mode = isRaiserOrAdmin ? "close" : "requestClosure";

      if (mode === "requestClosure") {
        await executeCloseOrResolve(ticket, mode);
        return;
      }

      if (!ticket.custom_category || !ticket.custom_sub_category) {
        await executeCloseOrResolve(ticket, mode);
        return;
      }

      try {
        show("Checking requirements...");
        const [exitFormRes, feedbackFormRes] = await Promise.all([
          queryClient.fetchQuery({
            queryKey: ["hd-exit-form-json", ticket.custom_category, ticket.custom_sub_category],
            queryFn: () => FrappeAPI.callMethod("pw_helpdesk.customizations.api.ticket.get_exit_form_json", {
              category: ticket.custom_category,
              sub_category: ticket.custom_sub_category,
            })
          }).catch(() => null),
          queryClient.fetchQuery({
            queryKey: ["hd-feedback-form-json", ticket.custom_category, ticket.custom_sub_category],
            queryFn: () => FrappeAPI.callMethod("pw_helpdesk.customizations.api.ticket.get_feedback_form_json", {
              category: ticket.custom_category,
              sub_category: ticket.custom_sub_category,
            })
          }).catch(() => null),
        ]);
        
        hide();

        const exitForm = (exitFormRes as any)?.form_json?.components?.length > 0;
        const feedbackForm = (feedbackFormRes as any)?.form_json?.components?.length > 0;

        if (exitForm || feedbackForm) {
          setModalState({
            isOpen: true,
            ticket,
            mode,
          });
        } else {
          await executeCloseOrResolve(ticket, mode);
        }
      } catch (error) {
        hide();
        console.error("Failed to check forms", error);
        setModalState({
          isOpen: true,
          ticket,
          mode,
        });
      }
    },
    [currentUserEmail, executeCloseOrResolve, show, hide],
  );

  /**
   * Initiate the resolve flow.
   * Checks for forms internally.
   * If no forms exist, executes resolve directly.
   */
  const initiateResolve = useCallback(
    async (ticket: CloseFlowTicket) => {
      if (!ticket.custom_category || !ticket.custom_sub_category) {
        await executeCloseOrResolve(ticket, "resolve");
        return;
      }
      try {
        show("Checking requirements...");
        const [exitFormRes, feedbackFormRes] = await Promise.all([
          queryClient.fetchQuery({
            queryKey: ["hd-exit-form-json", ticket.custom_category, ticket.custom_sub_category],
            queryFn: () => FrappeAPI.callMethod("pw_helpdesk.customizations.api.ticket.get_exit_form_json", {
              category: ticket.custom_category,
              sub_category: ticket.custom_sub_category,
            })
          }).catch(() => null),
          queryClient.fetchQuery({
            queryKey: ["hd-feedback-form-json", ticket.custom_category, ticket.custom_sub_category],
            queryFn: () => FrappeAPI.callMethod("pw_helpdesk.customizations.api.ticket.get_feedback_form_json", {
              category: ticket.custom_category,
              sub_category: ticket.custom_sub_category,
            })
          }).catch(() => null),
        ]);
        
        hide();

        const exitForm = (exitFormRes as any)?.form_json?.components?.length > 0;
        const feedbackForm = (feedbackFormRes as any)?.form_json?.components?.length > 0;

        if (exitForm || feedbackForm) {
          setModalState({
            isOpen: true,
            ticket,
            mode: "resolve",
          });
        } else {
          await executeCloseOrResolve(ticket, "resolve");
        }
      } catch (error) {
        hide();
        console.error("Failed to check forms", error);
        setModalState({
          isOpen: true,
          ticket,
          mode: "resolve",
        });
      }
    },
    [executeCloseOrResolve, show, hide],
  );

  /**
   * Handle modal submit.
   * Called from the TicketCloseModal.
   */
  const handleModalSubmit = useCallback(
    async (
      exitFormSubmission?: any,
      feedbackFormSubmission?: any,
      exitAttachments?: File[],
      feedbackAttachments?: File[],
    ) => {
      if (!modalState.ticket) return;

      await executeCloseOrResolve(
        modalState.ticket,
        modalState.mode,
        exitFormSubmission,
        feedbackFormSubmission,
        exitAttachments,
        feedbackAttachments,
      );

      closeModal();
    },
    [modalState, executeCloseOrResolve, closeModal],
  );

  return {
    initiateClose,
    initiateResolve,
    modalState,
    handleModalSubmit,
    closeModal,
    isProcessing,
    formHooks: {
      useExitForm: useGetExitFormJson,
      useFeedbackForm: useGetFeedbackFormJson,
    },
  };
};
