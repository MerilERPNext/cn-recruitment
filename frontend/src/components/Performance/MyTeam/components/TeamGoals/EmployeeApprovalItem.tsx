import React, { memo } from "react";
import { Check, ChevronRight, Undo2, X } from "lucide-react";
import Button from "../../../../shared/atoms/Button";
import CardTable from "../../../../shared/CardTable";
import { Typography } from "../../../../shared/atoms/Typography";
import Avatar from "../../../../shared/Avatar";
import Badge from "../../../../shared/Badge";
import type { ApprovalQueueByEmployee, ApprovalQueueItem } from "../../../../../types/goal";
import {
  GoalApprovalItem,
  APPROVAL_TABLE_TITLES,
  APPROVAL_TABLE_COLUMN_WIDTHS,
} from "./GoalApprovalItem";

interface EmployeeApprovalItemProps {
  empGroup: ApprovalQueueByEmployee;
  queueItems: ApprovalQueueItem[];
  isExpanded: boolean;
  onToggleExpand: (empId: string) => void;
  checkedGoals: Set<string>;
  onToggleCheck: (id: string) => void;
  onGoalClick: (goal: ApprovalQueueItem) => void;
  isCompact: boolean;
}

export const EmployeeApprovalItem: React.FC<EmployeeApprovalItemProps> = memo(({
  empGroup,
  queueItems,
  isExpanded,
  onToggleExpand,
  checkedGoals,
  onToggleCheck,
  onGoalClick,
  isCompact,
}) => {
  const empGoals = queueItems.filter((q) => q.employee === empGroup.employee);
  const displayGoals = empGoals.length > 0 ? empGoals : [];
  const empActions = empGroup.actions || [];
  const canApprovePlan = empActions.includes("approve_plan");
  const canRejectPlan = empActions.includes("reject_plan");
  const canSendBackPlan = empActions.includes("send_back_plan");

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-all">
      {/* Employee Header (Click to Toggle Smoothly) */}
      <div
        onClick={() => onToggleExpand(empGroup.employee)}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white hover:bg-slate-50/80 transition-colors cursor-pointer"
      >
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-label="Toggle goals dropdown"
            className="text-slate-500 hover:text-slate-800 transition-colors shrink-0"
          >
            <ChevronRight
              className={`h-5 w-5 text-slate-500 transition-transform duration-300 ease-in-out ${
                isExpanded ? "rotate-90 text-slate-900" : "rotate-0"
              }`}
            />
          </button>

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

        {/* Plan Level Action Buttons */}
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {canSendBackPlan && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-amber-300 text-amber-800 hover:bg-amber-50"
            >
              <Undo2 className="h-3.5 w-3.5 mr-1 text-amber-600" />
              Send Back Plan
            </Button>
          )}
          {canRejectPlan && (
            <Button
              type="button"
              variant="outline"
              bgColor="error"
              size="sm"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Reject Plan
            </Button>
          )}
          {canApprovePlan && (
            <Button
              type="button"
              variant="contain"
              bgColor="success"
              size="sm"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Approve Plan
            </Button>
          )}
        </div>
      </div>

      {/* Animated Accordion Content */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-3 bg-slate-50/40 border-t border-slate-200">
            {isCompact ? (
              <div className="space-y-3">
                {displayGoals.map((item: ApprovalQueueItem) => {
                  const itemId = item.goal || item.goal_key || item.employee;
                  return (
                    <GoalApprovalItem
                      key={itemId}
                      goal={item}
                      checked={checkedGoals.has(itemId)}
                      onToggleCheck={() => onToggleCheck(itemId)}
                      onClick={() => onGoalClick(item)}
                    />
                  );
                })}
              </div>
            ) : (
              <CardTable
                titles={APPROVAL_TABLE_TITLES}
                columnWidths={APPROVAL_TABLE_COLUMN_WIDTHS}
              >
                <div className="w-full">
                  {displayGoals.map((item: ApprovalQueueItem) => {
                    const itemId = item.goal || item.goal_key || item.employee;
                    return (
                      <GoalApprovalItem
                        key={itemId}
                        goal={item}
                        checked={checkedGoals.has(itemId)}
                        onToggleCheck={() => onToggleCheck(itemId)}
                        onClick={() => onGoalClick(item)}
                      />
                    );
                  })}
                </div>
              </CardTable>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

EmployeeApprovalItem.displayName = "EmployeeApprovalItem";

export default EmployeeApprovalItem;
