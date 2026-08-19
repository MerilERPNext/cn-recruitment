import React, { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { ChevronDown, MessageSquare } from "lucide-react";
import { Typography } from "../../../shared/atoms/Typography";
import { Card } from "../../../shared/atoms/Card";
import Badge, { type BadgeVariant } from "../../../shared/Badge";
import Button from "../../../shared/atoms/Button";
import type { MyGoalsGoal, MyGoalsKeyResult } from "../../../../types/goal";
import { GoalCommentModal } from "./GoalCommentModal";

const getStatusVariant = (status?: string): BadgeVariant => {
  if (!status) return "default";
  const s = status.toLowerCase();
  if (s === "approved" || s === "completed" || s === "on track") return "success";
  if (s === "pending" || s === "at risk" || s === "draft" || s === "in progress") return "warning";
  if (s === "rejected" || s === "off-track" || s === "cancelled") return "danger";
  return "info";
};

export interface KeyResultCardItemProps {
  kr: MyGoalsKeyResult;
  index: number;
  className?: string;
}

export const KeyResultCardItem: React.FC<KeyResultCardItemProps> = React.memo(
  ({ kr, index, className = "" }) => {
    const achievement = Math.min(
      100,
      Math.max(0, Number(kr.achievement) || 0)
    );
    const krStatus = kr.goal_status || kr.status;

    return (
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50/80 border border-slate-100 rounded-lg ${className}`}
      >
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <Badge label={`KR ${index + 1}`} variant="purple" size="sm" />
            {krStatus && (
              <Badge label={krStatus} variant={getStatusVariant(krStatus)} size="sm" />
            )}
            <Typography variant="bodySmall" className="font-semibold text-gray-800 break-words min-w-0 leading-snug">
              {kr.title || "-"}
            </Typography>
          </div>
          <span className="text-[11px] text-gray-500 font-medium block mt-0.5">
            Last check in - {kr.last_checkin_date ?? "No date found!"}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          <div className="w-28 sm:w-36 bg-gray-200 rounded-md h-2 overflow-hidden">
            <div
              className={`h-2 rounded-md transition-all duration-300 ${
                achievement >= 75 ? "bg-green-500" : achievement >= 50 ? "bg-yellow-500" : "bg-blue-500"
              }`}
              style={{ width: `${Math.min(achievement, 100)}%` }}
            />
          </div>
          <Typography variant="caption" className="font-bold text-gray-700 w-9 text-right">
            {achievement}%
          </Typography>
        </div>
      </div>
    );
  }
);

KeyResultCardItem.displayName = "KeyResultCardItem";

interface EmployeeGoalCardProps {
  goal: MyGoalsGoal;
  isGoalPending: boolean;
  onRequestCheckIn: (goalIdentifier: string) => void;
  employeeId?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const EmployeeGoalCard = React.memo(({
  goal,
  isGoalPending,
  onRequestCheckIn,
  employeeId,
  isExpanded: externalIsExpanded,
  onToggleExpand,
}: EmployeeGoalCardProps) => {
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;

  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalIsExpanded((prev) => !prev);
    }
  };

  const goalIdentifier = goal?.goal_key || goal?.goal || goal?.name || "";
  const currentStatus = goal?.goal_status || goal?.status;
  const statusLower = (currentStatus || "").toLowerCase();
  const isPendingStatus = statusLower === "pending" || statusLower === "draft";
  const keyResults = goal?.key_results ?? [];
  const handleCloseCommentModal = useCallback(() => {
    setIsCommentModalOpen(false);
  }, []);

  return (
    <>
      <Card onClick={handleToggle} className="p-3.5 cursor-pointer sm:p-5 border border-gray-100 hover:border-blue-200 transition-all bg-white group overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-6">
          <div className="min-w-0 space-y-2 flex-1 w-full">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <Badge label={goal?.goal_type || "-"} variant="purple" size="sm" />
              <Badge label={currentStatus ?? "-"} variant={getStatusVariant(currentStatus)} size="sm" />
              {goal?.weightage !== undefined && (
                <Badge label={`${goal.weightage}%`} variant="info" size="sm" />
              )}
            </div>
            <div className="min-w-0">
              <Typography
                variant="body"
                className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors mb-1 text-sm sm:text-base break-words leading-snug"
              >
                {goal?.title}
              </Typography>
              {goal.description && (
                <Typography
                  variant="bodySmall"
                  className="text-gray-500 text-xs sm:text-sm break-words leading-relaxed mt-0.5"
                >
                  {goal.description}
                </Typography>
              )}
              <span className="text-xs text-gray-500 font-medium inline-block mt-1">
                Last check in - {goal?.last_checkin_date ?? "No date found!"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end shrink-0 w-full sm:w-auto gap-2 pt-1 sm:pt-0">
           
            <Button
              variant="subtle"
              bgColor="primary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsCommentModalOpen(true);
              }}
              className="font-medium text-xs px-3.5 py-1.5 rounded-lg border border-blue-100 text-blue-700 bg-blue-50/80 hover:bg-blue-100 hover:border-blue-200 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              Comment
            </Button>
            <Button
              variant="outline"
              disabled={isGoalPending}
              className={`font-medium text-xs px-3.5 py-1.5 rounded-lg transition-all shadow-xs flex items-center gap-1.5 ${
                isPendingStatus
                  ? "border-gray-200 text-gray-400 bg-gray-50 opacity-60 cursor-not-allowed"
                  : "border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 disabled:opacity-60 disabled:cursor-not-allowed"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (isPendingStatus) {
                  toast.error("Check-ins can be requested only on approved goals.");
                  return;
                }
                onRequestCheckIn(goalIdentifier);
              }}
            >
              {isGoalPending ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
                  Requesting Check in...
                </>
              ) : (
                "Request Check in"
              )}
            </Button>

            <button
              type="button"
              onClick={handleToggle}
              className="p-1.5 rounded-full border border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-500 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
              aria-label={isExpanded ? "Collapse Key Results" : "Expand Key Results"}
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isExpanded ? "rotate-180 text-blue-600" : ""
                }`}
              />
            </button>
          </div>
        </div>

        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
            isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="pt-3.5 mt-3 border-t border-gray-100 space-y-2">
              {keyResults.length > 0 ? (
                keyResults.map((kr: MyGoalsKeyResult, idx: number) => (
                  <KeyResultCardItem
                    key={kr.goal_key || kr.title || idx}
                    kr={kr}
                    index={idx}
                  />
                ))
              ) : (
                <div className="p-3 text-center text-xs sm:text-sm text-gray-500 font-medium bg-slate-50/80 border border-slate-100 rounded-lg">
                  No key result found
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {isCommentModalOpen && (
        <GoalCommentModal
          isOpen={isCommentModalOpen}
          onClose={handleCloseCommentModal}
          employeeId={employeeId}
          goal={goalIdentifier}
        />
      )}
    </>
  );
});

EmployeeGoalCard.displayName = "EmployeeGoalCard";
