import React from "react";
import { AlertCircle, Check, Eye, Undo2, X } from "lucide-react";
import { useScreenSize } from "../../../../../hooks/useScreenSize";
import { Typography } from "../../../../shared/atoms/Typography";
import Badge from "../../../../shared/Badge";
import Avatar from "../../../../shared/Avatar";
import type { ApprovalQueueItem } from "../../../../../types/goal";

export const APPROVAL_TABLE_TITLES = [
  "",
  "Goal & Employee",
  "Weightage",
  "Status",
  "Send Back",
  "Action",
];

export const APPROVAL_TABLE_COLUMN_WIDTHS = [
  "minmax(40px, 0.3fr)",
  "minmax(320px, 2.5fr)",
  "minmax(120px, 1fr)",
  "minmax(120px, 1fr)",
  "minmax(100px, 0.7fr)",
  "minmax(130px, 0.9fr)",
];

interface GoalApprovalItemProps {
  goal: ApprovalQueueItem;
  checked: boolean;
  onToggleCheck: () => void;
  onClick: () => void;
}

/** Reusable icon-button action bar for approval queue items (View, Approve, Reject based on goal.actions) */
const ApprovalActionButton = ({ goal, onClick }: { goal: ApprovalQueueItem; onClick: () => void }) => {
  const actions: string[] = goal.actions || [];
  const canView = actions.length === 0 || actions.includes("view");
  const canApprove = actions.includes("approve");
  const canReject = actions.includes("reject");

  return (
    <div className="flex items-center justify-center gap-1.5">
      {canView && (
        <button
          type="button"
          title="View Goal"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
        >
          <Eye className="h-4 w-4" />
        </button>
      )}
      {canApprove && (
        <button
          type="button"
          title="Approve Goal"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-600 text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
        >
          <Check className="h-4 w-4" />
        </button>
      )}
      {canReject && (
        <button
          type="button"
          title="Reject Goal"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-red-500 text-white shadow-sm transition-all hover:bg-red-600 active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

/** Send Back icon button — rendered in its own column conditionally based on goal.actions */
const SendBackButton = ({ goal }: { goal: ApprovalQueueItem }) => {
  const actions: string[] = goal.actions || [];
  const canSendBack = actions.includes("send_back");

  if (!canSendBack) {
    return (
      <div className="flex items-center justify-center text-slate-300 text-xs">—</div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <button
        type="button"
        title="Send Back"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 active:scale-95"
      >
        <Undo2 className="h-4 w-4" />
      </button>
    </div>
  );
};

export const GoalApprovalItem: React.FC<GoalApprovalItemProps> = ({
  goal,
  checked,
  onToggleCheck,
  onClick,
}) => {
  const { isDesktop } = useScreenSize();

  const empName = goal.employee_name || goal.employee || "Employee";
  const methodology = goal.methodology || "OKR";
  const submittedAgo = goal.submitted_ago || "";
  const statusLabel = goal.status_label || "-";
  const flagWarning = goal.flags && goal.flags.length > 0 ? goal.flags[0].label : undefined;
  const statusTone = goal.status_tone;

  const getStatusVariant = () => {
    if (statusTone === "warning" || statusLabel.toLowerCase() === "draft") return "warning";
    if (statusTone === "danger") return "danger";
    return "success";
  };

  if (isDesktop) {
    return (
      <div
        onClick={onClick}
        className="grid gap-4 px-6 py-4 border-b border-gray-100 hover:bg-slate-50 transition-colors cursor-pointer items-center bg-white"
        style={{ gridTemplateColumns: APPROVAL_TABLE_COLUMN_WIDTHS.join(" ") }}
      >
        <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center">
          <input
            aria-label={`Select ${goal.title}`}
            type="checkbox"
            checked={checked}
            onChange={onToggleCheck}
            className="h-4 w-4 rounded border-gray-300 text-blue-500 accent-blue-500 focus:ring-blue-500 cursor-pointer"
          />
        </div>

        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge label={methodology} variant="purple" size="sm" />
            <Avatar
              name={empName}
              fontSize="text-xs"
              size="h-8 w-8"
              avatarBgColor="bg-blue-50"
              avatarTextColor="text-blue-600"
            />
            <Typography variant="caption" className="text-gray-600">
              {empName}
            </Typography>
            {flagWarning && (
              <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                <AlertCircle className="h-3 w-3" />
                {flagWarning}
              </span>
            )}
          </div>
          <Typography variant="bodySmall" className="font-semibold text-gray-900 truncate">
            {goal.title}
          </Typography>
          {submittedAgo && (
            <Typography variant="caption" className="text-gray-500">
              Submitted {submittedAgo}
            </Typography>
          )}
        </div>

        <div className="text-center">
          <Typography
            variant="bodySmall"
            className={`font-bold ${goal.weightage > 30 ? "text-red-600" : "text-gray-900"}`}
          >
            {goal.weightage}%
          </Typography>
        </div>

        <div className="flex justify-center">
          <Badge
            label={statusLabel}
            variant={getStatusVariant()}
            size="sm"
          />
        </div>

        <SendBackButton goal={goal} />

        <div className="whitespace-nowrap text-center">
          <div className="flex justify-center">
            <ApprovalActionButton goal={goal} onClick={onClick} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <article
      onClick={onClick}
      className="border border-slate-200 bg-white rounded-xl p-4 shadow-sm space-y-3 cursor-pointer hover:border-slate-300 transition-colors mb-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0" onClick={(e) => e.stopPropagation()}>
          <input
            aria-label={`Select ${goal.title}`}
            type="checkbox"
            checked={checked}
            onChange={onToggleCheck}
            className="h-4 w-4 rounded border-gray-300 text-blue-500 accent-blue-500 focus:ring-blue-500 cursor-pointer"
          />
          <Avatar
            name={empName}
            fontSize="text-xs"
            size="h-7 w-7"
            avatarBgColor="bg-blue-50"
            avatarTextColor="text-blue-600"
          />
          <Typography variant="bodySmall" className="font-semibold text-slate-900 truncate">
            {empName}
          </Typography>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge label={methodology} variant="purple" size="sm" />
          <Badge
            label={statusLabel}
            variant={getStatusVariant()}
            size="sm"
          />
        </div>
      </div>

      <div>
        <Typography variant="bodySmall" className="font-bold text-slate-900 break-words mb-1">
          {goal.title}
        </Typography>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          {submittedAgo && <span>Submitted {submittedAgo}</span>}
          <span className="font-semibold text-slate-700">
            Weightage:{" "}
            <span className={goal.weightage > 30 ? "text-red-600 font-bold" : "text-slate-900"}>
              {goal.weightage}%
            </span>
          </span>
        </div>
        {flagWarning && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600">
            <AlertCircle className="h-3.5 w-3.5" />
            {flagWarning}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
        <SendBackButton goal={goal} />
        <ApprovalActionButton goal={goal} onClick={onClick} />
      </div>
    </article>
  );
};

export default GoalApprovalItem;
