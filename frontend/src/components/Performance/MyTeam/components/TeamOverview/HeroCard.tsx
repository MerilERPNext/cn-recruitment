import { ArrowRight, Check } from "lucide-react";
import React from "react";
import Button from "../../../../shared/atoms/Button";
import { Typography } from "../../../../shared/atoms/Typography";

const steps = [
  { n: null, label: "Goal Setting", done: true },
  { n: 2, label: "Self-Review", active: true },
  { n: 3, label: "Manager Review", done: false },
  { n: 4, label: "Calibration", done: false },
  { n: 5, label: "Released", done: false },
];

interface HeroCardProps {
  isCompact: boolean;
  setActiveTab: React.Dispatch<React.SetStateAction<"overview" | "goals" | "reviews" | "calibration" | "check-ins">>
}

const HeroCard: React.FC<HeroCardProps> = ({ isCompact, setActiveTab }) => {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
      <div
        className={`mb-5 flex ${isCompact ? "flex-col gap-4" : "items-start justify-between"} lg:mb-6`}
      >
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              CYCLE LIVE
            </div>
            <Typography variant="caption" className="text-gray-500 font-medium">
              Apr 2026 → Mar 2027 · India Tech
            </Typography>
          </div>
          <div className="pt-0.5">
            <h1 className="mb-1 text-xl font-bold leading-tight text-slate-950">
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
        <div
          className={`flex ${isCompact ? "w-full flex-col sm:flex-row items-start sm:items-center sm:justify-between" : "items-end"} gap-4 shrink-0`}
        >
          <div className="flex flex-col items-start sm:items-center">
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
            onClick={()=>setActiveTab("reviews")}
            className={`${isCompact ? "w-full sm:w-auto" : "px-5 py-2.5"} bg-[#1a73e8] hover:bg-blue-600 font-semibold rounded-lg shadow-sm text-sm inline-flex items-center justify-center`}
          >
            Continue Self-Review <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-0 overflow-x-auto pb-1 scrollbar-hide">
        {steps.map((step, idx) => (
          <React.Fragment key={step.label}>
            {idx > 0 && <div className="h-px w-10 shrink-0 bg-gray-200 mx-3" />}
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
  );
};

export default HeroCard;
