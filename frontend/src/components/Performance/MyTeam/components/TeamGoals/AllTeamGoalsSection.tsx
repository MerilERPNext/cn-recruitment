import React, { useState } from "react";
import { ChevronRight, CornerDownRight } from "lucide-react";
import { Typography } from "../../../../shared/atoms/Typography";
import Badge, { type BadgeVariant } from "../../../../shared/Badge";
import Avatar from "../../../../shared/Avatar";
import { useScreenSize } from "../../../../../hooks/useScreenSize";
import { GoalStatus } from "../../types";

const statusVariant: Record<GoalStatus, BadgeVariant> = {
  "On-track": "success",
  "At-risk": "warning",
  "Off-track": "danger",
};

const statusBarColor: Record<GoalStatus, string> = {
  "On-track": "bg-blue-500",
  "At-risk": "bg-blue-500",
  "Off-track": "bg-red-500",
};

const statusSummary = [
  { label: "18 On-track", variant: "success" as BadgeVariant },
  { label: "10 At-risk", variant: "warning" as BadgeVariant },
  { label: "4 Off-track", variant: "danger" as BadgeVariant },
];

const getInitialsBg = (initials: string) => {
  const map: Record<string, string> = {
    PM: "bg-purple-100 text-purple-700",
    KI: "bg-blue-100 text-blue-700",
    AB: "bg-green-100 text-green-700",
    MS: "bg-orange-100 text-orange-700",
  };
  return map[initials] || "bg-gray-200 text-gray-700";
};

interface AllTeamGoalsSectionProps {
  totalGoals: number;
  members: any[];
  onGoalClick: (goal: any) => void;
}

export const AllTeamGoalsSection: React.FC<AllTeamGoalsSectionProps> = ({
  totalGoals,
  members,
  onGoalClick,
}) => {
  const { isMobile, isTablet } = useScreenSize();
  const isCompact = isMobile || isTablet;

  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(
    new Set(["m1"])
  );

  const toggleMember = (id: string) => {
    setExpandedMembers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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
        {members.map((member) => {
          const isExpanded = expandedMembers.has(member.id);
          return (
            <article
              key={member.id}
              className="overflow-hidden rounded-xl border border-slate-200"
            >
              <button
                type="button"
                aria-label={`${isExpanded ? "Collapse" : "Expand"} ${member.name} goals`}
                onClick={() => toggleMember(member.id)}
                className="flex w-full items-start justify-between gap-3 bg-blue-50/70 px-4 py-3 text-left transition-colors hover:bg-blue-50 sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                  <Avatar
                    name={member.name}
                    size="h-8 w-8"
                    fontSize="text-xs"
                    avatarBgColor={
                      getInitialsBg(member.initials).split(" ")[0]
                    }
                    avatarTextColor={
                      getInitialsBg(member.initials).split(" ")[1]
                    }
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Typography
                        variant="bodySmall"
                        className="font-semibold text-slate-950"
                      >
                        {member.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        className="text-slate-500"
                      >
                        {member.designation} · {member.goalCount} goals ·{" "}
                        {member.avgProgress}% avg
                      </Typography>
                    </div>
                    {isCompact && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 w-28 overflow-hidden rounded-md bg-blue-100">
                          <div
                            className="h-full rounded-md bg-blue-500"
                            style={{ width: `${member.avgProgress}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-blue-700">
                          {member.avgProgress}%
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
                  {member.goals.map((goal: any) => (
                    <div
                      key={goal.id}
                      onClick={() =>
                        onGoalClick({
                          ...goal,
                          employeeName: member.name,
                          employeeInitials: member.initials,
                        })
                      }
                      className={`grid cursor-pointer gap-3 transition-colors hover:bg-slate-50 ${
                        isCompact
                          ? "grid-cols-1 rounded-lg border border-slate-100 bg-white p-3 shadow-sm"
                          : "grid-cols-[minmax(0,1fr)_220px] items-center py-3"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <CornerDownRight className="h-4 w-4 shrink-0 text-slate-300" />
                        <Badge
                          label={goal.type}
                          variant="purple"
                          size="sm"
                        />
                        <Typography
                          variant="bodySmall"
                          className={`min-w-0 text-slate-700 ${
                            isCompact ? "break-words" : "truncate"
                          }`}
                        >
                          {goal.title}
                        </Typography>
                      </div>
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="h-2 flex-1 overflow-hidden rounded-md bg-slate-200">
                          <div
                            className={`h-full rounded-md ${
                              statusBarColor[goal.status as GoalStatus]
                            }`}
                            style={{ width: `${goal.progress}%` }}
                          />
                        </div>
                        <Badge
                          label={goal.status}
                          variant={statusVariant[goal.status as GoalStatus]}
                          size="sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default AllTeamGoalsSection;
