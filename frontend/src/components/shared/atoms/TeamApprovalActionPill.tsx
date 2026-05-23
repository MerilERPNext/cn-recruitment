"use client";

import { Check, SendToBack, X } from "lucide-react";
import type { JSX } from "react";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { getActionStyles } from "../../../utils/actionButtonStyles";
import { isActionEnabled } from "../../../utils/uiPermission";
import Tooltip from "../Tooltip";
import Button from "./Button";

type TeamApprovalActionPillProps = {
  uiPermission?: {
    app?: string;
    page?: string;
    actionKey?: string;
  };
  actionsEnabled?: boolean;
  actions: string[];
  status: string;
  recordId: string;
  loadingAction?: { id: string; action: string } | null;
  onAction: (action: string) => void;
  variant?: "pill" | "buttons" | "modal";
};

/* ===============================
   ACTION → ICON + COLOR CONFIG (EXTENSIBLE)
================================ */

const ACTION_CONFIG: Record<
  string,
  {
    tooltip: string;
    icon: JSX.Element;
    // FIXED: Direct class strings for reliable Tailwind colors
    buttonClasses: string;
  }
> = {
  approve: {
    tooltip: "Approve",
    icon: <Check className="w-4 h-4 text-green-600" strokeWidth={2} />,
    buttonClasses:
      "bg-green-50 text-green-600 hover:bg-green-100 focus:ring-green-500",
  },
  reject: {
    tooltip: "Reject",
    icon: <X className="w-4 h-4 text-red-500" strokeWidth={2} />,
    buttonClasses: "bg-red-50 text-red-500 hover:bg-red-100 focus:ring-red-500",
  },
  sendback: {
    tooltip: "Send Back",
    icon: <SendToBack className="w-4 h-4 text-amber-600" strokeWidth={2} />,
    buttonClasses:
      "bg-amber-50 text-amber-600 hover:bg-amber-100 focus:ring-amber-500",
  },
};

const normalizeAction = (action: string) =>
  action.toLowerCase().replace(/\s+/g, "");

const TeamApprovalActionPill = ({
  uiPermission,
  actionsEnabled = true,
  actions,
  status,
  recordId,
  loadingAction,
  onAction,
  variant = "pill",
}: TeamApprovalActionPillProps) => {
  const normalizedStatus = status?.toLowerCase();
  const { data: uiPermissionData } = useGetUiPermission(uiPermission?.app);
  const areactionsEnabled =
    actionsEnabled ||
    isActionEnabled(
      uiPermissionData,
      uiPermission?.actionKey ?? "",
      uiPermission?.page,
    );

  const isActionable =
    actionsEnabled &&
    (!uiPermission?.actionKey || areactionsEnabled) &&
    (normalizedStatus === "open" ||
      normalizedStatus === "pending" ||
      normalizedStatus === "draft") &&
    actions?.length > 0;

  if (!isActionable) {
    if (variant === "buttons" || variant === "modal") return null;

    return (
      <div className="h-8 px-3 flex items-center justify-center rounded-md bg-gray-10 text-gray-600 text-xs font-medium w-fit">
        Action Taken
      </div>
    );
  }

  const visibleActions = actions
    .map((action) => ({
      original: action,
      normalized: normalizeAction(action),
    }))
    .filter(({ normalized }) => ACTION_CONFIG[normalized]);

  if (variant === "modal") {
    return (
      <div className="flex justify-end gap-3">
        {visibleActions.map(({ original, normalized }) => {
          const isLoading =
            loadingAction?.id === recordId &&
            normalizeAction(loadingAction.action) === normalized;

          const actionStyle = getActionStyles(original);

          return (
            <Button
              key={original}
              size="md"
              bgColor={actionStyle.bgColor}
              variant={actionStyle.variant}
              disabled={isLoading}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAction(original);
              }}
              icon={!isLoading ? ACTION_CONFIG[normalized]?.icon : undefined}
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                original
              )}
            </Button>
          );
        })}
      </div>
    );
  }

  if (variant === "buttons") {
    return (
      <div className="flex flex-wrap gap-2 mt-3 w-full">
        {visibleActions.map(({ original, normalized }) => {
          const isLoading =
            loadingAction?.id === recordId &&
            normalizeAction(loadingAction.action) === normalized;

          const actionStyle = getActionStyles(original);

          return (
            <Button
              key={original}
              size="md"
              className="flex-1 min-w-[120px]"
              bgColor={actionStyle.bgColor}
              variant={actionStyle.variant}
              disabled={isLoading}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAction(original);
              }}
              icon={!isLoading ? ACTION_CONFIG[normalized]?.icon : undefined}
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                original
              )}
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div className=" h-8 flex items-center gap-1 px-3 py-1 rounded-3xl bg-gray-10 w-fit">
      {visibleActions.map(({ original, normalized }, index) => {
        const meta = ACTION_CONFIG[normalized];
        const isLoading =
          loadingAction?.id === recordId &&
          normalizeAction(loadingAction.action) === normalized;

        return (
          <div key={normalized} className="flex items-center gap-2">
            <Tooltip content={meta.tooltip} position="top">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAction(original);
                }}
                disabled={isLoading}
                className="flex items-center justify-center"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border border-gray-400 border-t-transparent rounded-3xl animate-spin" />
                ) : (
                  meta.icon
                )}
              </button>
            </Tooltip>

            {index < visibleActions.length - 1 && (
              <span className="w-px h-4 bg-gray-300" />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TeamApprovalActionPill;
