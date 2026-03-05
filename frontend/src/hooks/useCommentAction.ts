import { useState, useCallback } from "react";
import { useCommentEvent } from "./userApprovalList";
import toast from "react-hot-toast";

/**
 * Per-action field names for each doctype.
 * Only show the comment modal when a field is defined (non-null) for
 * the given action + doctype combination.
 *
 * Keys: "approve" | "reject" | "sendback"
 */
const FIELDNAME_MAP: Record<string, Partial<Record<"approve" | "reject" | "sendback", string | null>>> = {
    "Leave Application": {
        approve: null,
        reject: "custom_rejection_reason",
        sendback: null,
    },
    "Attendance Request": {
        approve: null,
        reject: "custom__request_reason",
        sendback: null,
    },
    "Shift Request": {
        approve: null,
        reject: "custom_rejection_reason",
        sendback: null,
    },
    "Expense Claim": {
        approve: null,
        reject: "custom_rejection_reason",
        sendback: null,
    },
    "Employee Advance": {
        approve: null,
        reject: "custom_note_remarks",
        sendback: null,
    },
    "Loan Application": {
        approve: null,
        reject: "description",
        sendback: null,
    },
};

/**
 * Normalise any action string to one of our three keys.
 */
function normalizeActionKey(action: string): "approve" | "reject" | "sendback" | null {
    const lower = action.toLowerCase().replace(/\s+/g, "");
    if (lower === "approve") return "approve";
    if (lower === "reject") return "reject";
    if (lower === "sendback") return "sendback";
    return null;
}

/**
 * Look up the field name for a doctype + action.
 * Returns the field name string, or null if the modal should be skipped.
 */
function getFieldForAction(doctype: string, action: string): string | null {
    const actionKey = normalizeActionKey(action);
    if (!actionKey) return null;

    const doctypeMap = FIELDNAME_MAP[doctype];
    if (!doctypeMap) return null;

    const field = doctypeMap[actionKey];
    return field ?? null;
}

export interface PendingActionData {
    action: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    todoData: any;
    /** doctype from reference_type */
    doctype: string;
    /** docname(s) from reference_name – single or array for bulk */
    docnames: string[];
    /** resolved fieldname for this action */
    fieldname: string;
}

export function useCommentAction() {
    const commentMutation = useCommentEvent();
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [pendingAction, setPendingAction] = useState<PendingActionData | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    /**
     * Call this instead of directly performing the action.
     * Shows the comment modal only if there is a mapped field for
     * the action + doctype. Otherwise proceeds immediately.
     */
    const requestAction = useCallback(
        (
            action: string,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            todoData: any,
            doctype: string,
            docnames: string | string[],
            onProceedImmediately?: () => void,
        ) => {
            const fieldname = getFieldForAction(doctype, action);

            if (fieldname) {
                // Field is defined → show the comment modal
                setPendingAction({
                    action,
                    todoData,
                    doctype,
                    docnames: Array.isArray(docnames) ? docnames : [docnames],
                    fieldname,
                });
                setShowCommentModal(true);
            } else {
                // No field mapped → skip comment, proceed immediately
                onProceedImmediately?.();
            }
        },
        [],
    );

    /**
     * Called when the user submits the comment in the modal.
     * Saves the comment via API, then calls onActionProceed.
     */
    const handleCommentSubmit = useCallback(
        async (comment: string, onActionProceed: () => void) => {
            if (!pendingAction) return;

            setIsSubmitting(true);
            try {
                await commentMutation.mutateAsync({
                    doctype: pendingAction.doctype,
                    docname: pendingAction.docnames,
                    fieldname: pendingAction.fieldname,
                    comment,
                });
                setShowCommentModal(false);
                setPendingAction(null);
                onActionProceed();
            } catch (err) {
                console.error("Failed to save comment", err);
                toast.error("Failed to save comment");
            } finally {
                setIsSubmitting(false);
            }
        },
        [pendingAction, commentMutation],
    );

    const handleCommentCancel = useCallback(() => {
        setShowCommentModal(false);
        setPendingAction(null);
    }, []);

    return {
        showCommentModal,
        pendingAction,
        isSubmitting,
        requestAction,
        handleCommentSubmit,
        handleCommentCancel,
    };
}
