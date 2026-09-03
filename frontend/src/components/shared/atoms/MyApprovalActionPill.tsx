"use client";

import { useState } from "react";
import { Repeat1, SquarePen, Trash2, Wallet, X, BellRing } from "lucide-react";
import type { JSX } from "react";
import Tooltip from "../Tooltip";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { getActionsEnabled } from "../../../utils/uiPermission";
import { useNudge } from "../../../hooks/useNudge";


type MyApprovalActionPillProps = {
  /** to inforce ui permission to show hide action buttons
   */
  uiPermission?: {
    app: string;
    page: string;
    actionKeysMap: {
      edit?: string;
      revoke?: string;
      replace?: string;
      pay?: string;
      nudge?: string;
    }
  };
  canRevoke?: boolean;
  canEdit?: boolean;
  canReplace?: boolean;
  canPay?: boolean;

  onRevoke?: () => void;
  onEdit?: () => void;
  onReplace?: () => void;
  onPay?: () => void;

  payLoading?: boolean;
  revokeLoading?: boolean;
  variant?: "pill" | "buttons";
  isResubmit?: boolean;
  todoId?: string | string[];
  isPendingStatus?: boolean;
};

type ActionItem = {
  key: "revoke" | "edit" | "replace" | "pay" | "nudge";
  tooltip: string;
  icon: JSX.Element;
  onClick?: () => void;
  loading?: boolean;
};

const MyApprovalActionPill = ({
  uiPermission,
  canRevoke,
  canEdit,
  canReplace,
  onRevoke,
  onEdit,
  onReplace,
  revokeLoading = false,
  variant = "pill",
  canPay,
  onPay,
  payLoading = false,
  isResubmit = false,
  todoId,
  isPendingStatus
}: MyApprovalActionPillProps) => {

  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const { isDesktop } = useScreenSize();
  const { mutate: sendNudge, isPending: nudging } = useNudge();

  const { data: uiPermissionData } = useGetUiPermission(uiPermission?.app);
  const actionsEnabledFromKeys = Object.values(uiPermission?.actionKeysMap ?? []);
  const actionsEnabled = getActionsEnabled(uiPermissionData, actionsEnabledFromKeys, uiPermission?.page);

  const revokeAllowed =
    !!canRevoke &&
    (!uiPermission?.actionKeysMap?.revoke ||
      actionsEnabled[uiPermission?.actionKeysMap?.revoke]);

  const editAllowed =
    !!canEdit &&
    (!uiPermission?.actionKeysMap?.edit ||
      actionsEnabled[uiPermission?.actionKeysMap?.edit]);

  const replaceAllowed =
    !!canReplace &&
    (!uiPermission?.actionKeysMap?.replace ||
      actionsEnabled[uiPermission?.actionKeysMap?.replace]);

  const payAllowed =
    !!canPay &&
    (!uiPermission?.actionKeysMap?.pay ||
      actionsEnabled[uiPermission?.actionKeysMap?.pay]);

  const nudgeAllowed =
    !!todoId &&
    !!isPendingStatus &&
    (!uiPermission?.actionKeysMap?.nudge ||
      actionsEnabled[uiPermission?.actionKeysMap?.nudge]);

  const hasActions = revokeAllowed || editAllowed || replaceAllowed || payAllowed || nudgeAllowed;
  if (!hasActions) {
    if (variant === "buttons") return null;

    return (
      <div className="h-8 px-3 flex items-center justify-center rounded-3xl bg-gray-10 text-gray-600 text-xs font-medium w-fit">
        NA
      </div>
    );
  }

  const handleRevokeClick = () => {
    setShowRevokeConfirm(true);
  };

  const handleRevokeConfirm = () => {
    setShowRevokeConfirm(false);
    onRevoke?.();
  };

  const actions: ActionItem[] = [];

  if (revokeAllowed && onRevoke) {
    actions.push({
      key: "revoke",
      tooltip: "Revoke",
      loading: revokeLoading,
      onClick: handleRevokeClick,
      icon: <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />,
    });
  }

  if (editAllowed && onEdit) {
    actions.push({
      key: "edit",
      tooltip: isResubmit ? "Resubmit" : "Edit",
      onClick: onEdit,
      icon: <SquarePen className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
    });
  }

  if (replaceAllowed && onReplace) {
    actions.push({
      key: "replace",
      tooltip: "Replace",
      onClick: onReplace,
      icon: <Repeat1 className="w-4 h-4 text-sky-600 dark:text-sky-400" />,
    });
  }

  if (payAllowed && onPay) {
    actions.push({
      key: "pay",
      tooltip: "Pay",
      loading: payLoading,
      onClick: onPay,
      icon: <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    });
  }

  if (nudgeAllowed && todoId) {
    actions.push({
      key: "nudge",
      tooltip: "Nudge",
      loading: nudging,
      onClick: () => sendNudge(todoId),
      icon: <BellRing className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
    });
  }

  const revokeConfirmModal = showRevokeConfirm ? (
    <div
      className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-xs"
      onClick={() => setShowRevokeConfirm(false)}
    >
      <div
        className={`bg-card w-full ${isDesktop
          ? "max-w-sm rounded-lg shadow-xl border border-border"
          : "rounded-t-2xl shadow-2xl"
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h3 className="text-lg font-semibold text-gray-900">Confirm Revoke</h3>
          <button
            onClick={() => setShowRevokeConfirm(false)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-5">
          <div className="flex items-center gap-3 mb-3 mt-1">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-5 h-5 text-red-500 dark:text-red-400" />
            </div>
            <p className="text-sm text-gray-600">
              Are you sure you want to revoke this request? This action cannot be undone.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => setShowRevokeConfirm(false)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRevokeConfirm}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  // ✅ MOBILE BUTTON VARIANT WITH DISTINCT COLORS
  if (variant === "buttons") {
    const getMobileButtonStyle = (key: string) => {
      switch (key) {
        case "revoke":
          return "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50";
        case "edit":
          return "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50";
        case "replace":
          return "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/50";
        case "pay":
          return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50";
        case "nudge":
        default:
          return "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50";
      }
    };

    return (
      <>
        <div className="flex gap-2 mt-3 w-full">
          {actions.map((action) => (
            <button
              key={action.key}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                action.onClick?.();
              }}
              disabled={action.loading}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${getMobileButtonStyle(action.key)}`}
            >
              {action.loading ? (
                <span className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{action.icon}</span>
                  <span className="capitalize">
                    {action.key === "edit" && isResubmit
                      ? "Resubmit"
                      : action.key}
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
        {revokeConfirmModal}
      </>
    );
  }

  return (
    <>
      <div className="h-8 flex items-center gap-1 px-3 py-1 rounded-3xl bg-surface-sunken border border-border/50 w-fit">
        {actions.map((action, index) => (
          <div key={action.key} className="flex items-center gap-2">
            <Tooltip content={action.tooltip} position="top">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  action.onClick?.();
                }}
                disabled={action.loading}
                className="flex items-center justify-center p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {action.loading ? (
                  <span className="w-4 h-4 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  action.icon
                )}
              </button>
            </Tooltip>

            {index < actions.length - 1 && (
              <span className="w-px h-4 bg-border" />
            )}
          </div>
        ))}
      </div>
      {revokeConfirmModal}
    </>
  );
};

export default MyApprovalActionPill;
