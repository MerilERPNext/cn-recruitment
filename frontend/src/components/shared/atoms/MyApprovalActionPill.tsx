"use client";

import { RotateCcw, SquarePen } from "lucide-react";
import Tooltip from "../Tooltip";
import { JSX } from "react";

type MyApprovalActionPillProps = {
  canRevoke: boolean;
  canEdit: boolean;
  isPending: boolean;
  onRevoke: () => void;
  onEdit: () => void;
  revokeLoading?: boolean;
};

type ActionItem = {
  key: "revoke" | "edit";
  tooltip: string;
  icon: JSX.Element;
  onClick: () => void;
  loading?: boolean;
};

const MyApprovalActionPill = ({
  canRevoke,
  canEdit,
  isPending,
  onRevoke,
  onEdit,
  revokeLoading = false,
}: MyApprovalActionPillProps) => {
  const hasActions = isPending && (canRevoke || canEdit);

  if (!hasActions) {
    return (
      <div
        className="
          h-8
          px-3
          flex items-center justify-center
          rounded-3xl
          bg-gray-10
          text-gray-600
          text-xs
          font-medium
          w-fit
        "
      >
        NA
      </div>
    );
  }

  /* ✅ BUILD ACTION LIST (JUST LIKE TEAM UTILITY) */
  const actions: ActionItem[] = [];

  if (canRevoke) {
    actions.push({
      key: "revoke",
      tooltip: "Revoke",
      loading: revokeLoading,
      onClick: onRevoke,
      icon: <RotateCcw className="w-4 h-4 text-warning" />,
    });
  }

  if (canEdit) {
    actions.push({
      key: "edit",
      tooltip: "Edit",
      onClick: onEdit,
      icon: <SquarePen className="w-4 h-4 text-primary" />,
    });
  }

  return (
    <div
      className="
        h-8
        flex items-center
        gap-1
        px-3
        py-1
        rounded-3xl
        bg-gray-10
        w-fit
      "
    >
      {actions.map((action, index) => (
        <div key={action.key} className="flex items-center gap-2">
          <Tooltip content={action.tooltip} position="top">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                action.onClick();
              }}
              disabled={action.loading}
              className="flex items-center justify-center"
            >
              {action.loading ? (
                <span className="w-4 h-4 border border-gray-400 border-t-transparent rounded-3xl animate-spin" />
              ) : (
                action.icon
              )}
            </button>
          </Tooltip>

          {/* ✅ DIVIDER — SAME LOGIC AS TEAM UTILITY */}
          {index < actions.length - 1 && (
            <span className="w-px h-4 bg-gray-300" />
          )}
        </div>
      ))}
    </div>
  );
};

export default MyApprovalActionPill;
