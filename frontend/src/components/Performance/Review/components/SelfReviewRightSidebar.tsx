import { Sparkles } from "lucide-react";
import { Typography } from "../../../shared/atoms/Typography";
import Badge from "../../../shared/Badge";

export const SelfReviewRightSidebar = () => {
  return (
    <div className="w-full xl:w-80 shrink-0 grid gap-4 md:grid-cols-2 xl:flex xl:flex-col">
      {/* AI Highlight */}
      <div className="bg-purple-50/50 rounded-xl border border-purple-100 p-4 sm:p-5 md:col-span-2 xl:col-span-1">
        
        <Typography
          variant="bodyMedium"
          className="text-gray-700 leading-relaxed"
        >
          From your 11 check-ins this quarter, the achievement most-mentioned by
          peers is the{" "}
          <span className="font-semibold text-gray-900">
            Oxygen 2.0 dashboard rebuild
          </span>{" "}
          — 6 of 4 peer reviewers cited it as their top callout.
        </Typography>
      </div>

      {/* Reviewer Visibility */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5">
        <Typography
          variant="caption"
          className="text-gray-500 font-semibold tracking-wider mb-4 block"
        >
          REVIEWER VISIBILITY
        </Typography>

        <div className="flex flex-col gap-4 sm:gap-5">
          <div>
            <Typography
              variant="bodyMedium"
              className="font-semibold text-gray-900"
            >
              Rohit Khanna &middot; Manager
            </Typography>
            <Typography
              variant="caption"
              className="text-gray-500 mt-0.5 block"
            >
              Sees: All sections
            </Typography>
          </div>
          <div>
            <Typography
              variant="bodyMedium"
              className="font-semibold text-gray-900"
            >
              Aditi Sharma &middot; Skip
            </Typography>
            <Typography
              variant="caption"
              className="text-gray-500 mt-0.5 block"
            >
              Sees: Manager rating + comments
            </Typography>
          </div>
          <div>
            <Typography
              variant="bodyMedium"
              className="font-semibold text-gray-900"
            >
              Peers (4)
            </Typography>
            <Typography
              variant="caption"
              className="text-gray-500 mt-0.5 block"
            >
              Sees: Achievements + Development only
            </Typography>
          </div>
        </div>
      </div>

      {/* Last Cycle */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5">
        <Typography
          variant="caption"
          className="text-gray-500 font-semibold tracking-wider mb-4 block"
        >
          LAST CYCLE (FY25)
        </Typography>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Badge label="Exceeds · 4/5" variant="success" size="md" />
          <Typography variant="caption" className="text-gray-500 leading-tight">
            Final &middot; Released 12 Apr
            <br />
            2025
          </Typography>
        </div>

        <Typography
          variant="bodyMedium"
          className="text-gray-600 italic leading-relaxed"
        >
          "Pallavi consistently demonstrates Learner's Mindset; ready to step
          into senior leadership."
        </Typography>
        <Typography variant="caption" className="text-gray-400 mt-3 block">
          — Rohit Khanna
        </Typography>
      </div>
    </div>
  );
};
