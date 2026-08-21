import React from "react";

interface TeamGoalsSkeletonProps {
  showHeaderOnly?: boolean;
}

export const TeamGoalsHeaderSkeleton: React.FC = () => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm animate-pulse">
      {/* Header top section */}
      <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="space-y-2">
          <div className="h-6 w-36 rounded-md bg-slate-200" />
          <div className="h-4 w-64 rounded-md bg-slate-100" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-32 rounded-lg bg-slate-200" />
          <div className="h-9 w-28 rounded-lg bg-blue-200" />
        </div>
      </div>

      {/* 3 Stat cards */}
      <div className="grid max-w-xl grid-cols-3 gap-2 p-4 sm:p-5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex flex-col justify-between rounded-xl bg-slate-50 p-3.5 sm:p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-slate-200" />
              <div className="h-3 w-16 rounded bg-slate-200" />
            </div>
            <div className="h-6 w-8 rounded bg-slate-300" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const TeamGoalsListSkeleton: React.FC = () => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 animate-pulse space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-40 rounded-md bg-slate-200" />
          <div className="h-3.5 w-56 rounded-md bg-slate-100" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-20 rounded-full bg-slate-100" />
          <div className="h-6 w-20 rounded-full bg-slate-100" />
        </div>
      </div>

      {/* Employee Accordion Items */}
      <div className="space-y-3 pt-2">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="rounded-xl border border-slate-200 overflow-hidden"
          >
            <div className="flex items-center justify-between bg-blue-50/50 p-3 sm:px-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-200" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 rounded bg-slate-300" />
                  <div className="h-3 w-48 rounded bg-slate-200" />
                </div>
              </div>
              <div className="h-4 w-4 rounded bg-slate-200" />
            </div>

            {/* Inner goal item if expanded preview */}
            {item === 1 && (
              <div className="p-3 border-t border-slate-100 space-y-2 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded bg-slate-200" />
                    <div className="h-5 w-12 rounded bg-purple-100" />
                    <div className="h-4 w-40 rounded bg-slate-200" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-28 rounded bg-slate-200" />
                    <div className="h-5 w-16 rounded-full bg-red-100" />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
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
