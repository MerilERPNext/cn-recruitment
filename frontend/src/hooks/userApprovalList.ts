/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approvalListServices } from "../services/approvalListService";
import { errorResponseFormater } from "../utils/errorResponseFormater";
import toast from "react-hot-toast";
import { useLoadingOverlay } from "../context/OverlayContext";
import { useCallback, useState } from "react";
import ApprovalCommentModal from "../components/shared/ApprovalCommentModal";

export function useApprovalListActions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ action, name }: { action: string; name: string }) =>
      approvalListServices.multiActionHandler(action, name),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["attendance", "all"] });
    },
    onError: (e) => {
      console.log(e);
    },
  });
}

export function useRevokeEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      docname,
      todo,
      doctype,
    }: {
      docname: string;
      todo: string;
      doctype: string;
    }) => approvalListServices.revokeEvent(docname, todo, doctype),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", "all"] });
      queryClient.invalidateQueries({ queryKey: ["employee-attendance-summary"] });
    },
    onError: (err) => {
      const formatedError = errorResponseFormater(err);
      toast.error(formatedError);
      console.log("Errorr Replacing Leave", err);
    },
  });
}


/* ─────────────────────────────────────────────
   Comment modal configuration types
   ───────────────────────────────────────────── */

/**
 * Allowed approval action types
 */
type actionType = "Approve" | "Reject" | "Send Back";

/**
 * Configuration for enabling comment modal before actions
 */
export interface CommentConfig {
  /**
   * Action types that should open a comment modal
   * @example ["Approve", "Reject"]
   */
  actionTypes: actionType[];

  /**
   * Optional callback executed BEFORE the main action
   *
   * Useful for:
   * - Saving comment to backend
   * - Validation
   * - Logging
   *
   * ⚠️ If this throws an error, the main action WILL NOT execute
   */
  onBeforeAction?: (params: {
    /** Action being performed */
    action: actionType;
    /** User-entered comment */
    comment: string;
    /** Additional API data passed from handleAction */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    commentApiData: any;
  }) => Promise<void>;

  /**
   * Whether comment is mandatory
   * @default false
   */
  commentRequired?: boolean;

  /**
   * Placeholder text for textarea
   */
  placeholder?: string;
}

/**
 * Custom hook to handle approval actions with optional comment modal.
 *
 * @param triggerRefetch - Callback to refresh data after action.
 * @param commentConfig - Optional configuration for comment modal behavior.
 *
 * @returns Object containing action handler and modal renderer.
 *
 * @example
 * const { handleAction, renderCommentModal } = useApprovalAction(refetch, {
 *   actionTypes: ["Reject"],
 *   commentRequired: true,
 *   onBeforeAction: async ({ comment }) => {
 *     await saveComment(comment);
 *   }
 * });
 */
