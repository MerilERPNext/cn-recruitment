"use client";

import { Repeat1, SquarePen, Trash2, Wallet } from "lucide-react";
import type { JSX } from "react";
import Tooltip from "../Tooltip";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { getActionsEnabled } from "../../../utils/uiPermission";

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
};

type ActionItem = {
  key: "revoke" | "edit" | "replace" | "pay";
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
}: MyApprovalActionPillProps) => {
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

  const hasActions = revokeAllowed || editAllowed || replaceAllowed || payAllowed;
  if (!hasActions) {
    if (variant === "buttons") return null;

    return (
      <div className="h-8 px-3 flex items-center justify-center rounded-3xl bg-gray-10 text-gray-600 text-xs font-medium w-fit">
        NA
      </div>
    );
  }

  const actions: ActionItem[] = [];

  if (revokeAllowed && onRevoke) {
    actions.push({
      key: "revoke",
      tooltip: "Revoke",
      loading: revokeLoading,
      onClick: onRevoke,
      icon: <Trash2 className="w-4 h-4 text-white md:text-red-400" />,
    });
  }

  if (editAllowed && onEdit) {
    actions.push({
      key: "edit",
      tooltip: isResubmit ? "Resubmit" : "Edit",
      onClick: onEdit,
      icon: <SquarePen className="w-4 h-4 text-white md:text-primary" />,
    });
  }

  if (replaceAllowed && onReplace) {
    actions.push({
      key: "replace",
      tooltip: "Replace",
      onClick: onReplace,
      icon: <Repeat1 className="w-4 h-4 text-white md:text-info" />,
    });
  }

  if (payAllowed && onPay) {
    actions.push({
      key: "pay",
      tooltip: "Pay",
      loading: payLoading,
      onClick: onPay,
      icon: <Wallet className={"w-4 h-4 text-white md:text-secondary"} />,
    });
  }

  // ✅ MOBILE BUTTON VARIANT
  if (variant === "buttons") {
    return (
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
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-sm"
          >
            {action.loading ? (
              <span className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {action.icon}
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
    );
  }

  return (
    <div className="h-8 flex items-center gap-1 px-3 py-1 rounded-3xl bg-gray-10 w-fit">
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
              className="flex items-center justify-center"
            >
              {action.loading ? (
                <span className="w-4 h-4 border border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                action.icon
              )}
            </button>
          </Tooltip>

          {index < actions.length - 1 && (
            <span className="w-px h-4 bg-gray-300" />
          )}
        </div>
      ))}
    </div>
  );
};

export default MyApprovalActionPill;
