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
  "Auto Approve On",
  "Action",
];

export const APPROVAL_TABLE_COLUMN_WIDTHS = [
  "minmax(40px, 0.3fr)",
  "minmax(280px, 3.5fr)",
  "minmax(120px, 1.2fr)",
  "minmax(110px, 1fr)",
  "minmax(130px, 1.1fr)",
  "minmax(130px, 1.1fr)",
];

interface GoalApprovalItemProps {
  goal: ApprovalQueueItem;
  checked: boolean;
  onToggleCheck: () => void;
  onClick: () => void;
}

const getFlagStyles = (tone?: string) => {
  switch (tone) {
    case "danger":
      return "bg-red-50 text-red-600 border-red-200";
    case "warning":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "info":
      return "bg-blue-50 text-blue-600 border-blue-200";
    case "success":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
};

const getWeightageColor = (weightage: number) => {
  if (weightage > 30) return "bg-red-500";
  if (weightage >= 20) return "bg-blue-500";
  return "bg-indigo-500";
};

/** Reusable icon-button action bar for approval queue items (View, Approve, Reject, Send Back based on goal.actions) */
const ApprovalActionButton = ({ goal, onClick }: { goal: ApprovalQueueItem; onClick: () => void }) => {
  const actions: string[] = goal.actions || [];
  const canView = actions.length === 0 || actions.includes("view");
  const canApprove = actions.includes("approve");
  const canReject = actions.includes("reject");
  const canSendBack = actions.includes("send_back");

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
      {canSendBack && (
        <button
          type="button"
          title="Send Back"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 active:scale-95"
        >
          <Undo2 className="h-4 w-4" />
        </button>
      )}
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
  const initials = goal.initials;
  const methodology = goal.methodology || "OKR";
  const submittedAgo = goal.submitted_ago || "-";
  const submittedOn = goal.submitted_on || "-";
  const autoApproveOn = goal.auto_approve_on || "-";
  const statusLabel = goal.status_label || "-";
  const flags = goal.flags || [];
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
            <Typography variant="caption" className="text-gray-600 font-medium">
              {empName} 
            </Typography>
            {flags.map((flag) => (
              <span
                key={flag.key || flag.label}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${getFlagStyles(flag.tone)}`}
              >
                <AlertCircle className="h-3 w-3 shrink-0" />
                {flag.label}
              </span>
            ))}
          </div>
          <Typography variant="bodySmall" className="font-semibold text-gray-900 truncate">
            {goal.title}
          </Typography>
          {(submittedAgo || (submittedOn && submittedOn !== "-")) && (
            <Typography variant="caption" className="text-gray-500 block truncate mt-0.5">
              Submitted {submittedAgo ? submittedAgo : ""}{submittedAgo && submittedOn && submittedOn !== "-" ? " • " : ""}{submittedOn && submittedOn !== "-" ? submittedOn : ""}
            </Typography>
          )}
        </div>

        <div className="flex flex-col items-center justify-center">
          <Typography
            variant="bodySmall"
            className={`font-bold ${goal.weightage > 30 ? "text-red-600" : "text-gray-900"}`}
          >
            {goal.weightage}%
          </Typography>
          <div className="mt-1 flex items-center w-24">
            <div className="h-2 flex-1 overflow-hidden rounded-md bg-gray-100">
              <div
                className={`h-full rounded-md ${getWeightageColor(goal.weightage)}`}
                style={{ width: `${Math.min(100, Math.max(0, goal.weightage))}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <Badge
            label={statusLabel}
            variant={getStatusVariant()}
            size="sm"
          />
        </div>

        <div className="text-center whitespace-nowrap">
          {autoApproveOn && autoApproveOn !== "-" ? (
            <Typography variant="caption" className="font-medium text-slate-600">
              {autoApproveOn}
            </Typography>
          ) : (
            <Typography variant="caption" className="text-gray-400">—</Typography>
          )}
        </div>

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
            {empName} {initials ? `(${initials})` : ""}
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
          {(submittedAgo || (submittedOn && submittedOn !== "-")) && (
            <span>Submitted {submittedAgo ? submittedAgo : ""}{submittedAgo && submittedOn && submittedOn !== "-" ? " • " : ""}{submittedOn && submittedOn !== "-" ? submittedOn : ""}</span>
          )}
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            Weightage:{" "}
            <span className={goal.weightage > 30 ? "text-red-600 font-bold" : "text-slate-900"}>
              {goal.weightage}%
            </span>
            <span className="inline-block h-1.5 w-16 overflow-hidden rounded-md bg-gray-100">
              <span
                className={`block h-full rounded-md ${getWeightageColor(goal.weightage)}`}
                style={{ width: `${Math.min(100, Math.max(0, goal.weightage))}%` }}
              />
            </span>
          </span>
        </div>
        {autoApproveOn && autoApproveOn !== "-" && (
          <div className="mt-1 text-xs text-slate-500 font-medium">
            Auto Approve On: <span className="text-slate-700 font-medium">{autoApproveOn}</span>
          </div>
        )}
        {flags.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {flags.map((flag) => (
              <span
                key={flag.key || flag.label}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${getFlagStyles(flag.tone)}`}
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {flag.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
        <ApprovalActionButton goal={goal} onClick={onClick} />
      </div>
    </article>
  );
};

export default GoalApprovalItem;
