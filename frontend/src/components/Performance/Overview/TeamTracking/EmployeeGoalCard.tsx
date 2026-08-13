import React from "react";
import toast from "react-hot-toast";
import { Typography } from "../../../shared/atoms/Typography";
import { Card } from "../../../shared/atoms/Card";
import Badge, { type BadgeVariant } from "../../../shared/Badge";
import Button from "../../../shared/atoms/Button";
import type { MyGoalsGoal } from "../../../../types/goal";

const getStatusVariant = (status?: string): BadgeVariant => {
  if (!status) return "default";
  const s = status.toLowerCase();
  if (s === "approved" || s === "completed" || s === "on track") return "success";
  if (s === "pending" || s === "at risk" || s === "draft" || s === "in progress") return "warning";
  if (s === "rejected" || s === "off-track" || s === "cancelled") return "danger";
  return "info";
};

interface EmployeeGoalCardProps {
  goal: MyGoalsGoal;
  isGoalPending: boolean;
  onRequestCheckIn: (goalIdentifier: string) => void;
}

export const EmployeeGoalCard = React.memo(({ goal, isGoalPending, onRequestCheckIn }: EmployeeGoalCardProps) => {
  const goalIdentifier = goal?.goal_key || goal?.goal || goal?.name || "";
  const currentStatus = goal?.goal_status || goal?.status;
  const statusLower = (currentStatus || "").toLowerCase();
  const isPendingStatus = statusLower === "pending" || statusLower === "draft";

  return (
    <Card className="p-3.5 sm:p-5 border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all bg-white group">
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
        <div className="flex items-center justify-end sm:justify-center shrink-0 w-full sm:w-auto pt-1 sm:pt-0">
          <Button
            variant="outline"
            disabled={isGoalPending}
            className={`font-medium mx-auto text-xs px-3.5 py-1.5 rounded-lg transition-all shadow-xs flex items-center gap-1.5 ${
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
        </div>
      </div>
    </Card>
  );
});

EmployeeGoalCard.displayName = "EmployeeGoalCard";
