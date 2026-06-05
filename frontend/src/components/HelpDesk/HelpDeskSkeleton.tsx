import React from "react";
import { useScreenSize } from "../../hooks/useScreenSize";

// Reusable shimmer line
const ShimmerLine = ({
  width = "w-full",
  height = "h-4",
  className = "",
}: {
  width?: string;
  height?: string;
  className?: string;
}) => (
  <div
    className={`${height} ${width} rounded-md bg-gray-200 animate-pulse ${className}`}
  />
);

// ─── Stats Cards Skeleton ────────────────────────────────────────────────────
const StatCardsSkeleton = () => (
  <div className="grid grid-rows-2 grid-flow-col auto-cols-[45%] min-[480px]:auto-cols-[36%] sm:auto-cols-[25%] md:grid-cols-4 md:grid-rows-none md:grid-flow-row gap-3 sm:gap-4 w-full overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-hide">
    {Array.from({ length: 8 }).map((_, i) => (
      <div
        key={i}
        className="flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] animate-pulse"
      >
        <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
          <div className="p-2.5 sm:p-3 rounded-xl bg-gray-100 shrink-0">
            <div className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="w-10 h-6 sm:w-12 sm:h-8 bg-gray-200 rounded" />
        </div>
        <div className="w-20 sm:w-24 h-3 sm:h-4 bg-gray-200 rounded animate-pulse" />
      </div>
    ))}
  </div>
);

// ─── Page Header Skeleton ────────────────────────────────────────────────────
const PageHeadingSkeleton = () => (
  <div className="flex flex-col gap-2">
    <ShimmerLine width="w-44" height="h-7" />
    <ShimmerLine width="w-64" height="h-4" />
  </div>
);

// ─── Desktop Table Skeleton ──────────────────────────────────────────────────
const DesktopTableSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
    {/* Search bar row */}
    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
      <div className="flex-1 h-9 bg-gray-100 rounded-lg animate-pulse" />
      <div className="w-9 h-9 bg-gray-100 rounded-lg animate-pulse" />
    </div>

    {/* thead */}
    <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 grid grid-cols-7 gap-4">
      {["Issue ID", "Issue Title", "Category", "Sub Category", "Assigned to", "Created on", "Status"].map((col) => (
        <ShimmerLine key={col} width="w-full" height="h-4" />
      ))}
    </div>

    {/* rows */}
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className={`px-6 py-4 grid grid-cols-7 gap-4 border-b border-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}
      >
        {Array.from({ length: 6 }).map((__, j) => (
          <ShimmerLine key={j} width={j === 1 ? "w-4/5" : "w-3/4"} height="h-4" />
        ))}
        {/* Status badge */}
        <div className="w-16 h-6 bg-blue-100 rounded-lg animate-pulse" />
      </div>
    ))}

    {/* Pagination row */}
    <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
      <ShimmerLine width="w-40" height="h-4" />
      <div className="flex items-center gap-3">
        <ShimmerLine width="w-24" height="h-4" />
        <ShimmerLine width="w-20" height="h-8" />
      </div>
    </div>
  </div>
);

// ─── Mobile Card Skeleton ────────────────────────────────────────────────────
const MobileCardSkeleton = () => (
  <div className="rounded-2xl my-2 border-t-4 border-x border-b border-x-gray-200 border-b-gray-200 border-primary/30 p-6 bg-white animate-pulse flex flex-col gap-5">
    {/* Header */}
    <div className="flex justify-between items-start">
      <div className="flex flex-col gap-2">
        <ShimmerLine width="w-10" height="h-3" />
        <ShimmerLine width="w-24" height="h-5" />
      </div>
      <div className="w-16 h-6 bg-blue-100 rounded-lg" />
    </div>

    {/* Data fields 2x2 */}
    <div className="flex flex-wrap gap-5">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`flex flex-col gap-2 flex-1 min-w-[calc(50%-0.625rem)] ${i % 2 === 1 ? "items-end" : ""}`}
        >
          <ShimmerLine width="w-16" height="h-3" />
          <ShimmerLine width="w-24" height="h-4" />
        </div>
      ))}
    </div>

    {/* Footer */}
    <div>
      <div className="h-px w-full bg-gray-100 mb-4" />
      <div className="flex justify-between items-center">
        <ShimmerLine width="w-36" height="h-3" />
        <div className="flex gap-2">
          <div className="w-8 h-8 bg-gray-200 rounded-md" />
          <div className="w-8 h-8 bg-gray-200 rounded-md" />
        </div>
      </div>
    </div>
  </div>
);

const MobileTableSkeleton = () => (
  <div className="px-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <MobileCardSkeleton key={i} />
    ))}
  </div>
);

// ─── Full HelpDesk Skeleton ──────────────────────────────────────────────────
const HelpDeskSkeleton: React.FC = () => {
  const { isDesktop } = useScreenSize();

  if (isDesktop) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        {/* Stats row */}
        <StatCardsSkeleton />

        {/* Heading */}
        <PageHeadingSkeleton />

        {/* Table wrapper card */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <DesktopTableSkeleton />
        </div>
      </div>
    );
  }

  // Mobile
  return (
    <div className="space-y-4 pb-24">
      {/* Stats (2-col grid on mobile) */}
      <div className="px-4 pt-4">
        <StatCardsSkeleton />
      </div>

      {/* Heading */}
      <div className="px-4">
        <PageHeadingSkeleton />
      </div>

      {/* Ticket cards */}
      <MobileTableSkeleton />
    </div>
  );
};

export default HelpDeskSkeleton;
