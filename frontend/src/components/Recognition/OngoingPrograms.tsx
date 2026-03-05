import React from "react";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import { RecognitionProgram } from "../../types/recognition";
import { format } from "date-fns";
import StatusBadge from "../shared/atoms/statusBadge";

interface OngoingProgramsProps {
  programs: RecognitionProgram[];
  isLoading?: boolean;
}

export const OngoingPrograms: React.FC<OngoingProgramsProps> = ({
  programs,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card radius="xl" className="border p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const getDateBadge = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return {
        month: format(date, "MMM").toUpperCase(),
        day: format(date, "dd"),
      };
    } catch {
      return { month: "---", day: "--" };
    }
  };

  return (
    <Card radius="xl" className="border p-4 md:p-6">
      <Typography variant="subheading" className="font-semibold mb-4">
        Ongoing Programs
      </Typography>

      <div className="space-y-4">
        {programs.length > 0 ? (
          programs.map((program) => {
            const dateBadge = getDateBadge(program.start_date);
            const progress = program.overall_progress ?? 0;

            return (
              <div key={program.id} className="flex items-start gap-3">
                {/* Date Badge */}
                <div className="flex flex-col items-center justify-center w-12 h-14 rounded-lg border border-gray-200 bg-white shrink-0">
                  <span className="text-[10px] font-semibold text-gray-500 leading-tight">
                    {dateBadge.month}
                  </span>
                  <span className="text-lg font-bold text-gray-800 leading-tight">
                    {dateBadge.day}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Typography variant="bodyMedium" className="font-semibold truncate">
                      {program.name}
                    </Typography>
                    <StatusBadge status={program.status} />
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-sm h-1.5">
                    <div
                      className="h-1.5 rounded-sm transition-all"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: program.color || "#3b82f6",
                      }}
                    />
                  </div>

                  {/* Phase dates */}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {program.nomination_start_date && program.nomination_end_date && (
                      <span>
                        Nom: {format(new Date(program.nomination_start_date), "MMM d")} -{" "}
                        {format(new Date(program.nomination_end_date), "MMM d")}
                      </span>
                    )}
                    {program.voting_start_date && program.voting_end_date && (
                      <span>
                        Vote: {format(new Date(program.voting_start_date), "MMM d")} -{" "}
                        {format(new Date(program.voting_end_date), "MMM d")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Typography variant="bodyMedium">No ongoing programs</Typography>
          </div>
        )}
      </div>
    </Card>
  );
};
