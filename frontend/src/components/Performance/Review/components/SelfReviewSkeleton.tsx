import React from 'react';
import PerformanceSkeleton from '../../PerformanceSkeleton';

export const SelfReviewSkeleton: React.FC = () => {
  return (
    <PerformanceSkeleton className="space-y-4 sm:space-y-6 flex-1 min-w-0 max-w-full">
      <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm space-y-3 min-w-0">
        <div className="h-3.5 w-24 rounded bg-gray-200" />
        <div className="h-6 sm:h-7 w-48 sm:w-64 rounded bg-gray-200" />
        <div className="h-4 w-full max-w-[600px] rounded bg-gray-200" />
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm space-y-5 min-w-0">
        <div className="flex justify-between items-center min-w-0">
          <div className="h-4 w-32 sm:w-36 rounded bg-gray-200" />
          <div className="h-7 w-16 rounded-md bg-gray-200 shrink-0" />
        </div>
        <div className="h-11 w-full rounded-xl bg-gray-100/80" />

        <div className="space-y-2 pt-2 min-w-0">
          <div className="h-4 w-44 sm:w-52 rounded bg-gray-200" />
          <div className="h-28 w-full rounded-xl bg-gray-100/80" />
        </div>

        <div className="flex items-center justify-between pt-1 min-w-0">
          <div className="h-4 w-48 sm:w-56 rounded bg-gray-200" />
          <div className="h-3 w-16 rounded bg-gray-200 shrink-0" />
        </div>
      </div>
    </PerformanceSkeleton>
  );
};

export default SelfReviewSkeleton;
