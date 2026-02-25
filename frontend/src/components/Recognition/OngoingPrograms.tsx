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

  const calculateProgress = (program: RecognitionProgram) => {
    const start = new Date(program.start_date);
    const end = new Date(program.end_date);
    const now = new Date();
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd");
    } catch {
      return dateString;
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
            const progress = calculateProgress(program);

            return (
              <div key={program.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium text-gray-600">
                      {formatDate(program.start_date)}
                    </div>
                    <Typography variant="bodyMedium" className="font-semibold">
                      {program.name}
                    </Typography>
                  </div>
                  <StatusBadge status={program.status} />
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
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
