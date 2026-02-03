"use client";

import { RotateCcw, SquarePen, Repeat1 } from "lucide-react";
import Tooltip from "../Tooltip";
import type { JSX } from "react";

type MyApprovalActionPillProps = {
  canRevoke?: boolean;
  canEdit?: boolean;
  canReplace?: boolean;
  isPending: boolean;

  onRevoke?: () => void;
  onEdit?: () => void;
  onReplace?: () => void;

  revokeLoading?: boolean;
};

type ActionItem = {
  key: "revoke" | "edit" | "replace";
  tooltip: string;
  icon: JSX.Element;
  onClick?: () => void;
  loading?: boolean;
};

const MyApprovalActionPill = ({
  canRevoke,
  canEdit,
  canReplace,
  onRevoke,
  onEdit,
  onReplace,
  revokeLoading = false,
}: MyApprovalActionPillProps) => {
  const hasActions = canRevoke || canEdit || canReplace;

  if (!hasActions) {
    return (
      <div className="h-8 px-3 flex items-center justify-center rounded-3xl bg-gray-10 text-gray-600 text-xs font-medium w-fit">
        NA
      </div>
    );
  }

  const actions: ActionItem[] = [];

  if (canRevoke && onRevoke) {
    actions.push({
      key: "revoke",
      tooltip: "Revoke",
      loading: revokeLoading,
      onClick: onRevoke,
      icon: <RotateCcw className="w-4 h-4 text-warning" />,
    });
  }

  if (canEdit && onEdit) {
    actions.push({
      key: "edit",
      tooltip: "Edit",
      onClick: onEdit,
      icon: <SquarePen className="w-4 h-4 text-primary" />,
    });
  }

  if (canReplace && onReplace) {
    actions.push({
      key: "replace",
      tooltip: "Replace",
      onClick: onReplace,
      icon: <Repeat1 className="w-4 h-4 text-info" />,
    });
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
