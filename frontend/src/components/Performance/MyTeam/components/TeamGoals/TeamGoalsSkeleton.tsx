import React from "react";

interface TeamGoalsSkeletonProps {
  showHeaderOnly?: boolean;
}

export const TeamGoalsHeaderSkeleton: React.FC = () => {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm animate-pulse">
      {/* Header top section */}
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="space-y-2">
          <div className="h-6 w-36 rounded-md bg-slate-500/20" />
          <div className="h-4 w-64 rounded-md bg-slate-500/10" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-32 rounded-lg bg-slate-500/20" />
          <div className="h-9 w-28 rounded-lg bg-primary/20" />
        </div>
      </div>

      {/* 3 Stat cards */}
      <div className="grid max-w-xl grid-cols-3 gap-2 p-4 sm:p-5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex flex-col justify-between rounded-xl bg-slate-500/10 p-3.5 sm:p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-slate-500/20" />
              <div className="h-3 w-16 rounded bg-slate-500/20" />
            </div>
            <div className="h-6 w-8 rounded bg-slate-500/30" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const TeamGoalsListSkeleton: React.FC = () => {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2].map((item) => (
        <div
          key={item}
          className="rounded-xl border border-border overflow-hidden bg-card"
        >
          <div className="flex items-center justify-between bg-slate-500/10 p-3.5 sm:px-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-500/20" />
              <div className="space-y-1.5">
                <div className="h-4 w-36 rounded bg-slate-500/30" />
                <div className="h-3 w-48 rounded bg-slate-500/20" />
              </div>
            </div>
            <div className="h-4 w-4 rounded bg-slate-500/20" />
          </div>

          {item === 1 && (
            <div className="p-3.5 border-t border-border flex items-center justify-between bg-card">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded bg-slate-500/20" />
                <div className="h-5 w-12 rounded bg-purple-500/20" />
                <div className="h-4 w-48 rounded bg-slate-500/20" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-28 rounded bg-slate-500/20" />
                <div className="h-5 w-16 rounded-md bg-red-500/20" />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export const TeamGoalsSkeleton: React.FC<TeamGoalsSkeletonProps> = ({ showHeaderOnly = false }) => {
  if (showHeaderOnly) {
    return <TeamGoalsHeaderSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <TeamGoalsHeaderSkeleton />
      <TeamGoalsListSkeleton />
    </div>
  );
};

export default TeamGoalsSkeleton;
