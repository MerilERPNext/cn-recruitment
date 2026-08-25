import React, { memo } from "react";
import { Typography } from "../../../../shared/atoms/Typography";
import Avatar from "../../../../shared/Avatar";
import Badge from "../../../../shared/Badge";
import type { ApprovalQueueByEmployee, ApprovalQueueItem } from "../../../../../types/goal";
import { GoalActionButtons } from "./GoalActionButtons";

interface EmployeeApprovalItemProps {
  empGroup: ApprovalQueueByEmployee;
  queueItems?: ApprovalQueueItem[];
  isExpanded?: boolean;
  onToggleExpand?: (empId: string) => void;
  checked?: boolean;
  checkedGoals?: Set<string>;
  onToggleCheck?: (id: string) => void;
  onGoalClick?: (goal: ApprovalQueueItem) => void;
  isCompact?: boolean;
}

export const EmployeeApprovalItem: React.FC<EmployeeApprovalItemProps> = memo(({
  empGroup,
  checked,
  checkedGoals,
  onToggleCheck,
}) => {
  const isChecked = checked || Boolean(checkedGoals?.has(empGroup.employee));

  const handleToggle = () => {
    if (onToggleCheck) {
      onToggleCheck(empGroup.employee);
    }
  };

  return (
    <div
      onClick={handleToggle}
      className={`overflow-hidden rounded-xl border ${
        isChecked ? "border-blue-400 bg-blue-50/20" : "border-slate-200 bg-white"
      } shadow-sm hover:border-slate-300 transition-all ${onToggleCheck ? "cursor-pointer" : ""}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition-colors">
        <div className="flex flex-wrap items-center gap-3">
          {onToggleCheck && (
            <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center">
              <input
                aria-label={`Select ${empGroup.employee_name}`}
                type="checkbox"
                checked={isChecked}
                onChange={handleToggle}
                className="h-4 w-4 rounded border-gray-300 text-blue-500 accent-blue-500 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          )}

          <Avatar
            name={empGroup.employee_name}
            fontSize="text-xs"
            size="h-9 w-9"
            avatarBgColor="bg-blue-100"
            avatarTextColor="text-blue-700"
          />

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Typography variant="bodySmall" className="font-bold text-slate-900">
                {empGroup.employee_name}
              </Typography>
              {empGroup.goal_plan && (
                <span className="text-xs font-semibold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                  {empGroup.goal_plan}
                </span>
              )}
              {empGroup.plan_status && (
                <Badge
                  label={empGroup.plan_status}
                  variant={empGroup.plan_status.toLowerCase() === "approved" ? "success" : "warning"}
                  size="sm"
                />
              )}
            </div>
            <Typography variant="caption" className="text-slate-500 mt-0.5 block">
              {empGroup.goals} goal(s) · {empGroup.submitted_total}% total weightage submitted
            </Typography>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <GoalActionButtons
            items={{ employee: empGroup.employee, goal_key: "" }}
            actions={empGroup.actions}
            isEntirePlan={true}
          />
        </div>
      </div>
    </div>
  );
});

EmployeeApprovalItem.displayName = "EmployeeApprovalItem";

export default EmployeeApprovalItem;

