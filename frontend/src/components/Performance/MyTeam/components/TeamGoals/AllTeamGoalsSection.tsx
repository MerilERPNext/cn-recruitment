import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ChevronRight } from "lucide-react";
import { Typography } from "../../../../shared/atoms/Typography";
import Badge, { type BadgeVariant } from "../../../../shared/Badge";
import Avatar from "../../../../shared/Avatar";
import { useScreenSize } from "../../../../../hooks/useScreenSize";
import { getInitials } from "../../../../../utils/helperUtils";
import type { TeamGoalGroup, TeamGoalsHealth } from "../../../../../types/goal";
import TeamGoalDetailModal, { type SelectedGoalDetail } from "./TeamGoalDetailModal";
import TeamGoalRow from "./TeamGoalRow";

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

  const toggleMember = useCallback((id: string) => {
    setExpandedMembers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedGoalDetail(null);
  }, []);

  const statusSummary = useMemo(
    () =>
      health
        ? [
          { label: `${health.on_track} On-track`, variant: "success" as BadgeVariant },
          { label: `${health.at_risk} At-risk`, variant: "warning" as BadgeVariant },
          { label: `${health.off_track} Off-track`, variant: "danger" as BadgeVariant },
        ]
        : [
          { label: "0 On-track", variant: "success" as BadgeVariant },
          { label: "0 At-risk", variant: "warning" as BadgeVariant },
          { label: "0 Off-track", variant: "danger" as BadgeVariant },
        ],
    [health]
  );


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
                        <TeamGoalRow
                          key={goal.goal_key || goal.goal}
                          goal={goal}
                          employeeName={group.employee_name}
                          employeeInitials={group.initials}
                          designation={group.designation}
                          isCompact={isCompact}
                          onSelect={setSelectedGoalDetail}
                        />
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
          onClose={handleCloseModal}
        />
      )}
    </section>
  );
};

export default AllTeamGoalsSection;
