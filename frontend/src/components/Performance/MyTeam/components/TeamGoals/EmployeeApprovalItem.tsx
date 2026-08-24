import React, { memo } from "react";
import { Check, Undo2, X } from "lucide-react";
import Button from "../../../../shared/atoms/Button";
import { Typography } from "../../../../shared/atoms/Typography";
import Avatar from "../../../../shared/Avatar";
import Badge from "../../../../shared/Badge";
import type { ApprovalQueueByEmployee, ApprovalQueueItem } from "../../../../../types/goal";

interface EmployeeApprovalItemProps {
  empGroup: ApprovalQueueByEmployee;
  queueItems?: ApprovalQueueItem[];
  isExpanded?: boolean;
  onToggleExpand?: (empId: string) => void;
  checkedGoals?: Set<string>;
  onToggleCheck?: (id: string) => void;
  onGoalClick?: (goal: ApprovalQueueItem) => void;
  isCompact?: boolean;
}

export const EmployeeApprovalItem: React.FC<EmployeeApprovalItemProps> = memo(({
  empGroup,
}) => {
  const empActions = empGroup.actions || [];
  const canApprovePlan = empActions.includes("approve_plan");
  const canRejectPlan = empActions.includes("reject_plan");
  const canSendBackPlan = empActions.includes("send_back_plan");
  const hasAnyPlanAction = canApprovePlan || canRejectPlan || canSendBackPlan;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white transition-colors">
        <div className="flex flex-wrap items-center gap-3">
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

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
          {canSendBackPlan && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-amber-300 text-amber-800 bg-amber-50/50 hover:bg-amber-100/80 active:bg-amber-200 text-xs px-2 sm:px-3"
            >
              <Undo2 className="h-3.5 w-3.5 mr-1 shrink-0 text-amber-600" />
              <span>Send Back<span className="hidden sm:inline"> Plan</span></span>
            </Button>
          )}
          {canRejectPlan && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-red-300 text-red-700 bg-red-50/50 hover:bg-red-100/80 active:bg-red-200 text-xs px-2 sm:px-3"
            >
              <X className="h-3.5 w-3.5 mr-1 shrink-0 text-red-600" />
              <span>Reject<span className="hidden sm:inline"> Plan</span></span>
            </Button>
          )}
          {canApprovePlan && (
            <Button
              type="button"
              variant="contain"
              size="sm"
              className="border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-xs text-xs px-2 sm:px-3"
            >
              <Check className="h-3.5 w-3.5 mr-1 shrink-0 text-white" />
              <span>Approve<span className="hidden sm:inline"> Plan</span></span>
            </Button>
          )}
          {!hasAnyPlanAction && (
            <span className="text-xs font-medium text-slate-400 bg-slate-100/80 border border-slate-200/60 px-2.5 py-1 rounded-md">
              No action
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

EmployeeApprovalItem.displayName = "EmployeeApprovalItem";

export default EmployeeApprovalItem;

