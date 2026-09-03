import React from "react";
import { Plus, Target, Users, Weight } from "lucide-react";
import Button from "../../../../shared/atoms/Button";
import { Typography } from "../../../../shared/atoms/Typography";
import { useScreenSize } from "../../../../../hooks/useScreenSize";
import { TeamGoalsCards } from "../../../../../types/goal";
import { useGetTeamGoals } from "../../../../../hooks/usePerformance";
import { TeamGoalsHeaderSkeleton } from "./TeamGoalsSkeleton";

interface GoalHeaderProps {
  card?: TeamGoalsCards | undefined;
}

export const GoalHeader: React.FC<GoalHeaderProps> = React.memo(({ card: propCard }) => {
  const { isMobile, isTablet } = useScreenSize();
  const isCompact = isMobile || isTablet;
  const { data, isLoading, error } = useGetTeamGoals();

  if (isLoading) {
    return <TeamGoalsHeaderSkeleton />;
  }

  if (error) {
    return null;
  }

  const card = propCard || data?.data?.cards;

  return (
    <header className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div
        className={`flex min-w-0 ${
          isCompact ? "flex-col gap-4" : "items-center justify-between gap-4"
        } border-b border-border p-4 sm:p-5`}
      >
        <div className="min-w-0">
          <Typography
            variant="h3"
            className="text-xl leading-tight sm:text-2xl font-bold"
          >
            Team Goals
          </Typography>
          <Typography
            variant="bodySmall"
            color="body2"
            className="mt-1 block break-words"
          >
            {card?.goals ?? "-"} goals across {card?.reportees ?? "-"} reportees ·{" "}
            {card?.pending_approval ?? "-"} pending your approval
          </Typography>
        </div>
        <div
          className={`flex ${
            isCompact
              ? "w-full flex-col sm:flex-row"
              : "shrink-0 items-center"
          } gap-3`}
        >
          <Button
            variant="outline"
            bgColor="text"
            size="sm"
            className={`h-10 justify-center ${
              isCompact ? "w-full sm:w-fit" : ""
            }`}
          >
            Cascade from Org
          </Button>
          <Button
            variant="contain"
            bgColor="primary"
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            className={`h-10 justify-center ${
              isCompact ? "w-full sm:w-fit" : ""
            }`}
          >
            Assign Goal
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 sm:px-5 border-t border-border bg-card">
        {[
          { icon: Target, label: "Goals", value: card?.goals ?? 0, bg: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
          { icon: Users, label: "Reportees", value: card?.reportees ?? 0, bg: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" },
          { icon: Weight, label: "Pending", value: card?.pending_approval ?? 0, bg: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
        ].map(({ icon: Icon, label, value, bg }) => (
          <span
            key={label}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-semibold ${bg}`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{label}:</span>
            <span className="font-bold">{value}</span>
          </span>
        ))}
      </div>
    </header>
  );
});

export default GoalHeader;
