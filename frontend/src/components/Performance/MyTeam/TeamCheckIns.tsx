import {
  AlertCircle,
  ChevronLeft,
  Clock,
  TrendingUp,
} from "lucide-react";
import React from "react";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { Typography } from "../../shared/atoms/Typography";

import  { TeamTrackingView } from "../Overview/TeamTracking/TeamTracking";

const STATS = [
  {
    label: "SUBMITTED THIS WEEK",
    value: "6 / 8",
    icon: (
      <div className="w-2.5 h-2.5 bg-blue-500 transform rotate-45 rounded-sm" />
    ),
    iconBg: "bg-blue-500/10",
    sub: null,
  },
  {
    label: "AVG FEELING SCORE",
    value: "4.0",
    icon: <TrendingUp className="w-4 h-4 text-emerald-500" />,
    iconBg: "bg-emerald-500/10",
    sub: <span className="text-text-body2">↓ 0.3 from last week</span>,
  },
  {
    label: "ACTIVE BLOCKERS",
    value: "4",
    icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
    iconBg: "bg-amber-500/10",
    sub: <span className="text-text-body2">from 3 reportees</span>,
  },
  {
    label: "TEAM AVG HOURS",
    value: "40.8h",
    icon: <Clock className="w-4 h-4 text-purple-500" />,
    iconBg: "bg-purple-500/10",
    sub: <span className="text-text-body2">Aman, Vikram missing</span>,
  },
];

const TeamCheckIns: React.FC = () => {
  const { isMobile, isTablet } = useScreenSize();
  const isCompact = isMobile || isTablet;

  return (
    <main
      className={`min-h-full overflow-y-auto overflow-x-hidden bg-app font-sans ${isMobile ? "p-3 sm:p-4" : "p-1"}`}
    >
      <div className="mx-auto w-full max-w-screen space-y-5">
        <div
          className={`flex ${isCompact ? "flex-col gap-3" : "items-end justify-between"} mb-6`}
        >
          <div className="space-y-1 min-w-0">
            <Typography variant="h3" className="font-bold tracking-tight">
              Weekly Check-ins
            </Typography>
            <Typography
              variant="bodySmall"
              color="body2"
              className="font-medium text-xs sm:text-sm leading-snug break-words"
            >
              Week of 11 May 2026 · 15-minute employee · 5-minute manager cadence
            </Typography>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md text-[11px] font-semibold text-text-title hover:bg-slate-500/10 bg-card transition-colors" aria-label="Previous week">
              <ChevronLeft className="w-3.5 h-3.5" /> Prev week
            </button>
            <button className="flex items-center px-4 py-1.5 border border-border rounded-md text-[11px] font-semibold text-text-title hover:bg-slate-500/10 bg-card transition-colors" aria-label="Go to this week">
              This week
            </button>
          </div>
        </div>

        {/* ── Stats Cards ─────────────────────────────────────────────── */}
        <div
          className={`grid ${isCompact ? "grid-cols-2" : "grid-cols-4"} max-w-4xl mx-auto gap-2.5 sm:gap-4 mb-4`}
        >
          {STATS.map((stat, idx) => (
            <div
              key={idx}
              className="bg-card rounded-xl border border-border p-3 sm:p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-start gap-2.5 sm:gap-3 min-w-0"
            >
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 ${stat.iconBg}`}
              >
                {stat.icon}
              </div>
              <div className="min-w-0 flex-1">
                <Typography variant="caption" color="body2" className="uppercase tracking-wider font-bold text-[9px] block mb-0.5 leading-tight break-words">
                  {stat.label}
                </Typography>
                <div className="flex items-baseline gap-2">
                  <Typography variant="body" className="font-bold text-base sm:text-lg leading-tight">
                    {stat.value}
                  </Typography>
                </div>
                {stat.sub && (
                  <Typography variant="caption" color="body2" className="text-[10px] sm:text-[11px] mt-0.5 leading-tight block">
                    {stat.sub}
                  </Typography>
                )}
              </div>
            </div>
          ))}
        </div>
        <TeamTrackingView title="Team Check-ins" />
  
      </div>
    </main>
  );
};

export default TeamCheckIns;
