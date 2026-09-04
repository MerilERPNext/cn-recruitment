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
        isChecked ? "border-primary bg-primary/20" : "border-border bg-card"
      } shadow-sm hover:border-border/80 transition-all ${onToggleCheck ? "cursor-pointer" : ""}`}
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
                className="h-4 w-4 rounded border-border text-primary accent-primary focus:ring-primary cursor-pointer"
              />
            </div>
          )}

          <Avatar
            name={empGroup.employee_name}
            fontSize="text-xs"
            size="h-9 w-9"
            avatarBgColor="bg-blue-500/20"
            avatarTextColor="text-primary"
          />

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Typography variant="bodySmall" className="font-bold">
                {empGroup.employee_name}
              </Typography>
              {empGroup.goal_plan && (
                <span className="text-xs font-semibold text-text-body2 bg-slate-500/10 px-2 py-0.5 rounded">
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
            <Typography variant="caption" color="body2" className="mt-0.5 block">
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

