import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Info } from "lucide-react";
import { Typography } from "./atoms/Typography";
import Badge, { type BadgeVariant } from "./Badge";
import { useScreenSize } from "../../hooks/useScreenSize";
import type { Goal, GoalKeyResult, GoalStatus } from "../Performance/MyGoals/types";

const getStatusVariant = (status: GoalStatus): BadgeVariant => {
  if (status === "On-track") return "success";
  if (status === "At-risk") return "warning";
  if (status === "Off-track") return "danger";
  return "default";
};

export interface GoalCardProps {
  goal: Goal;
  index: number;
  isOpen?: boolean;
  onToggleOpen?: (index: number) => void;
  onSelectGoal?: (index: number) => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  index,
  isOpen,
  onToggleOpen,
  onSelectGoal,
}) => {
  const navigate = useNavigate();
  const { isMobile, isTablet, isDesktop } = useScreenSize();
  const isCompact = isMobile || isTablet;

  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isExpanded = isOpen !== undefined ? isOpen : internalIsOpen;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleOpen) {
      onToggleOpen(index);
    } else {
      setInternalIsOpen((prev) => !prev);
    }
  };

  const handleCardClick = () => {
    if (onSelectGoal) {
      onSelectGoal(index);
    } else {
      navigate(`/webapp/performance-app/my-goals/${index}`);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="relative z-10 min-w-0 cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
    >
      {!isCompact && (
        <div className="absolute left-[-28px] top-12 h-px w-[28px] bg-slate-200" />
      )}

      <div className="relative z-10 flex min-w-0 flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between lg:p-5">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:w-[104px] sm:flex-col sm:items-start sm:gap-1">
            <Badge label={goal.type} variant="purple" size="sm" />
            <Typography
              variant="caption"
              className="text-slate-500 sm:ml-1"
            >
              {goal.label}
            </Typography>
          </div>
          <div className="min-w-0 flex-1">
            <Typography
              variant="bodyMedium"
              className="mb-1 block break-words font-semibold leading-snug text-slate-950"
            >
              {goal.title}
            </Typography>
            <Typography
              variant="caption"
              className="block break-words leading-relaxed text-slate-500"
            >
              {goal.subtitle}
            </Typography>
          </div>
        </div>

        <div className="flex w-full min-w-0 shrink-0 flex-col gap-3 rounded-lg bg-slate-50 p-3 md:flex-row md:items-center md:justify-between lg:max-w-[400px] lg:bg-transparent lg:p-0">
          <div className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 lg:border-r lg:border-slate-100 lg:pr-5">
            <div className="min-w-0">
              <Typography
                variant="bodyMedium"
                className="block whitespace-nowrap font-bold text-slate-950"
              >
                {goal.current}{" "}
                <span className="font-normal text-slate-500">
                  / {goal.target}
                </span>
              </Typography>
              <Typography
                variant="caption"
                className="mt-0.5 block break-words text-slate-500"
              >
                {goal.unit}
              </Typography>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <Typography
                variant="caption"
                className="text-right text-slate-500"
              >
                {goal.percentage}% - {goal.weight}w
              </Typography>
              <div className="h-2 w-full overflow-hidden rounded-md bg-slate-200">
                <div
                  className={`h-2 rounded-md ${goal.barColor}`}
                  style={{ width: `${goal.percentage}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 md:flex-col md:items-end">
            <Badge
              label={goal.status}
              variant={getStatusVariant(goal.status)}
              size="sm"
              pulse={{ show: true }}
            />
            <Badge label={goal.state} variant="info" size="sm" />
          </div>
          <ChevronRight
            className={`h-5 w-5 border-gray-500 border rounded-full transition-transform duration-200 ${
              isExpanded ? "rotate-90" : ""
            }`}
            onClick={handleToggle}
          />
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="relative z-10 border-t border-slate-100 bg-slate-50/70 p-3 sm:p-4">
            {goal.krs && goal.krs.length > 0 ? (
              <div className="relative min-w-0 space-y-3 md:pl-8">
                {!isCompact && (
                  <div className="absolute bottom-4 left-[16px] top-[-16px] w-px bg-slate-200" />
                )}
                {goal.krs.map((kr: GoalKeyResult, kIdx: number) => (
                  <div
                    key={kIdx}
                    className="relative flex min-w-0 flex-col gap-2 rounded-lg border border-slate-100 bg-white p-3 lg:flex-row lg:items-center"
                  >
                    {!isCompact && (
                      <div className="absolute left-[-16px] top-[18px] h-px w-[16px] bg-slate-200" />
                    )}

                    <div className="flex min-w-0 flex-1 items-start gap-3 lg:items-center">
                      <div className="mt-0.5 flex-shrink-0">
                        <Badge
                          label={kr.id}
                          variant="purple-outline"
                          size="sm"
                        />
                      </div>
                      <Typography
                        variant="caption"
                        className="min-w-0 break-words leading-relaxed text-slate-600"
                      >
                        {kr.title}
                      </Typography>
                    </div>

                    <div className="flex w-full min-w-0 shrink-0 items-center justify-start lg:w-[240px] xl:w-[320px]">
                      <div className="flex w-full min-w-0 flex-col gap-1">
                        {!isDesktop && (
                          <Typography
                            variant="caption"
                            className="text-right text-slate-500"
                          >
                            {kr.percentage}%
                          </Typography>
                        )}
                        <div className="h-1.5 w-full overflow-hidden rounded-md bg-slate-200">
                          <div
                            className="h-1.5 rounded-md bg-blue-500"
                            style={{ width: `${kr.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center py-4 px-4 text-center rounded-lg border border-dashed border-slate-200 bg-white shadow-sm">
                <Info className="h-4 w-4 text-blue-500 shrink-0" />
                <Typography
                  variant="caption"
                  className="text-slate-500 font-medium"
                >
                  No Key Results (KRs) linked to this goal.
                </Typography>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalCard;
