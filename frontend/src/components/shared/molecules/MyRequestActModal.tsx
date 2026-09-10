/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, ShieldAlert, FileText } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import TeamApprovalActionPill from "../atoms/TeamApprovalActionPill";
import StatusBadge from "../atoms/statusBadge";
import ActionReasonModal from "../ActionReasonModal";
import { useApprovalAction } from "../../../hooks/userApprovalList";
import { extractRequestItemData } from "../../../utils/taskAssignmentUtils";

interface MyRequestActModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestItem: any;
  onActionComplete?: () => void;
}

const MyRequestActModal: React.FC<MyRequestActModalProps> = ({
  isOpen,
  onClose,
  requestItem,
  onActionComplete,
}) => {
  const queryClient = useQueryClient();
  const [loadingAction, setLoadingAction] = useState<{ id: string; action: string } | null>(null);
  const [reasonModalConfig, setReasonModalConfig] = useState<{
    isOpen: boolean;
    action: string;
    type: "approval" | "rejection" | "act";
  }>({
    isOpen: false,
    action: "",
    type: "act",
  });

  const {
    todoId,
    actions,
    status,
    approvalType,
    openAssistant,
    referenceType,
    referenceName,
  } = extractRequestItemData(requestItem);

  const invalidateAllRequestQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["attendance"] });
    queryClient.invalidateQueries({ queryKey: ["employee-attendance-requests"] });
    queryClient.invalidateQueries({ queryKey: ["my-overtime-requests"] });
    queryClient.invalidateQueries({ queryKey: ["leave-applications"] });
    queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] });
    queryClient.invalidateQueries({ queryKey: ["employee-shift-requests"] });
    queryClient.invalidateQueries({ queryKey: ["expense-claims"] });
    queryClient.invalidateQueries({ queryKey: ["expense-advances"] });
    queryClient.invalidateQueries({ queryKey: ["advances"] });
    queryClient.invalidateQueries({ queryKey: ["loans"] });
    queryClient.invalidateQueries({ queryKey: ["loan-applications"] });
    queryClient.invalidateQueries({ queryKey: ["compensatory-requests"] });
    queryClient.invalidateQueries({ queryKey: ["benefits"] });
    queryClient.invalidateQueries({ queryKey: ["custom-api"] });
  };

  const handleComplete = () => {
    invalidateAllRequestQueries();
    onActionComplete?.();
    onClose();
  };

  const { handleAction } = useApprovalAction(handleComplete);

  if (!isOpen) return null;

  const executeAction = async (action: string, customMessage?: string) => {
    if (!todoId) return;
    try {
      setLoadingAction({ id: todoId, action });
      await handleAction(
        action,
        {
          todo_id: todoId,
          custom_open_chatnext_assistant_on_action: openAssistant,
          custom_approval_type: approvalType,
        },
        customMessage
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const handleActionClick = (action: string) => {
    const normalized = action.toLowerCase();
    if (normalized === "reject" || normalized === "sendback" || normalized === "send back") {
      setReasonModalConfig({
        isOpen: true,
        action,
        type: normalized === "reject" ? "rejection" : "act",
      });
      return;
    }

    executeAction(action);
  };

  const handleReasonSave = (reason: string | null) => {
    const action = reasonModalConfig.action;
    setReasonModalConfig({ isOpen: false, action: "", type: "act" });
    if (action) {
      executeAction(action, reason || undefined);
    }
  };

  const displayName = referenceName || todoId || "Request";
  const displayType = referenceType || requestItem?.doctype || "Request Details";
  const description =
    requestItem?.reason ||
    requestItem?.description ||
    requestItem?.custom_reason ||
    requestItem?.remarks ||
    "";

  const modalContent = (
    <>
      <div
        className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        onClick={onClose}
      >
        <div
          className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <ShieldAlert className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <span>Take Action: {displayName}</span>
                </h3>
                <p className="text-xs text-gray-500">{displayType}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200/60 rounded-full transition-colors text-gray-400 hover:text-gray-700"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Status & ID Summary */}
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
              <span className="text-xs font-medium text-gray-500">Current Status</span>
              <StatusBadge status={status || "Pending"} />
            </div>

            {/* Description / Reason */}
            {description && (
              <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100/50">
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-700 break-words leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            )}

            {/* Actions list */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                Available Actions
              </label>
              {actions.length > 0 ? (
                <TeamApprovalActionPill
                  actions={actions}
                  status={status || "pending"}
                  recordId={todoId}
                  loadingAction={loadingAction}
                  onAction={handleActionClick}
                  variant="buttons"
                />
              ) : (
                <p className="text-sm text-gray-500 italic py-2">
                  No pending approval actions available for this item.
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200/50 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {reasonModalConfig.isOpen && (
        <ActionReasonModal
          isOpen={reasonModalConfig.isOpen}
          type={reasonModalConfig.type}
          todo_id={todoId}
          onCancel={() =>
            setReasonModalConfig({ isOpen: false, action: "", type: "act" })
          }
          onSave={handleReasonSave}
        />
      )}
    </>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
};

export default MyRequestActModal;
