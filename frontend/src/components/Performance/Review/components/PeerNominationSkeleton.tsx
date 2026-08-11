import React from 'react';
import PerformanceSkeleton from '../../PerformanceSkeleton';

export const PeerNominationSkeleton: React.FC = () => {
  return (
    <PerformanceSkeleton className="w-full min-w-0 max-w-full">
      <div className="flex flex-col rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden min-w-0 max-w-full">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between gap-4 min-w-0">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="h-5 w-32 rounded-full bg-purple-100/80" />
            <div className="h-6 sm:h-7 w-56 sm:w-72 rounded bg-gray-200" />
            <div className="h-4 w-full max-w-[500px] rounded bg-gray-200" />
          </div>
          <div className="h-14 w-24 rounded-lg bg-gray-100/80 shrink-0 self-end sm:self-auto" />
        </div>

        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between gap-3 min-w-0">
          <div className="h-10 w-full sm:w-72 rounded-lg bg-gray-100/80" />
          <div className="h-10 w-36 rounded-lg bg-gray-100/80 shrink-0" />
        </div>

        <div className="bg-gray-50/50 p-4 border-b border-gray-100 flex justify-between items-center min-w-0">
          <div className="h-4 w-40 rounded bg-gray-200" />
          <div className="h-3 w-48 rounded bg-gray-200 hidden sm:block" />
        </div>

        <div className="divide-y divide-gray-100 min-w-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="h-10 w-10 rounded-full bg-gray-200 shrink-0" />
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="h-4 w-36 rounded bg-gray-200" />
                  <div className="h-3 w-24 rounded bg-gray-200" />
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                <div className="h-6 w-32 rounded-md bg-purple-100/70" />
                <div className="h-8 w-20 rounded-lg bg-gray-200 shrink-0" />
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 m-4 rounded-xl border border-amber-100 bg-amber-50/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 min-w-0">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="h-4 w-32 rounded bg-amber-200/70" />
            <div className="h-3 w-full max-w-[500px] rounded bg-amber-200/50" />
          </div>
          <div className="h-9 w-32 rounded-lg bg-blue-500/30 shrink-0" />
        </div>
      </div>
    </PerformanceSkeleton>
  );
};

export default PeerNominationSkeleton;
