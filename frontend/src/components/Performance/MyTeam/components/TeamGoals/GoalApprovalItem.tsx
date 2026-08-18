import React from "react";
import { AlertCircle } from "lucide-react";
import { useScreenSize } from "../../../../../hooks/useScreenSize";
import Button from "../../../../shared/atoms/Button";
import { Typography } from "../../../../shared/atoms/Typography";
import Badge from "../../../../shared/Badge";
import Avatar from "../../../../shared/Avatar";

export const APPROVAL_TABLE_TITLES = [
  "",
  "Goal & Employee",
  "Weightage",
  "Status",
  "Actions",
];

export const APPROVAL_TABLE_COLUMN_WIDTHS = [
  "minmax(40px, 0.3fr)",
  "minmax(320px, 2.5fr)",
  "minmax(120px, 1fr)",
  "minmax(120px, 1fr)",
  "minmax(260px, 1.8fr)",
];


interface GoalApprovalItemProps {
  goal: any;
  checked: boolean;
  onToggleCheck: () => void;
  onClick: () => void;
}

export const GoalApprovalItem: React.FC<GoalApprovalItemProps> = ({
  goal,
  checked,
  onToggleCheck,
  onClick,
}) => {
  const { isDesktop } = useScreenSize();

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
            <Badge label={goal.type} variant="purple" size="sm" />
            <Avatar
              name={goal.employeeName}
              fontSize="text-xs"
              size="h-8 w-8"
              avatarBgColor="bg-blue-50"
              avatarTextColor="text-blue-600"
            />
            <Typography variant="caption" className="text-gray-600">
              {goal.employeeName}
            </Typography>
            {goal.warning && (
              <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                <AlertCircle className="h-3 w-3" />
                {goal.warning}
              </span>
            )}
          </div>
          <Typography variant="bodySmall" className="font-semibold text-gray-900 truncate">
            {goal.title}
          </Typography>
          <Typography variant="caption" className="text-gray-500">
            Submitted {goal.submittedAgo}
          </Typography>
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
            label={goal.status ?? "Submitted"}
            variant={(goal.status || "Submitted").toLowerCase() === "draft" ? "warning" : "success"}
            size="sm"
          />
        </div>

        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" bgColor="text" size="sm" className="bg-white px-2.5 text-xs">
            Send back
          </Button>
          <Button variant="outline" bgColor="error" size="sm" className="px-2.5 text-xs">
            Reject
          </Button>
          <Button variant="contain" bgColor="success" size="sm" className="px-2.5 text-xs" onClick={onClick}>
            Approve
          </Button>
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
            name={goal.employeeName}
            fontSize="text-xs"
            size="h-7 w-7"
            avatarBgColor="bg-blue-50"
            avatarTextColor="text-blue-600"
          />
          <Typography variant="bodySmall" className="font-semibold text-slate-900 truncate">
            {goal.employeeName}
          </Typography>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge label={goal.type} variant="purple" size="sm" />
          <Badge
            label={goal.status ?? "Submitted"}
            variant={(goal.status || "Submitted").toLowerCase() === "draft" ? "warning" : "success"}
            size="sm"
          />
        </div>
      </div>

      <div>
        <Typography variant="bodySmall" className="font-bold text-slate-900 break-words mb-1">
          {goal.title}
        </Typography>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>Submitted {goal.submittedAgo}</span>
          <span className="font-semibold text-slate-700">
            Weightage:{" "}
            <span className={goal.weightage > 30 ? "text-red-600 font-bold" : "text-slate-900"}>
              {goal.weightage}%
            </span>
          </span>
        </div>
        {goal.warning && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600">
            <AlertCircle className="h-3.5 w-3.5" />
            {goal.warning}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
        <Button variant="outline" bgColor="text" size="sm" className="flex-1 bg-white text-xs py-1.5">
          Send back
        </Button>
        <Button variant="outline" bgColor="error" size="sm" className="flex-1 text-xs py-1.5">
          Reject
        </Button>
        <Button variant="contain" bgColor="success" size="sm" className="flex-1 text-xs py-1.5" onClick={onClick}>
          Approve
        </Button>
      </div>
    </article>
  );
};

export default GoalApprovalItem;
