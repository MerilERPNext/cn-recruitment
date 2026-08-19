import { ArrowRight, Check } from "lucide-react";
import React from "react";
import Button from "../../../../shared/atoms/Button";
import { Typography } from "../../../../shared/atoms/Typography";
import Badge from "../../../../shared/Badge";

import { useNavigate } from "react-router-dom";
import { useGetTeamOverview } from "../../../../../hooks/usePerformance";
import OverviewStats from "./OverviewStats";
import { formatDate } from "../../../Overview/component/OverviewHeader";

const fallbackSteps = [
  { n: 1, label: "Goal Setting", done: true, active: false },
  { n: 2, label: "Self-Review", done: false, active: true },
  { n: 3, label: "Manager Review", done: false, active: false },
  { n: 4, label: "Calibration", done: false, active: false },
  { n: 5, label: "Released", done: false, active: false },
];

interface HeroCardProps {
  isCompact: boolean;
}

const HeroCard: React.FC<HeroCardProps> = ({ isCompact }) => {
  const navigate = useNavigate();
  const { data: teamOverviewData } = useGetTeamOverview();
  const overview = teamOverviewData?.data;
  const cards = overview?.cards;

  const stats = [
    {
      label: "GOALS PENDING APPROVAL",
      value: cards ? String(cards.goals_pending_approval) : "0",
      sub: cards ? `${cards.employees_pending_approval} employees pending` : "0 employees pending",
      valueColor: "text-orange-500",
    },
    {
      label: "TEAM AVG PROGRESS",
      value: cards ? `${cards.team_avg_progress}%` : "0%",
      sub: cards ? `Expected: ${cards.expected_progress}%` : "Expected: 0%",
      valueColor: "text-blue-600",
    },
    {
      label: "OFF-TRACK GOALS",
      value: cards ? String(cards.off_track_goals) : "0",
      sub: cards ? `${cards.off_track_employees} reportees off-track` : "0 reportees off-track",
      valueColor: "text-red-500",
    },
    {
      label: "CHECK-INS DUE",
      value: cards ? String(cards.checkins_due) : "0",
      sub: cards ? `${cards.checkins_overdue} overdue` : "0 overdue",
      valueColor: "text-purple-600",
    },
    {
      label: "NO PLAN YET",
      value: cards ? String(cards.no_plan_yet) : "0",
      sub: "Without goals",
      valueColor: "text-slate-600",
    },
    {
      label: "ON-TRACK EMPLOYEES",
      value: cards ? String(cards.on_track_employees) : "0",
      sub: `of ${overview?.team_size ?? 0} reportees`,
      valueColor: "text-green-600",
    },
  ];

  const steps = overview?.stages && overview.stages.length > 0
    ? overview.stages.map((st) => ({
        n: st.sequence,
        label: st.stage_name,
        done: st.sequence < (overview.stages.find((s) => s.stage_name === overview.current_stage)?.sequence ?? 1),
        active: st.stage_name === overview.current_stage,
      }))
    : fallbackSteps;

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
        <div aria-label="Cycle Details" className="mb-5 flex min-w-0 flex-col justify-between gap-4 sm:mb-6 md:flex-row md:items-center">
          <div className="min-w-0">
            <div className="mb-2.5 flex flex-wrap items-center gap-2">
              <Badge
                label={overview?.status ? `${overview.status.toUpperCase()}` : "CYCLE LIVE"}
                backgroundColor="bg-blue-100"
                textColor="text-blue-700"
                size="sm"
                pulse={{ show: true, color: "bg-blue-600" }}
              />
              <Typography variant="bodySmall" className="break-words text-gray-500">
                {formatDate(overview?.start_date) || "No date found"} &rarr; {formatDate(overview?.end_date) || "No date found"}{" "}
                &middot; {overview?.company || "-"}
              </Typography>
            </div>
            <Typography variant="h3" className="break-words text-xl leading-tight sm:text-2xl font-bold text-slate-900">
              {overview?.cycle_name || "FY26 Annual Performance Cycle"}
            </Typography>
            <Typography variant="bodySmall" className="mt-1 block break-words text-gray-500">
              Your team &middot; {overview?.team_size ?? 8} reportees &middot; {overview?.company || "India Tech BU"}
            </Typography>
          </div>

          <div className="flex w-full min-w-0 flex-col items-start md:w-auto md:items-end shrink-0">
            <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center md:w-auto md:justify-end">
              <div className="flex flex-col items-start sm:items-end text-left sm:text-right shrink-0">
                <Typography
                  variant="caption"
                  className="text-gray-400 uppercase tracking-widest font-bold text-[10px]"
                >
                  NEXT DEADLINE
                </Typography>
                <Typography
                  variant="bodySmall"
                  className="text-[#1a73e8] font-bold whitespace-nowrap"
                >
                  {overview?.days_remaining != null
                    ? `${overview.days_remaining} days remaining`
                    : "No date found"}
                </Typography>
              </div>
              <Button
                variant="contain"
                bgColor="primary"
                onClick={() => navigate("/webapp/performance-app/team-reviews")}
                className={`${isCompact ? "w-full sm:w-auto" : "px-5 py-2.5"} bg-[#1a73e8] hover:bg-blue-600 font-semibold rounded-lg shadow-sm text-sm inline-flex items-center justify-center shrink-0 whitespace-nowrap`}
              >
                Continue Self-Review <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0 overflow-x-auto pb-1 scrollbar-hide">
          {steps.map((step, idx) => (
            <React.Fragment key={step.label}>
              {idx > 0 && <div className="h-px w-5 md:w-8 lg:w-10 shrink-0 bg-gray-200 mx-1.5 md:mx-2 lg:mx-3" />}
              <div
                className={`flex items-center gap-2 shrink-0 ${!step.done && !step.active ? "opacity-40" : ""}`}
              >
                {step.done ? (
                  <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                ) : (
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${step.active ? "bg-[#1a73e8] text-white" : "bg-gray-100 text-gray-500"}`}
                  >
                    {step.n}
                  </div>
                )}
                <Typography
                  variant="caption"
                  className={`whitespace-nowrap font-medium text-[11px] ${step.active ? "text-[#1a73e8] font-bold" : step.done ? "text-green-600 font-bold" : "text-gray-500"}`}
                >
                  {step.label}
                </Typography>
              </div>
            </React.Fragment>
          ))}
        </div>
      </section>

      <OverviewStats isCompact={isCompact} stats={stats} />
    </div>
  );
};

export default HeroCard;

