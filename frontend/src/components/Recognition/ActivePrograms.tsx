import React from "react";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import { RecognitionProgram } from "../../types/recognition";
import { ArrowRight, Users, Clock, Trophy } from "lucide-react";

interface ActiveProgramsProps {
  programs: RecognitionProgram[];
  isLoading?: boolean;
}

export const ActivePrograms: React.FC<ActiveProgramsProps> = ({
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
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const formatDaysLeft = (days: number) => {
    if (days === 0) return "Ends today";
    if (days === 1) return "1 day left";
    return `${days} days left`;
  };

  return (
    <Card radius="xl" className="border p-4 md:p-6">
      <Typography variant="subheading" className="font-semibold mb-4">
        Active Programs
      </Typography>

      <div className="space-y-3">
        {programs.length > 0 ? (
          programs.map((program) => (
            <div
              key={program.id}
              className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all cursor-pointer group"
            >
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: program.color
                    ? `${program.color}20`
                    : "#6366f120",
                }}
              >
                {program.icon ? (
                  <img
                    src={program.icon}
                    alt={program.name}
                    className="w-8 h-8 object-contain"
                  />
                ) : (
                  <Trophy
                    className="size-6"
                    style={{ color: program.color || "#6366f1" }}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <Typography variant="bodyMedium" className="font-semibold mb-1">
                  {program.name}
                </Typography>
                <Typography
                  variant="bodySmall"
                  color="body2"
                  className="mb-2 line-clamp-2"
                >
                  {program.description || "No description available"}
                </Typography>

                {/* Footer info */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="size-4" />
                    <span>{formatDaysLeft(program.days_left || 0)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="size-4" />
                    <span>{program.participant_count} joined</span>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <ArrowRight className="size-5 text-gray-400 group-hover:text-primary transition-colors shrink-0" />
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Typography variant="bodyMedium">No active programs</Typography>
          </div>
        )}
      </div>
    </Card>
  );
};
