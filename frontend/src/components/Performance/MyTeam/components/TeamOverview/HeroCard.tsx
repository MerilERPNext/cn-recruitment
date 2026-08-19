import { ArrowRight, Check } from "lucide-react";
import React from "react";
import Button from "../../../../shared/atoms/Button";
import { Typography } from "../../../../shared/atoms/Typography";
import Badge from "../../../../shared/Badge";

import { useNavigate } from "react-router-dom";

const steps = [
  { n: null, label: "Goal Setting", done: true },
  { n: 2, label: "Self-Review", active: true },
  { n: 3, label: "Manager Review", done: false },
  { n: 4, label: "Calibration", done: false },
  { n: 5, label: "Released", done: false },
];

interface HeroCardProps {
  isCompact: boolean;
}

const HeroCard: React.FC<HeroCardProps> = ({ isCompact }) => {
  const navigate = useNavigate();

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
      <div aria-label="Cycle Details" className="mb-5 flex min-w-0 flex-col justify-between gap-4 sm:mb-6 md:flex-row md:items-center">
        <div className="min-w-0">
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <Badge label="CYCLE LIVE" backgroundColor="bg-blue-100 " textColor="text-blue-700" size="sm" pulse={{ show: true, color: "bg-blue-600" }} />
            <Typography variant="bodySmall" className="break-words text-gray-500">Apr 2026 &rarr; Mar 2027 &middot; India Tech</Typography>
          </div>
          <Typography variant="h3" className="break-words text-xl leading-tight sm:text-2xl font-bold text-slate-900">FY26 Annual Performance Cycle</Typography>
          <Typography variant="bodySmall" className="mt-1 block break-words text-gray-500">Your team &middot; 8 reportees &middot; India Tech BU</Typography>
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
                Self-Review due 21 May
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

      <div className="flex items-center justify-between gap-1 overflow-x-auto pt-4 border-t border-slate-100 scrollbar-hide">
        {steps.map((step, idx) => (
          <React.Fragment key={step.label}>
            {idx > 0 && <div className="h-px min-w-[12px] max-w-[36px] flex-1 bg-gray-200 mx-1 sm:mx-2 shrink-0" />}
            <div
              className={`flex items-center gap-1.5 sm:gap-2 shrink-0 ${!step.done && !step.active ? "opacity-40" : ""}`}
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
                className={`whitespace-nowrap font-medium text-[11px] sm:text-xs ${step.active ? "text-[#1a73e8] font-bold" : step.done ? "text-green-600 font-bold" : "text-gray-500"}`}
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
