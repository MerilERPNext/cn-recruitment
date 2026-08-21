import React from "react";
import { Plus, Target, Users, Weight } from "lucide-react";
import Button from "../../../../shared/atoms/Button";
import { Typography } from "../../../../shared/atoms/Typography";
import { useScreenSize } from "../../../../../hooks/useScreenSize";
import { TeamGoalsCards } from "../../../../../types/goal";

interface GoalHeaderProps {
  card: TeamGoalsCards | undefined
}

export const GoalHeader: React.FC<GoalHeaderProps> = ({
  card
}) => {
  const { isMobile, isTablet } = useScreenSize();
  const isCompact = isMobile || isTablet;

  return (
    <header className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div
        className={`flex min-w-0 ${
          isCompact ? "flex-col gap-4" : "items-center justify-between gap-4"
        } border-b border-slate-100 p-4 sm:p-5`}
      >
        <div className="min-w-0">
          <Typography
            variant="h3"
            className="text-xl leading-tight text-slate-950 sm:text-2xl"
          >
            Team Goals
          </Typography>
          <Typography
            variant="bodySmall"
            className="mt-1 block break-words text-slate-500"
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
            className={`h-10 justify-center bg-white ${
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
      <div className="grid max-w-xl grid-cols-3 gap-2 p-4 sm:p-5">
        {[
          { icon: Target, label: "Goals", value: card?.goals },
          { icon: Users, label: "Reportees", value: card?.reportees },
          { icon: Weight, label: "Pending", value: card?.pending_approval },
        ].map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="min-w-0 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 sm:px-3"
          >
            <div className="flex items-center gap-1.5 text-slate-500">
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <Typography variant="caption" className="truncate text-slate-500">
                {label}
              </Typography>
            </div>
            <Typography
              variant="bodySmall"
              className="mt-1 block font-semibold text-slate-950"
            >
              {value}
            </Typography>
          </div>
        ))}
      </div>
    </header>
  );
};

export default GoalHeader;
