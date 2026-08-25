import React, { useState } from "react";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import { RecognitionProgram } from "../../types/recognition";
import { ArrowRight, Users, Clock, Target, Trophy } from "lucide-react";
import StatusBadge from "../shared/atoms/statusBadge";
import { ProgramExpansionPanel } from "./ProgramExpansionPanel";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import {
  useEligiblePrograms,
  useRecognitionFlags,
} from "../../services/recognitionService";
import formatToIndianDate from "../../utils/formatToIndianDate";
import {
  daysLeftUntil,
  getProgramPill,
  isProgramActive,
  sortPrograms,
} from "./programStatus";


export const ActivePrograms: React.FC = () => {
  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(
    null
  );

  // Eligible programs for the logged-in employee (get_eligible_programs).
  const { data: user } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const { data: eligibleData, isLoading: eligibleLoading } = useEligiblePrograms(
    user?.employee,
    "Award",
  );

  // Hide the "Nominate Upto" value on cards when set in Advanced Settings.
  const { hideNominateUptoValue } = useRecognitionFlags();

  // Map the API response → the RecognitionProgram shape this card renders.
  const apiPrograms: RecognitionProgram[] = (
    eligibleData?.eligible_programs ?? []
  ).map((p) => {
    const program: RecognitionProgram = {
      id: p.program_name,
      name: p.program_title,
      code: p.program_name,
      description: p.program_description || "",
      start_date: p.start_date,
      end_date: p.end_date,
      participant_count: 0,
      status: "Active",
      days_left: daysLeftUntil(p.end_date),
      category: p.reward_type,
      nominate_upto: p.nominate_upto,
    };
    // The API only returns eligible programs, so derive the real state locally.
    return {
      ...program,
      status: isProgramActive(program) ? "Active" : "Inactive",
    };
  });

  const list: RecognitionProgram[] = sortPrograms(apiPrograms);
  const loading = eligibleLoading;

  if (loading) {
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

  const handleCardClick = (programId: string) => {
    setExpandedProgramId((prev) => (prev === programId ? null : programId));
  };

  return (
    <Card radius="xl" className="border p-4 md:p-6">
      <Typography variant="subheading" className="font-semibold mb-4">
        All Programs
      </Typography>

      <div className="space-y-3">
        {list.length > 0 ? (
          list.map((program) => {
            const isExpanded = expandedProgramId === program.id;
            const pill = getProgramPill(program);
            const active = isProgramActive(program);
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
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-[3px] rounded-md text-xs font-medium ${pill.bgClass} ${pill.textClass}`}
                      >
                        {pill.showTimer && <Clock className="size-3.5" />}
                        {pill.label}
                      </span>
                      <div className="flex items-center gap-1">
                        <Users className="size-4" />
                        <span>{program.participant_count} joined</span>
                      </div>
                      {!hideNominateUptoValue && program.end_date && (
                        <div className="flex items-center gap-1">
                          <Target className="size-4" />
                          <span>Nominate Upto {formatToIndianDate(program.end_date)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="shrink-0">
                    {isExpanded ? (
                      <ArrowRight className="size-5 text-gray-400 rotate-90 transition-all" />
                    ) : program.current_phase?.toLowerCase() === "voting open" ? (
                      <span className="text-xs font-medium text-blue-700">Vote Now →</span>
                    ) : active ? (
                      <span className="text-xs font-medium text-emerald-700 group-hover:underline">
                        Nominate →
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-gray-400">View →</span>
                    )}
                  </div>
                </div>

                {/* Expansion Panel */}
                {isExpanded && (
                  <ProgramExpansionPanel
                    awardName={program.id}
                    onCollapse={() => setExpandedProgramId(null)}
                    isActive={active}
                  />
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Typography variant="bodyMedium">No programs</Typography>
          </div>
        )}
      </div>
    </Card>
  );
};
