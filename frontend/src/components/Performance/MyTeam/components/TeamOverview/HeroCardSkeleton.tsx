import React from "react";

interface HeroCardSkeletonProps {
  isCompact?: boolean;
}

const HeroCardSkeleton: React.FC<HeroCardSkeletonProps> = ({ isCompact }) => {
  return (
    <div className="space-y-4 sm:space-y-5 animate-pulse">
      {/* Top Banner Skeleton */}
      <section className="overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5 lg:p-6">
        <div className="mb-5 flex min-w-0 flex-col justify-between gap-4 sm:mb-6 md:flex-row md:items-center">
          <div className="min-w-0 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="h-5 w-20 rounded-md bg-slate-500/20" />
              <div className="h-4 w-44 rounded bg-slate-500/20" />
            </div>
            <div className="h-7 w-64 rounded bg-slate-500/20" />
            <div className="h-4 w-48 rounded bg-slate-500/20" />
          </div>

          <div className="flex flex-col items-start md:items-end shrink-0 gap-2">
            <div className="h-3 w-24 rounded bg-slate-500/20" />
            <div className="h-4 w-32 rounded bg-slate-500/20" />
            <div className="h-9 w-40 rounded-lg bg-slate-500/20 mt-1" />
          </div>
        </div>

        {/* Stepper Skeleton */}
        <div className="flex items-center gap-4 overflow-x-auto pb-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <React.Fragment key={i}>
              {i > 1 && <div className="h-px w-8 bg-slate-500/20 shrink-0" />}
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-5 h-5 rounded-full bg-slate-500/20 shrink-0" />
                <div className="h-3 w-20 rounded bg-slate-500/20" />
              </div>
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* 6 Stat Cards Skeleton */}
      <section
        className={`grid ${
          isCompact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
        } gap-3 sm:gap-4`}
      >
        {[1, 2, 3, 4, 5, 6].map((idx) => (
          <div
            key={idx}
            className="flex min-h-[96px] min-w-0 flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-sm sm:min-h-[104px] sm:p-5"
          >
            <div className="h-3 w-28 rounded bg-slate-500/20 mb-2" />
            <div className="space-y-1.5">
              <div className="h-7 w-12 rounded bg-slate-500/20" />
              <div className="h-3 w-24 rounded bg-slate-500/20" />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};

export default HeroCardSkeleton;
