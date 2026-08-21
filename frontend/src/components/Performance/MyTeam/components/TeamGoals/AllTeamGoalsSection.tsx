import React, { useState, useEffect } from "react";
import { ChevronRight, CornerDownRight } from "lucide-react";
import { Typography } from "../../../../shared/atoms/Typography";
import Badge, { type BadgeVariant } from "../../../../shared/Badge";
import Avatar from "../../../../shared/Avatar";
import { useScreenSize } from "../../../../../hooks/useScreenSize";
import { getInitials } from "../../../../../utils/helperUtils";
import type { TeamGoalGroup, TeamGoalsHealth } from "../../../../../types/goal";
import TeamGoalDetailModal, { type SelectedGoalDetail } from "./TeamGoalDetailModal";

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

interface AllTeamGoalsSectionProps {
  totalGoals?: number;
  groups?: TeamGoalGroup[];
  health?: TeamGoalsHealth;
  onGoalClick?: (goal: any) => void;
}

export const AllTeamGoalsSection: React.FC<AllTeamGoalsSectionProps> = ({
  totalGoals = 0,
  groups = [],
  health,
}) => {
  const { isMobile, isTablet } = useScreenSize();
  const isCompact = isMobile || isTablet;

  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [selectedGoalDetail, setSelectedGoalDetail] = useState<SelectedGoalDetail | null>(null);

  // Auto-expand first employee with goals on initial load
  useEffect(() => {
    if (groups && groups.length > 0) {
      const firstWithGoals = groups.find((g) => g.goal_count > 0) || groups[0];
      if (firstWithGoals) {
        setExpandedMembers(new Set([firstWithGoals.employee]));
      }
    }
  }, [groups]);

  const toggleMember = (id: string) => {
    setExpandedMembers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const statusSummary = health
    ? [
        { label: `${health.on_track} On-track`, variant: "success" as BadgeVariant },
        { label: `${health.at_risk} At-risk`, variant: "warning" as BadgeVariant },
        { label: `${health.off_track} Off-track`, variant: "danger" as BadgeVariant },
      ]
    : [
        { label: "0 On-track", variant: "success" as BadgeVariant },
        { label: "0 At-risk", variant: "warning" as BadgeVariant },
        { label: "0 Off-track", variant: "danger" as BadgeVariant },
      ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <header
        className={`mb-4 flex min-w-0 ${
          isCompact ? "flex-col gap-3" : "items-start justify-between gap-4"
        }`}
      >
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <Typography variant="h4" className="font-bold text-slate-950">
              All Team Goals
            </Typography>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {totalGoals}
            </span>
          </div>
          <Typography variant="caption" className="text-slate-500">
            Approved & in progress · grouped by reportee
          </Typography>
        </div>
        <div
          className={`flex flex-wrap gap-2 ${
            isCompact ? "w-full" : "shrink-0 justify-end"
          }`}
        >
          {statusSummary.map((item) => (
            <Badge
              key={item.label}
              label={item.label}
              variant={item.variant}
              size="sm"
            />
          ))}
        </div>
      </header>

      <div className="space-y-3">
        {groups.length > 0 ? (
          groups.map((group) => {
            const isExpanded = expandedMembers.has(group.employee);
            return (
              <article
                key={group.employee}
                className="overflow-hidden rounded-xl border border-slate-200"
              >
                <button
                  type="button"
                  aria-label={`${isExpanded ? "Collapse" : "Expand"} ${group.employee_name} goals`}
                  onClick={() => toggleMember(group.employee)}
                  className="flex w-full items-start justify-between gap-3 bg-blue-50/70 px-4 py-3 text-left transition-colors hover:bg-blue-50 sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                    <Avatar
                      name={group.employee_name || getInitials(group.employee_name)}
                      size="h-8 w-8"
                      fontSize="text-xs"
                      avatarBgColor="bg-blue-50"
                      avatarTextColor="text-blue-600"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Typography
                          variant="bodySmall"
                          className="font-semibold text-slate-950"
                        >
                          {group.employee_name}
                        </Typography>
                        <Typography
                          variant="caption"
                          className="text-slate-500"
                        >
                          {group.designation} · {group.goal_count} goals ·{" "}
                          {group.avg_progress}% avg
                        </Typography>
                      </div>
                      {isCompact && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1.5 w-28 overflow-hidden rounded-md bg-blue-100">
                            <div
                              className="h-full rounded-md bg-blue-500"
                              style={{ width: `${group.avg_progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-blue-700">
                            {group.avg_progress}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight
                    className={`mt-2 h-4 w-4 shrink-0 text-slate-500 transition-transform sm:mt-0 ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  />
                </button>

                {isExpanded && (
                  <div
                    className={
                      isCompact
                        ? "space-y-2 bg-slate-50/60 p-3"
                        : "divide-y divide-gray-50 px-4 py-2"
                    }
                  >
                    {group.goals && group.goals.length > 0 ? (
                      group.goals.map((goal) => (
                        <div
                          key={goal.goal_key || goal.goal}
                          onClick={() => {
                            const selected: SelectedGoalDetail = {
                              ...goal,
                              employeeName: group.employee_name,
                              employeeInitials: group.initials,
                              designation: group.designation,
                            };
                            setSelectedGoalDetail(selected);
                          }}
                          className={`grid cursor-pointer gap-3 transition-colors hover:bg-slate-50 ${
                            isCompact
                              ? "grid-cols-1 rounded-lg border border-slate-100 bg-white p-3 shadow-sm"
                              : "grid-cols-[minmax(0,1fr)_280px] items-center py-3"
                          }`}
                        >
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
                                className={`min-w-0 font-medium text-slate-900 ${
                                  isCompact ? "break-words" : "truncate"
                                }`}
                              >
                                {goal.title}
                              </Typography>
                              {goal.description && (
                                <Typography
                                  variant="caption"
                                  className={`mt-0.5 block min-w-0 text-slate-500 ${
                                    isCompact ? "break-words" : "truncate"
                                  }`}
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
                                        width: `${Math.min(
                                          100,
                                          goal.expected_progress
                                        )}%`,
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
                              label={goal.health_label || goal.health}
                              variant={getHealthBadgeVariant(
                                goal.health_tone,
                                goal.health
                              )}
                              size="sm"
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-xs italic text-slate-400">
                        No goals assigned yet.
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })
        ) : (
          <div className="py-6 text-center text-xs italic text-slate-400">
            No reportees or team goals found.
          </div>
        )}
      </div>

      {selectedGoalDetail && (
        <TeamGoalDetailModal
          goal={selectedGoalDetail}
          onClose={() => setSelectedGoalDetail(null)}
        />
      )}
    </section>
  );
};

export default AllTeamGoalsSection;
