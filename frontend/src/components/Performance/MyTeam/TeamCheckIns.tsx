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
    iconBg: "bg-blue-50",
    sub: null,
  },
  {
    label: "AVG FEELING SCORE",
    value: "4.0",
    icon: <TrendingUp className="w-4 h-4 text-green-600" />,
    iconBg: "bg-green-50",
    sub: <span className="text-gray-500">↓ 0.3 from last week</span>,
  },
  {
    label: "ACTIVE BLOCKERS",
    value: "4",
    icon: <AlertCircle className="w-4 h-4 text-orange-600" />,
    iconBg: "bg-orange-50",
    sub: <span className="text-gray-500">from 3 reportees</span>,
  },
  {
    label: "TEAM AVG HOURS",
    value: "40.8h",
    icon: <Clock className="w-4 h-4 text-purple-600" />,
    iconBg: "bg-purple-50",
    sub: <span className="text-gray-500">Aman, Vikram missing</span>,
  },
];

const TeamCheckIns: React.FC = () => {
  const { isMobile, isTablet } = useScreenSize();
  const isCompact = isMobile || isTablet;

  return (
    <main
      className={`min-h-full overflow-y-auto overflow-x-hidden bg-[#f8fafc] font-sans ${isMobile ? "p-4" : "p-1"}`}
    >
      <div className="mx-auto w-full max-w-screen space-y-5">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div
          className={`flex ${isCompact ? "flex-col gap-4" : "items-end justify-between"} mb-6`}
        >
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Weekly Check-ins
            </h1>
            <Typography
              variant="bodySmall"
              className="text-gray-500 font-medium"
            >
              Week of 11 May 2026 · 15-minute employee · 5-minute manager
              cadence
            </Typography>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-md text-[11px] font-semibold text-gray-700 hover:bg-gray-50 bg-white transition-colors" aria-label="Previous week">
              <ChevronLeft className="w-3.5 h-3.5" /> Prev week
            </button>
            <button className="flex items-center px-4 py-1.5 border border-gray-200 rounded-md text-[11px] font-semibold text-gray-700 hover:bg-gray-50 bg-white transition-colors" aria-label="Go to this week">
              This week
            </button>
          </div>
        </div>

        {/* ── Stats Cards ─────────────────────────────────────────────── */}
        <div
          className={`grid ${isCompact ? "grid-cols-2" : "grid-cols-4"} gap-4 mb-4`}
        >
          {STATS.map((stat, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl border border-gray-200 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-start gap-3"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${stat.iconBg}`}
              >
                {stat.icon}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-gray-400 uppercase tracking-widest font-bold text-[9px] block mb-0.5">
                  {stat.label}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-gray-900 font-bold text-lg leading-tight">
                    {stat.value}
                  </span>
                </div>
                {stat.sub && (
                  <div className="text-[10px] mt-0.5">{stat.sub}</div>
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
