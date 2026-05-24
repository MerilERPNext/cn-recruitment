import { Check, ChevronDown } from "lucide-react";
import React from "react";
import { useScreenSize } from "../../../hooks/useScreenSize";
import Avatar from "../../shared/Avatar";
import Button from "../../shared/atoms/Button";
import { CALIBRATION_EMPLOYEES, DISTRIBUTION } from "./mockData";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getRatingColor = (rating: any) => {
  switch (rating) {
    case "Outstanding":
    case "Exceeds":
      return { text: "text-green-700", dot: "bg-green-500", bg: "bg-green-50" };
    case "Meets":
      return { text: "text-blue-600", dot: "bg-blue-500", bg: "bg-blue-50" };
    case "Below":
      return { text: "text-amber-600", dot: "bg-amber-500", bg: "bg-amber-50" };
    case "Unsatisfactory":
      return { text: "text-red-600", dot: "bg-red-500", bg: "bg-red-50" };
    default:
      return {
        text: "text-gray-400",
        dot: "bg-transparent",
        bg: "bg-transparent",
      };
  }
};

const RatingCell = ({ rating }: { rating: any }) => {
  if (rating === "-") return <span className="text-gray-400 font-bold">—</span>;

  const { text, dot, bg } = getRatingColor(rating);

  return (
    <div
      className={`flex items-center gap-1.5 ${text} ${bg} font-bold text-xs px-2 py-0.5 rounded-xl w-fit`}
    >
      <div className={`w-1.5 h-1.5 rounded-xl ${dot}`} />
      {rating}
    </div>
  );
};