export function useApprovalAction(
  triggerRefetch?: () => void,
  commentConfig?: CommentConfig,
) {
  const loading = useLoadingOverlay();
  const mutation = useApprovalListActions();

  /* ─── comment-modal state ─── */

  /** Controls modal visibility */
  const [commentModalOpen, setCommentModalOpen] = useState(false);

  /** Stores user comment */
  const [comment, setComment] = useState("");

  /** Action waiting for confirmation */
  const [pendingAction, setPendingAction] = useState<actionType | null>(null);

  /** Data associated with pending action */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pendingData, setPendingData] = useState<any>(null);

  /** Optional custom success message */
  const [pendingCustomMessage, setPendingCustomMessage] = useState<
    string | undefined
  >(undefined);

  /** Loading state for modal save button */
  const [isSaving, setIsSaving] = useState(false);

  /** Extra API payload passed to onBeforeAction */
  const [commentApiData, setCommentApiData] = useState<any>(null);

  /**
   * Core executor for approval actions (NO modal logic here)
   *
   * Handles:
   * - API mutation
   * - Assistant trigger logic
   * - Success/error toasts
   */
  const executeAction = useCallback(
    async (
      action: string,
      data: {
        todo_id: string;
        custom_open_chatnext_assistant_on_action: boolean;
        custom_approval_type?: "Approval Matrix" | "Multi Actions";
      },
      custom_action_message?: string,
    ) => {
      if (mutation?.isPending) return;

      const actionLoadingShow = ["approve", "reject"].includes(
        action.toLocaleLowerCase(),
      )
        ? action
        : `Performing Action: ${action}`;

      await loading?.wrap(async () => {
        try {
          const response = await mutation.mutateAsync({
            action,
            name: data?.todo_id || "",
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const responseWithSession = response as unknown as { session?: any };

          /**
           * Assistant trigger logic
           */
          if (
            (data?.custom_approval_type === "Approval Matrix" &&
              responseWithSession?.session) ||
            (data?.custom_approval_type === "Multi Actions" &&
              data?.custom_open_chatnext_assistant_on_action)
          ) {
            if (window.trigger_chatnext_assistant) {
              window.trigger_chatnext_assistant(
                true,
                responseWithSession?.session,
              );
            }

            if (action.toLowerCase() !== "approve") {
              triggerRefetch?.();
            }
          } else {
            /**
             * Default success messages
             */
            const actionMap: Record<string, string> = {
              Approve: "Request Approved Successfully!",
              Reject: "Request Rejected Successfully!",
            };

            const finalAction =
              custom_action_message ||
              actionMap[action] ||
              `Action Performed Successfully`;

            toast.success(finalAction);
            triggerRefetch?.();
          }
        } catch (error: any) {
          const formatedError = errorResponseFormater(
            error,
            "Something went wrong",
          );
          toast.error(formatedError);
          console.error("Action Failed:", error);
        }
      }, actionLoadingShow);
    },
    [mutation, loading, triggerRefetch],
  );

  /**
   * Public handler for triggering actions
   *
   * Automatically decides:
   * - Open comment modal OR
   * - Execute action directly
   *
   * @param action - Action name (Approve/Reject/etc.)
   * @param data - API payload
   * @param custom_action_message - Optional success message override
   * @param comment_api_data - Extra data passed to onBeforeAction
   *
   * @example
   * handleAction("Reject", data, undefined, { id: 123 });
   */
  const handleAction = useCallback(
    async (
      action: string,
      data: {
        todo_id: string;
        custom_open_chatnext_assistant_on_action: boolean;
        custom_approval_type?: "Approval Matrix" | "Multi Actions";
      },
      custom_action_message?: string,
      comment_api_data?: any,
    ) => {
      /**
       * Check if modal is required for this action
       */
      if (
        commentConfig?.actionTypes?.some(
          (t) => t.toLowerCase() === action.toLowerCase(),
        )
      ) {
        setPendingAction(action as actionType);
        setPendingData(data);
        setPendingCustomMessage(custom_action_message);
        setCommentApiData(comment_api_data);
        setComment("");
        setCommentModalOpen(true);
        return;
      }

      // Execute directly if no modal needed
      await executeAction(action, data, custom_action_message);
    },
    [commentConfig, executeAction],
  );

  /**
   * Cancel comment modal and reset state
   */
  const handleCancelComment = useCallback(() => {
    setCommentModalOpen(false);
    setComment("");
    setPendingAction(null);
    setPendingData(null);
    setCommentApiData(null);
    setPendingCustomMessage(undefined);
  }, []);

  /**
   * Save comment and continue with action
   *
   * Flow:
   * 1. Validate comment (if required)
   * 2. Run onBeforeAction
   * 3. Execute main action
   */
  const handleSaveAndContinue = useCallback(async () => {
    if (!pendingAction || !pendingData) return;

    if (commentConfig?.commentRequired && !comment.trim()) {
      toast.error("Comment is required");
      return;
    }

    setIsSaving(true);
    try {
      if (commentConfig?.onBeforeAction) {
        await commentConfig.onBeforeAction({
          action: pendingAction,
          comment,
          commentApiData,
        });
      }

      setCommentModalOpen(false);

      await executeAction(pendingAction, pendingData, pendingCustomMessage);
    } catch (error) {
      const formatedError = errorResponseFormater(
        error,
        "Failed to save. Please try again.",
      );
      toast.error(formatedError);
    } finally {
      setIsSaving(false);
      setComment("");
      setPendingAction(null);
      setPendingData(null);
      setPendingCustomMessage(undefined);
    }
  }, [
    pendingAction,
    pendingData,
    pendingCustomMessage,
    comment,
    commentConfig,
    executeAction,
    commentApiData,
  ]);

  /**
   * Render function for comment modal
   *
   * ⚠️ Must be rendered in JSX:
   * @example
   * {renderCommentModal?.()}
   */
  const renderCommentModal = commentConfig
    ? () =>
      ApprovalCommentModal({
        open: commentModalOpen,
        action: pendingAction,
        comment,
        onCommentChange: setComment,
        onCancel: handleCancelComment,
        onSave: handleSaveAndContinue,
        isSaving,
        placeholder: commentConfig.placeholder,
      })
    : null;

  return {
    /** Main action trigger */
    handleAction,

    /** Function to render modal */
    renderCommentModal,

    /** Modal open state */
    commentModalOpen,

    /** Current comment value */
    comment,

    /** Setter for comment */
    setComment,

    /** Current pending action */
    pendingAction,
  };
}