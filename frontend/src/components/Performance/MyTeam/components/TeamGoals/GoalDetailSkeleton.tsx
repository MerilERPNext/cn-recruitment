import React from "react";
import { useScreenSize } from "../../../../../hooks/useScreenSize";

export const GoalDetailSkeleton: React.FC = () => {
  const { isMobile } = useScreenSize();

  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading goal details">
      {/* Title & Avatar Skeleton */}
      <div className="space-y-3">
        <div className="h-7 w-2/3 max-w-md rounded-lg bg-slate-500/20" />
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-slate-500/20 shrink-0" />
          <div className="h-4 w-64 max-w-full rounded bg-slate-500/10" />
        </div>
      </div>

      {/* Meta Grid Skeleton (Responsive: 2 cols on mobile, 4 cols on desktop) */}
      <div className={`grid ${isMobile ? "grid-cols-2" : "grid-cols-4"} gap-6`}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-16 rounded bg-slate-500/20" />
            <div className="h-4 w-24 rounded bg-slate-500/30" />
          </div>
        ))}
      </div>

      {/* Description Skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-24 rounded bg-slate-500/20" />
        <div className="rounded-xl border border-border bg-slate-500/10 p-4 space-y-2">
          <div className="h-4 w-full rounded bg-slate-500/20" />
          <div className="h-4 w-4/5 rounded bg-slate-500/20" />
        </div>
      </div>

      {/* Key Results Skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-32 rounded bg-slate-500/20" />
        <div className="space-y-2">
          {[1, 2, 3].map((kr) => (
            <div
              key={kr}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="h-6 w-12 rounded-md bg-purple-500/20 shrink-0" />
                <div className="h-4 w-3/4 rounded bg-slate-500/20" />
              </div>
              <div className="h-4 w-16 rounded bg-slate-500/20 shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Add Comment Skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-44 rounded bg-slate-500/20" />
        <div className="h-24 w-full rounded-xl border border-border bg-slate-500/10" />
      </div>

      {/* Audit Block Skeleton */}
      <div className="rounded-xl bg-slate-500/10 p-4 space-y-2">
        <div className="h-3 w-16 rounded bg-slate-500/20" />
        <div className="h-4 w-full rounded bg-slate-500/20" />
        <div className="h-4 w-3/4 rounded bg-slate-500/20" />
      </div>
    </div>
  );
};

export default GoalDetailSkeleton;
