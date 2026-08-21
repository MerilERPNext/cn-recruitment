import React from "react";
import { ChevronRight } from "lucide-react";
import { Typography } from "../../../../shared/atoms/Typography";
import Avatar from "../../../../shared/Avatar";
import { getInitials } from "../../../../../utils/helperUtils";
import type { TeamGoalGroup } from "../../../../../types/goal";
import type { SelectedGoalDetail } from "./TeamGoalDetailModal";
import TeamGoalRow from "./TeamGoalRow";

interface TeamGoalGroupCardProps {
  group: TeamGoalGroup;
  isExpanded: boolean;
  isCompact: boolean;
  onToggle: (employeeId: string) => void;
  onSelectGoal: (selected: SelectedGoalDetail) => void;
}

export const TeamGoalGroupCard: React.FC<TeamGoalGroupCardProps> = React.memo(({
  group,
  isExpanded,
  isCompact,
  onToggle,
  onSelectGoal,
}) => {
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200">
      <button
        type="button"
        aria-label={`${isExpanded ? "Collapse" : "Expand"} ${group?.employee_name ?? "employee"} goals`}
        onClick={() => onToggle(group.employee)}
        className="flex w-full items-start justify-between gap-3 bg-blue-50/70 px-4 py-3 text-left transition-colors hover:bg-blue-50 sm:items-center"
      >
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
          <Avatar
            name={group?.employee_name || getInitials(group?.employee_name || "")}
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
                {group?.employee_name ?? "-"}
              </Typography>
              <Typography
                variant="caption"
                className="text-slate-500"
              >
                {group?.designation ? `${group.designation} · ` : ""}
                {group?.goal_count ?? 0} goals · {group?.avg_progress ?? 0}% avg
              </Typography>
            </div>
            {isCompact && (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 w-28 overflow-hidden rounded-md bg-blue-100">
                  <div
                    className="h-full rounded-md bg-blue-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, group?.avg_progress ?? 0))}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-semibold text-blue-700">
                  {group?.avg_progress ?? 0}%
                </span>
              </div>
            )}
          </div>
        </div>
        <ChevronRight
          className={`mt-2 h-4 w-4 shrink-0 text-slate-500 transition-transform duration-300 ease-in-out sm:mt-0 ${
            isExpanded ? "rotate-90 text-blue-600" : ""
          }`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          isExpanded
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div
            className={`max-h-[290px] overflow-y-auto ${
              isCompact
                ? "space-y-2 bg-slate-50/60 p-3"
                : "divide-y divide-gray-50 px-4 py-2"
            }`}
          >
            {group?.goals && group.goals.length > 0 ? (
              group.goals.map((goal) => (
                <TeamGoalRow
                  key={goal.goal_key || goal.goal}
                  goal={goal}
                  employeeName={group?.employee_name ?? "-"}
                  employeeInitials={group?.initials ?? ""}
                  designation={group?.designation}
                  isCompact={isCompact}
                  onSelect={onSelectGoal}
                />
              ))
            ) : (
              <div className="px-4 py-3 text-xs italic text-slate-400">
                No goals assigned yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
});

TeamGoalGroupCard.displayName = "TeamGoalGroupCard";

export default TeamGoalGroupCard;
