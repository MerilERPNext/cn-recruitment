import React, { useState } from "react";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import { RecognitionProgram } from "../../types/recognition";
import { ArrowRight, Users, Clock, Trophy } from "lucide-react";
import StatusBadge from "../shared/atoms/statusBadge";
import { ProgramExpansionPanel } from "./ProgramExpansionPanel";

interface ActiveProgramsProps {
  programs: RecognitionProgram[];
  isLoading?: boolean;
}

export const ActivePrograms: React.FC<ActiveProgramsProps> = ({
  programs,
  isLoading,
}) => {
  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(
    null
  );

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

  const handleCardClick = (programId: string) => {
    setExpandedProgramId((prev) => (prev === programId ? null : programId));
  };

  return (
    <Card radius="xl" className="border p-4 md:p-6">
      <Typography variant="subheading" className="font-semibold mb-4">
        Active Programs
      </Typography>

      <div className="space-y-3">
        {programs.length > 0 ? (
          programs.map((program) => {
            const isExpanded = expandedProgramId === program.id;
            return (
              <div key={program.id}>
                <div
                  onClick={() => handleCardClick(program.id)}
                  className="flex items-center gap-4 p-4 rounded-xl border hover:shadow-md transition-all cursor-pointer group"
                  style={{
                    background: program.color
                      ? `linear-gradient(135deg, ${program.color}08, ${program.color}15)`
                      : undefined,
                    borderColor: program.color
                      ? `${program.color}30`
                      : "#e5e7eb",
                  }}
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
                    <div className="flex items-center gap-2 mb-1">
                      <Typography
                        variant="bodyMedium"
                        className="font-semibold"
                      >
                        {program.name}
                      </Typography>
                      {program.current_phase && (
                        <StatusBadge status={program.current_phase} />
                      )}
                    </div>
                    <Typography
                      variant="bodySmall"
                      color="body2"
                      className="mb-2 line-clamp-2"
                    >
                      {program.description
                        ? new DOMParser().parseFromString(program.description, "text/html").body.textContent || ""
                        : "No description available"}
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

                  {/* CTA */}
                  <div className="shrink-0">
                    {!isExpanded && program.current_phase?.toLowerCase() === "nomination open" ? (
                      <span className="text-xs font-medium text-emerald-700">Nominate →</span>
                    ) : !isExpanded && program.current_phase?.toLowerCase() === "voting open" ? (
                      <span className="text-xs font-medium text-blue-700">Vote Now →</span>
                    ) : (
                      <ArrowRight
                        className={`size-5 text-gray-400 group-hover:text-primary transition-all ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                    )}
                  </div>
                </div>

                {/* Expansion Panel */}
                {isExpanded && (
                  <ProgramExpansionPanel
                    awardName={program.id}
                    onCollapse={() => setExpandedProgramId(null)}
                  />
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Typography variant="bodyMedium">No active programs</Typography>
          </div>
        )}
      </div>
    </Card>
  );
};