const NineBox = ({ highlight }: { highlight: [number, number] }) => (
  <div className="grid grid-cols-3 gap-[2px] w-[28px] h-[28px]">
    {[0, 1, 2].map((r) =>
      [0, 1, 2].map((c) => {
        const isHighlighted = r === highlight[0] && c === highlight[1];
        return (
          <div
            key={`${r}-${c}`}
            className={`w-[8px] h-[8px] rounded-[1px] flex items-center justify-center ${isHighlighted ? "bg-[#1a73e8]" : "bg-gray-100"}`}
          >
            {isHighlighted && (
              <div className="w-[3px] h-[3px] bg-white rounded-full" />
            )}
          </div>
        );
      }),
    )}
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

const TeamCalibration: React.FC = () => {
  const { isMobile, isTablet } = useScreenSize();
  const isCompact = isMobile || isTablet;

  // Max value in distribution to scale heights (60 is the max target)
  const maxScale = Math.max(...DISTRIBUTION.flatMap(b => [b.target, b.actual]), 100);

  return (
    <main
      className={`min-h-full overflow-y-auto overflow-x-hidden bg-[#f8fafc] font-sans ${isMobile ? "p-4" : "p-8 pb-32"}`}
    >
      <div className="mx-auto w-full max-w-screen space-y-5">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div
          className={`flex ${isCompact ? "flex-col gap-4" : "items-end justify-between"} mb-6`}
        >
          <div className="space-y-1">
            <span className="inline-block px-2.5 py-0.5 rounded-xl text-xs font-bold text-amber-800 bg-amber-100 mb-1">
              Pre-calibration - Manager view
            </span>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">
              Calibration Prep · Design Oxygen Team
            </h1>
            <span className="text-sm text-gray-500 font-medium block">
              Aditi Sharma's session · 5 Jun 2026 - 14:00 IST · Soft target
              distribution
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              bgColor="primary"
              size="sm"
              icon={
                <div className="grid grid-cols-3 gap-[1px] w-3 h-3">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="bg-[#1a73e8] rounded-[1px]" />
                  ))}
                </div>
              }
            >
              View team on 9-Box
            </Button>
            <Button variant="contain" bgColor="primary" size="sm">
              Submit my proposals
            </Button>
          </div>
        </div>

        {/* ── Distribution Card ───────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-6">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Your team's distribution
              </h3>
              <span className="text-xs text-gray-500">
                vs target (soft curve)
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-green-700 font-bold text-xs">
              <Check className="w-3.5 h-3.5" /> Within ±5% of target
            </div>
          </div>

          <div className="flex justify-between items-end h-[140px] px-8 mb-6">
            {DISTRIBUTION.map((bucket) => {
              const targetHeight = (bucket.target / maxScale) * 100;
              const actualHeight = (bucket.actual / maxScale) * 100;

              return (
                <div
                  key={bucket.label}
                  className="flex flex-col items-center gap-2.5 w-32 h-full"
                >
                  {/* Bars */}
                  <div className="flex items-end gap-1.5 h-full w-full justify-center">
                    <div
                      className="w-[12px] bg-gray-200 rounded-t-[2px]"
                      style={{ height: `${targetHeight}%` }}
                    />
                    <div
                      className={`w-[12px] rounded-t-[2px] ${bucket.isRed ? "bg-[#e11d48]" : "bg-[#1a73e8]"}`}
                      style={{ height: `${actualHeight}%` }}
                    />
                  </div>

                  {/* Labels */}
                  <div className="text-center shrink-0">
                    <div className="text-xs font-bold text-gray-900 leading-tight">
                      {bucket.label}
                    </div>
                    <div className="text-xs font-semibold text-gray-400 mt-[1px]">
                      Target {bucket.target}% / Actual {bucket.actual}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex justify-center items-center gap-6 text-xs font-bold text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-gray-200 rounded-sm" /> Target
              distribution
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-[#1a73e8] rounded-sm" /> Actual
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-[#e11d48] rounded-sm" /> Outside
              band
            </div>
          </div>
        </div>

        {/* ── Employee Table ──────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-widest text-center items-center">
            <div className="col-span-3 text-left">Employee</div>
            <div className="col-span-1">FY24</div>
            <div className="col-span-2">FY25</div>
            <div className="col-span-2">Self</div>
            <div className="col-span-2">Peer Avg</div>
            <div className="col-span-1">My Proposal</div>
            <div className="col-span-1 flex justify-center">9-Box</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100">
            {CALIBRATION_EMPLOYEES.map((emp) => (
              <div
                key={emp.id}
                className="grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-gray-50/50 transition-colors"
              >
                {/* Employee Info */}
                <div className="col-span-3 flex items-center gap-3">
                  <Avatar
                    name={emp.name}
                    fontSize="text-xs"
                    size="h-8 w-8"
                    avatarBgColor="bg-blue-50"
                    avatarTextColor="text-blue-600"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900 leading-tight">
                      {emp.name}
                    </span>
                    <span className="text-xs text-gray-500 mt-[1px]">
                      {emp.role}
                    </span>
                  </div>
                </div>

                {/* Ratings Columns */}
                <div className="col-span-1 flex justify-center">
                  <RatingCell rating={emp.fy24} />
                </div>
                <div className="col-span-2 flex justify-center">
                  <RatingCell rating={emp.fy25} />
                </div>
                <div className="col-span-2 flex justify-center">
                  <RatingCell rating={emp.self} />
                </div>
                <div className="col-span-2 flex justify-center">
                  <RatingCell rating={emp.peerAvg} />
                </div>

                {/* My Proposal Dropdown */}
                <div className="col-span-1 relative flex justify-center">
                  <select
                    className="appearance-none w-24 bg-white border border-gray-200 text-gray-900 text-xs font-bold rounded-md px-2.5 py-1.5 pr-6 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-shadow cursor-pointer"
                    defaultValue={emp.myProposal}
                    aria-label={`Select proposal rating for ${emp.name}`}
                  >
                    <option value="Outstanding">Outstanding</option>
                    <option value="Exceeds">Exceeds</option>
                    <option value="Meets">Meets</option>
                    <option value="Below">Below</option>
                    <option value="Unsatisfactory">Unsatisfactory</option>
                  </select>
                  <ChevronDown className="absolute right-6 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>

                {/* 9-Box Grid */}
                <div className="col-span-1 flex justify-center">
                  <NineBox highlight={emp.gridHighlight} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};

export default TeamCalibration;
