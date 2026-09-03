import { Typography } from "../../../shared/atoms/Typography";
import Badge from "../../../shared/Badge";

export const SelfReviewRightSidebar = () => {
  return (
    <div className="w-full xl:w-80 shrink-0 grid gap-4 md:grid-cols-2 xl:flex xl:flex-col">
      {/* AI Highlight */}
      <div className="bg-purple-500/10 rounded-xl border border-purple-500/30 p-4 sm:p-5 md:col-span-2 xl:col-span-1">
        
        <Typography
          variant="bodyMedium"
          className="text-text-title leading-relaxed"
        >
          From your 11 check-ins this quarter, the achievement most-mentioned by
          peers is the{" "}
          <span className="font-semibold text-primary">
            Oxygen 2.0 dashboard rebuild
          </span>{" "}
          — 6 of 4 peer reviewers cited it as their top callout.
        </Typography>
      </div>

      {/* Reviewer Visibility */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-4 sm:p-5">
        <Typography
          variant="caption"
          color="body2"
          className="font-semibold tracking-wider mb-4 block uppercase"
        >
          REVIEWER VISIBILITY
        </Typography>

        <div className="flex flex-col gap-4 sm:gap-5">
          <div>
            <Typography
              variant="bodyMedium"
              className="font-semibold text-text-title"
            >
              Rohit Khanna &middot; Manager
            </Typography>
            <Typography
              variant="caption"
              color="body2"
              className="mt-0.5 block"
            >
              Sees: All sections
            </Typography>
          </div>
          <div>
            <Typography
              variant="bodyMedium"
              className="font-semibold text-text-title"
            >
              Aditi Sharma &middot; Skip
            </Typography>
            <Typography
              variant="caption"
              color="body2"
              className="mt-0.5 block"
            >
              Sees: Manager rating + comments
            </Typography>
          </div>
          <div>
            <Typography
              variant="bodyMedium"
              className="font-semibold text-text-title"
            >
              Peers (4)
            </Typography>
            <Typography
              variant="caption"
              color="body2"
              className="mt-0.5 block"
            >
              Sees: Achievements + Development only
            </Typography>
          </div>
        </div>
      </div>

      {/* Last Cycle */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-4 sm:p-5">
        <Typography
          variant="caption"
          color="body2"
          className="font-semibold tracking-wider mb-4 block uppercase"
        >
          LAST CYCLE (FY25)
        </Typography>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Badge label="Exceeds · 4/5" variant="success" size="md" />
          <Typography variant="caption" color="body2" className="leading-tight">
            Final &middot; Released 12 Apr
            <br />
            2025
          </Typography>
        </div>

        <Typography
          variant="bodyMedium"
          color="body2"
          className="italic leading-relaxed"
        >
          "Pallavi consistently demonstrates Learner's Mindset; ready to step
          into senior leadership."
        </Typography>
        <Typography variant="caption" color="body2" className="mt-3 block">
          — Rohit Khanna
        </Typography>
      </div>
    </div>
  );
};
