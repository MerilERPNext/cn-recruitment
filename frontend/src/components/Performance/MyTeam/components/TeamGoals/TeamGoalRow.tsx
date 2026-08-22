import React from "react";
import { CornerDownRight } from "lucide-react";
import { Typography } from "../../../../shared/atoms/Typography";
import Badge, { type BadgeVariant } from "../../../../shared/Badge";
import type { TeamGoalItem } from "../../../../../types/goal";
import type { SelectedGoalDetail } from "./TeamGoalDetailModal";

const getHealthBadgeVariant = (tone?: string, health?: string): BadgeVariant => {
  if (tone === "danger" || health === "off_track") return "danger";
  if (tone === "warning" || health === "at_risk") return "warning";
  if (tone === "success" || health === "on_track") return "success";
  return "default";
};

const getHealthBarColor = (tone?: string, health?: string): string => {
  if (tone === "danger" || health === "off_track") return "bg-red-500";
  if (tone === "warning" || health === "at_risk") return "bg-amber-500";
  return "bg-blue-500";
};

interface TeamGoalRowProps {
  goal: TeamGoalItem;
  employeeName: string;
  employeeInitials: string;
  designation?: string;
  isCompact: boolean;
  onSelect: (selected: SelectedGoalDetail) => void;
}

export const TeamGoalRow: React.FC<TeamGoalRowProps> = React.memo(({
  goal,
  employeeName,
  employeeInitials,
  designation,
  isCompact,
  onSelect,
}) => {
  const handleClick = () => {
    onSelect({
      ...goal,
      employeeName,
      employeeInitials,
      designation,
    });
  };

  return (
    <div
      onClick={handleClick}
      className={`grid cursor-pointer gap-3 transition-colors hover:bg-slate-50 ${
        isCompact
          ? "grid-cols-1 rounded-lg border border-slate-100 bg-white p-3 shadow-sm hover:border-slate-200"
          : "grid-cols-[minmax(0,1fr)_280px] items-center py-3"
      }`}
    >
      {isCompact ? (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <Badge
                label={goal.methodology || "OKR"}
                variant="purple"
                size="sm"
              />
            </div>
            <Badge
              label={goal.health_label || goal.health || "-"}
              variant={getHealthBadgeVariant(goal.health_tone, goal.health)}
              size="sm"
            />
          </div>

          <div className="min-w-0 pl-5">
            <Typography
              variant="bodySmall"
              className="font-semibold text-slate-900 break-words text-xs leading-snug sm:text-sm"
            >
              {goal.title ?? "-"}
            </Typography>
            {goal.description && (
              <Typography
                variant="caption"
                className="mt-1 block text-slate-500 break-words text-[11px] leading-normal"
              >
                {goal.description}
              </Typography>
            )}
          </div>

          <div className="flex flex-col gap-1 pl-5 pt-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                {goal.achievement ?? 0}%
              </span>
              {goal.expected_progress !== undefined &&
                goal.expected_progress !== null && (
                  <span className="text-[11px] font-medium text-slate-500">
                    Expected: {goal.expected_progress}%
                  </span>
                )}
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-md bg-slate-200">
              {goal.expected_progress !== undefined &&
                goal.expected_progress !== null && (
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-slate-300/70 rounded-md"
                    style={{
                      width: `${Math.min(100, Math.max(0, goal.expected_progress))}%`,
                    }}
                    title={`Expected: ${goal.expected_progress}%`}
                  />
                )}
              <div
                className={`relative h-full rounded-md ${getHealthBarColor(
                  goal.health_tone,
                  goal.health
                )}`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, goal.achievement || 0)
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex min-w-0 items-start gap-3">
            <CornerDownRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
            <Badge
              label={goal.methodology || "OKR"}
              variant="purple"
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <Typography
                variant="bodySmall"
                className="min-w-0 font-medium text-slate-900 truncate"
              >
                {goal.title ?? "-"}
              </Typography>
              {goal.description && (
                <Typography
                  variant="caption"
                  className="mt-0.5 block min-w-0 text-slate-500 truncate"
                >
                  {goal.description}
                </Typography>
              )}
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex flex-1 flex-col gap-1 min-w-[120px]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  {goal.achievement ?? 0}%
                </span>
                {goal.expected_progress !== undefined &&
                  goal.expected_progress !== null && (
                    <span className="text-[11px] font-medium text-slate-500">
                      Expected: {goal.expected_progress}%
                    </span>
                  )}
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-md bg-slate-200">
                {goal.expected_progress !== undefined &&
                  goal.expected_progress !== null && (
                    <div
                      className="absolute top-0 bottom-0 left-0 bg-slate-300/70 rounded-md"
                      style={{
                        width: `${Math.min(100, Math.max(0, goal.expected_progress))}%`,
                      }}
                      title={`Expected: ${goal.expected_progress}%`}
                    />
                  )}
                <div
                  className={`relative h-full rounded-md ${getHealthBarColor(
                    goal.health_tone,
                    goal.health
                  )}`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, goal.achievement || 0)
                    )}%`,
                  }}
                />
              </div>
            </div>
            <Badge
              label={goal.health_label || goal.health || "-"}
              variant={getHealthBadgeVariant(goal.health_tone, goal.health)}
              size="sm"
            />
          </div>
        </>
      )}
    </div>
  );
});

TeamGoalRow.displayName = "TeamGoalRow";

export default TeamGoalRow;
