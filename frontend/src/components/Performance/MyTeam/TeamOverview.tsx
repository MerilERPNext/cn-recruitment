import { ArrowRight, ArrowUp, Check, ChevronDown } from "lucide-react";
import React from "react";
import { useScreenSize } from "../../../hooks/useScreenSize";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const STATS = [
  {
    label: "REVIEWS TO COMPLETE",
    value: "6",
    sub: "2 of 8 done",
    valueColor: "text-blue-600",
  },
  {
    label: "GOALS PENDING APPROVAL",
    value: "3",
    sub: "submitted this week",
    valueColor: "text-orange-500",
  },
  {
    label: "SELF-REVIEWS SUBMITTED",
    value: "6 / 8",
    sub: "2 overdue",
    valueColor: "text-blue-600",
  },
  {
    label: "OFF-TRACK GOALS",
    value: "4",
    sub: "across 3 reportees",
    valueColor: "text-red-500",
  },
  {
    label: "TEAM AVG PROGRESS",
    value: "63%",
    sub: (
      <>
        <ArrowUp className="w-3 h-3 inline mr-0.5 text-green-500" />
        8% vs Q4
      </>
    ),
    valueColor: "text-green-600",
  },
];

const TEAM_MEMBERS = [
  {
    id: "1",
    initials: "PM",
    name: "Pallavi Mahar",
    role: "Sr. Product Designer",
    tenure: "3.2y",
    goals: 5,
    progress: 64,
    self: "Done",
    review: "Not started",
    lastRating: "Exceeds",
    ratingColor: "bg-green-500",
    ratingText: "text-green-600",
    action: "Review",
  },
  {
    id: "2",
    initials: "KI",
    name: "Karthik Iyer",
    role: "Sr. Designer",
    tenure: "4.1y",
    goals: 5,
    progress: 78,
    self: "Done",
    review: "Done",
    lastRating: "Exceeds",
    ratingColor: "bg-green-500",
    ratingText: "text-green-600",
    action: "View",
  },
  {
    id: "3",
    initials: "MS",
    name: "Mohit Sinha",
    role: "Sr. Designer",
    tenure: "2y",
    goals: 4,
    progress: 52,
    self: "Done",
    review: "Not started",
    lastRating: "Meets",
    ratingColor: "bg-blue-500",
    ratingText: "text-blue-600",
    action: "Review",
  },
  {
    id: "4",
    initials: "RB",
    name: "Riya Banerjee",
    role: "Designer II",
    tenure: "1.8y",
    goals: 4,
    progress: 88,
    self: "Done",
    review: "Done",
    lastRating: "Exceeds",
    ratingColor: "bg-green-500",
    ratingText: "text-green-600",
    action: "View",
  },
  {
    id: "5",
    initials: "AB",
    name: "Aman Bhatt",
    role: "Designer II",
    tenure: "1.5y",
    goals: 4,
    progress: 45,
    self: "Pending",
    review: "Not started",
    lastRating: "Meets",
    ratingColor: "bg-blue-500",
    ratingText: "text-blue-600",
    action: "Nudge",
  },
  {
    id: "6",
    initials: "SD",
    name: "Shreya Das",
    role: "Designer I",
    tenure: "0.6y",
    goals: 4,
    progress: 71,
    self: "Done",
    review: "Not started",
    lastRating: null,
    ratingColor: "",
    ratingText: "",
    action: "Review",
  },
  {
    id: "7",
    initials: "VR",
    name: "Vikram Rao",
    role: "Designer II",
    tenure: "2.4y",
    goals: 4,
    progress: 30,
    self: "Overdue",
    review: "Not started",
    lastRating: "Below",
    ratingColor: "bg-yellow-500",
    ratingText: "text-yellow-600",
    action: "Nudge",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getProgressColor = (progress: number) => {
  if (progress >= 70) return "bg-green-500";
  if (progress >= 40) return "bg-blue-500";
  return "bg-red-500";
};

const SelfBadge = ({ status }: { status: string }) => {
  if (status === "Done")
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">
        <Check className="w-3 h-3" />
        Done
      </span>
    );
  if (status === "Pending")
    return (
      <span className="inline-flex items-center text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
        Pending
      </span>
    );
  if (status === "Overdue")
    return (
      <span className="inline-flex items-center text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">
        Overdue
      </span>
    );
  return null;
};

const ReviewBadge = ({ status }: { status: string }) => {
  if (status === "Done")
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">
        <Check className="w-3 h-3" />
        Done
      </span>
    );
  return (
    <span className="inline-flex items-center text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
      Not started
    </span>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const TeamOverview: React.FC = () => {
  const { isMobile, isTablet } = useScreenSize();
  const isCompact = isMobile || isTablet;

  return (
    <main
      className={`min-h-full overflow-y-auto overflow-x-hidden bg-[#f8fafc] font-sans ${isMobile ? "p-4" : "p-8"}`}
    >
      <div className="mx-auto w-full max-w-screen space-y-5">
        {/* ── Hero Card ───────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden p-6">
          <div
            className={`flex ${isCompact ? "flex-col gap-4" : "items-start justify-between"} mb-6`}
          >
            {/* Left */}
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  CYCLE LIVE
                </div>
                <Typography
                  variant="caption"
                  className="text-gray-500 font-medium"
                >
                  Apr 2026 → Mar 2027 · India Tech
                </Typography>
              </div>
              <div className="pt-0.5">
                <h1 className="text-xl font-bold text-gray-900 mb-1">
                  FY26 Annual Performance Cycle
                </h1>
                <Typography
                  variant="bodySmall"
                  className="text-gray-500 font-medium"
                >
                  Your team · 8 reportees · India Tech BU
                </Typography>
              </div>
            </div>
            {/* Right */}
            <div
              className={`flex ${isCompact ? "w-full" : "items-end"} gap-2 shrink-0`}
            >
              <div className="flex flex-col items-center">
                <Typography
                  variant="caption"
                  className="text-gray-400 uppercase tracking-widest font-bold text-[10px]"
                >
                  NEXT DEADLINE
                </Typography>
                <Typography
                  variant="bodySmall"
                  className="text-[#1a73e8] font-bold"
                >
                  Self-Review due 21 May
                </Typography>
              </div>
              <Button
                variant="contain"
                bgColor="primary"
                className={`${isCompact ? "w-full" : "px-5 py-2.5"} bg-[#1a73e8] hover:bg-blue-600 font-semibold rounded-lg shadow-sm text-sm inline-flex items-center justify-center`}
              >
                Continue Self-Review <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide">
            {[
              { n: null, label: "Goal Setting", done: true },
              { n: 2, label: "Self-Review", active: true },
              { n: 3, label: "Manager Review", done: false },
              { n: 4, label: "Calibration", done: false },
              { n: 5, label: "Released", done: false },
            ].map((step, idx) => (
              <React.Fragment key={step.label}>
                {idx > 0 && (
                  <div className="h-px w-10 shrink-0 bg-gray-200 mx-3" />
                )}
                <div
                  className={`flex items-center gap-2 shrink-0 ${!step.done && !step.active ? "opacity-40" : ""}`}
                >
                  {step.done ? (
                    <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                  ) : (
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step.active ? "bg-[#1a73e8] text-white" : "bg-gray-100 text-gray-500"}`}
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

        {/* ── Stats ───────────────────────────────────────────────────── */}
        <section
          className={`grid ${isCompact ? "grid-cols-2" : "grid-cols-5"} gap-4`}
        >
          {STATS.map((stat, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[100px]"
            >
              <Typography
                variant="caption"
                className="text-gray-400 uppercase tracking-wider block font-semibold text-[10px] mb-2"
              >
                {stat.label}
              </Typography>
              <div>
                <Typography
                  variant="h2"
                  className={`${stat.valueColor} leading-none mb-1 font-bold tracking-tight text-2xl`}
                >
                  {stat.value}
                </Typography>
                <Typography variant="caption" className="text-gray-500">
                  {stat.sub}
                </Typography>
              </div>
            </div>
          ))}
        </section>

        {/* ── My Team ─────────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden pt-4">
          {/* Section header */}
          <div
            className={`flex ${isCompact ? "flex-col gap-3" : "items-center justify-between"} px-6 pb-4`}
          >
            <div className="flex items-center pl-4">
              <span className="bg-gray-100 text-gray-500 text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full">
                8
              </span>
            </div>
            <div
              className={`flex items-center gap-3 ${isCompact ? "flex-wrap w-full" : ""}`}
            >
              <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 font-medium hover:bg-gray-50 transition-colors bg-white">
                All status <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 font-medium hover:bg-gray-50 transition-colors bg-white">
                Sort: progress{" "}
                <ArrowUp className="w-3 h-3 text-gray-400 rotate-180" />
              </button>
              <Button
                variant="contain"
                bgColor="primary"
                className={`${isCompact ? "flex-1" : "px-4 py-1.5"} text-xs font-semibold bg-[#1a73e8] hover:bg-blue-600 rounded-lg`}
              >
                Nudge 2 overdue
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table
              className="w-full text-left border-collapse"
              style={{ minWidth: 900 }}
            >
              <thead>
                <tr className="border-y border-gray-100">
                  <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-[240px]">
                    Employee
                  </th>
                  <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-[100px]">
                    Goals
                  </th>
                  <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-[160px]">
                    Progress
                  </th>
                  <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-[120px]">
                    Self
                  </th>
                  <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-[130px]">
                    My Review
                  </th>
                  <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-[140px]">
                    Last Rating
                  </th>
                  <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center w-[110px]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {TEAM_MEMBERS.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    {/* Employee */}
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[11px] font-bold shrink-0">
                          {m.initials}
                        </div>
                        <div>
                          <span className="font-semibold text-[13px] text-gray-900 block">
                            {m.name}
                          </span>
                          <span className="text-[11px] text-gray-500 block">
                            {m.role} · {m.tenure}
                          </span>
                        </div>
                      </div>
                    </td>
                    {/* Goals */}
                    <td className="py-3 px-4">
                      <span className="text-[12px] text-gray-500">
                        <span className="font-semibold text-gray-900">
                          {m.goals}
                        </span>{" "}
                        goals
                      </span>
                    </td>
                    {/* Progress */}
                    <td className="py-3 px-4">
                      <span className="text-[11px] text-gray-600 font-medium block mb-1">
                        {m.progress}%
                      </span>
                      <div className="flex items-center w-[130px]">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-md bg-gray-100">
                          <div
                            className={`h-full rounded-md ${getProgressColor(m.progress)}`}
                            style={{ width: `${m.progress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    {/* Self */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <SelfBadge status={m.self} />
                    </td>
                    {/* My Review */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <ReviewBadge status={m.review} />
                    </td>
                    {/* Last Rating */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {m.lastRating ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${m.ratingColor}`}
                          />
                          <span
                            className={`text-[11px] font-bold ${m.ratingText}`}
                          >
                            {m.lastRating}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400">—</span>
                      )}
                    </td>
                    {/* Action */}
                    <td className="py-3 px-6 whitespace-nowrap text-center">
                      {m.action === "Review" && (
                        <button className="bg-[#1a73e8] hover:bg-blue-600 text-white px-3 py-1.5 text-[11px] font-semibold rounded-md w-24 inline-flex items-center justify-center transition-colors">
                          Review <ArrowRight className="w-3 h-3 ml-1" />
                        </button>
                      )}
                      {m.action === "Nudge" && (
                        <button className="bg-[#1a73e8] hover:bg-blue-600 text-white px-3 py-1.5 text-[11px] font-semibold rounded-md w-24 inline-flex items-center justify-center transition-colors">
                          Nudge
                        </button>
                      )}
                      {m.action === "View" && (
                        <button className="border border-blue-200 text-[#1a73e8] bg-white hover:bg-blue-50 px-3 py-1.5 text-[11px] font-semibold rounded-md w-24 inline-flex items-center justify-center transition-colors">
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
};

export default TeamOverview;
