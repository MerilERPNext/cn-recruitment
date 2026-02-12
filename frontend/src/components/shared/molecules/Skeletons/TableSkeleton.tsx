import React from "react";
import { useScreenSize } from "../../../../hooks/useScreenSize";

function TableSkeleton({ columns = 4, rows = 5 }) {
  return (
    <div className="overflow-x-auto animate-pulse">
      <table className="min-w-full border border-gray-200 rounded-lg">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3 border-b">
                <div className="h-4 w-24 bg-gray-200 rounded" />
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-3">
                  <div className="h-4 w-full bg-gray-200 rounded" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TableSkeleton;

interface CardSkeletonProps {
  rows?: number;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({ rows = 6 }) => {
  const { isDesktop } = useScreenSize();

  if (!isDesktop) {
    // ================= MOBILE (FINAL VERSION - KEEPING YOUR APPROVED ONE) =================
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3"
          >
            <div className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-20" />
            </div>

            <div className="h-3 bg-gray-200 rounded w-2/3" />
            <div className="h-3 bg-gray-200 rounded w-3/4" />

            <div className="flex gap-3 pt-2">
              <div className="h-8 bg-gray-200 rounded-md flex-1" />
              <div className="h-8 bg-gray-200 rounded-md flex-1" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-xl bg-gray-100 animate-pulse my-4">
          <div className="px-4 py-2">
            <div className="flex items-center justify-between gap-1">
              <div>
                <div className="h-4 w-32 bg-gray-300 rounded mb-2"></div>
                <div className="h-3 w-24 bg-gray-300 rounded"></div>
              </div>
              <div className="h-6 w-16 bg-gray-300 rounded-md"></div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

interface DashboardContentSkeletonProps {
  cardCount?: number;
  tableRows?: number;
  showCards?: boolean;
  showTable?: boolean;
  titleWidth?: string;
}

const SkeletonBlock = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

export const DashboardContentSkeleton: React.FC<
  DashboardContentSkeletonProps
> = ({
  cardCount = 3,
  tableRows = 4,
  showCards = true,
  showTable = true,
  titleWidth = "w-48",
}) => {
  return (
    <div className="w-full min-h-screen bg-gray-50/50 sm:px-8 px-4 pt-8 pb-8">
      <div className="w-full">
        {/* Dropdown Skeleton */}
        <div className="mb-8 flex justify-between items-end">
          <div className="w-1/3">
            <div className="h-4 w-24 bg-gray-200 animate-pulse rounded mb-2" />
            <div className="h-11 w-64 bg-gray-200 animate-pulse rounded-lg" />
          </div>

          <div className="h-10 w-32 bg-gray-200 animate-pulse rounded-lg" />
        </div>

        {/* Reusable Cards + Table Skeleton */}
        <div className="space-y-8 p-4">
          {/* 🔹 Cards Section */}
          {showCards && (
            <div className="grid xl:grid-cols-3 sm:grid-cols-2 grid-cols-1 sm:gap-8 gap-4">
              {Array.from({ length: cardCount }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse bg-white border border-gray-100 h-32 rounded-xl shadow-sm p-4"
                >
                  <div className="h-full flex flex-col justify-between">
                    <SkeletonBlock className="h-10 w-10 rounded-lg" />
                    <SkeletonBlock className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 🔹 Table Section */}
          {showTable && (
            <div className="bg-white border border-gray-100 shadow-sm lg:p-8 px-4 rounded-xl mt-8">
              {/* Title */}
              <div className="flex justify-between mb-6">
                <SkeletonBlock className={`h-6 ${titleWidth}`} />
              </div>

              {/* Rows */}
              <div className="space-y-4">
                {Array.from({ length: tableRows }).map((_, index) => (
                  <SkeletonBlock
                    key={index}
                    className="h-16 bg-gray-100 rounded-lg border border-gray-100"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const AdminAppsSkeleton = ({ count = 8 }) => {
  return (
    <div className="grid xl:grid-cols-4 lg:grid-cols-3 sm:grid-cols-2 grid-cols-2 gap-6 animate-pulse">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col items-center justify-center p-4 bg-gray-100 rounded-xl"
        >
          {/* Icon box */}
          <div className="h-16 w-16 bg-gray-300 rounded-lg mb-3" />

          {/* Label */}
          <div className="h-3 w-20 bg-gray-300 rounded" />
        </div>
      ))}
    </div>
  );
};
