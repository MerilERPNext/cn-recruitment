import React from "react";
import { useScreenSize } from "../../../../hooks/useScreenSize";

interface SeparationWorkflowSkeletonProps {
  rows?: number;
}

const SeparationWorkflowSkeleton: React.FC<SeparationWorkflowSkeletonProps> = ({
  rows = 5,
}) => {
  const { isDesktop } = useScreenSize();

  if (isDesktop) {
    return (
      <div className="sm:px-7 px-4 w-full overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm animate-pulse">
        {/* Table Header */}
        <div className="grid grid-cols-4 border-b border-gray-200 py-3 px-4">
          {["Stage No.", "Status", "Due Date", "Actions"].map((_, i) => (
            <div key={i} className="flex justify-center">
              <div className="h-4 bg-gray-200 rounded w-20" />
            </div>
          ))}
        </div>

        {/* Table Rows */}
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="grid grid-cols-4 py-4 px-4 border-b border-gray-100 last:border-b-0"
          >
            {/* Stage No. */}
            <div className="flex justify-center items-center">
              <div className="h-4 bg-gray-200 rounded w-6" />
            </div>

            {/* Status Badge */}
            <div className="flex justify-center items-center">
              <div className="h-5 bg-gray-200 rounded-md w-20" />
            </div>

            {/* Due Date */}
            <div className="flex justify-center items-center">
              <div className="h-4 bg-gray-200 rounded w-24" />
            </div>

            {/* Actions */}
            <div className="flex justify-center items-center">
              <div className="h-8 bg-gray-200 rounded-md w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Mobile: Timeline card skeleton ──
  return (
    <div className="flex flex-col gap-0 py-2 animate-pulse">
      {Array.from({ length: rows }).map((_, idx) => {
        const isLast = idx === rows - 1;
        return (
          <div key={idx} className="relative flex gap-4 w-full last:mb-0 mb-10 pl-2">
            {/* Timeline connector + circle */}
            <div className="relative flex flex-col items-center">
              {/* Connector line */}
              {!isLast && (
                <div
                  className="absolute top-5 left-1/2 -translate-x-1/2 w-0.5 bg-gray-200"
                  style={{ height: "calc(100% + 2.5rem)", zIndex: 0 }}
                />
              )}

              {/* Circle icon skeleton */}
              <div className="relative flex items-center justify-center">
                <div className="z-10 w-9 h-9 rounded-full bg-gray-200" />
              </div>
            </div>

            {/* Card skeleton */}
            <div className="flex-1 min-w-0 pr-2 pb-2">
              <div className="bg-white rounded-2xl border-t-4 border-x border-b border-x-gray-200 border-b-gray-200 shadow-sm border-t-gray-200 px-4 py-4">
                {/* Header: Stage label + status badge */}
                <div className="flex justify-between items-start gap-3 mb-3">
                  <div className="flex flex-col gap-1">
                    <div className="h-3 bg-gray-200 rounded w-12" />
                    <div className="h-4 bg-gray-200 rounded w-32 mt-1" />
                  </div>
                  <div className="h-5 bg-gray-200 rounded-md w-20 flex-shrink-0" />
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-100 w-full mb-3" />

                {/* Body rows */}
                <div className="space-y-2.5">
                  {/* Assigned To */}
                  <div className="flex justify-between items-center gap-4">
                    <div className="h-3 bg-gray-200 rounded w-24 shrink-0" />
                    <div className="h-3 bg-gray-200 rounded w-28" />
                  </div>

                  {/* Date */}
                  <div className="flex justify-between items-center gap-4">
                    <div className="h-3 bg-gray-200 rounded w-12 shrink-0" />
                    <div className="h-3 bg-gray-200 rounded w-20" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SeparationWorkflowSkeleton;
