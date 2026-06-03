import React from "react";
import { useScreenSize } from "../../hooks/useScreenSize";

const ImportTableSkeleton: React.FC = () => {
  const { isDesktop } = useScreenSize();

  if (!isDesktop) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-white border border-gray-100 rounded-xl p-4 space-y-3"
          >
            <div className="flex justify-between">
              <div className="h-3 bg-gray-200 rounded w-28" />
              <div className="h-5 bg-gray-200 rounded-full w-20" />
            </div>
            <div className="h-4 bg-gray-200 rounded w-2/3" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
            <div className="flex gap-2 pt-1">
              <div className="h-8 bg-gray-200 rounded-lg flex-1" />
              <div className="h-8 bg-gray-200 rounded-lg flex-1" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="grid gap-4 px-6 py-4 border-t border-gray-100 items-center min-w-max"
          style={{
            gridTemplateColumns:
              "120px 180px 80px 160px 150px 180px 120px 110px 1fr 200px",
          }}
        >
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-200 rounded w-5/6" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-200 rounded w-4/5" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
          <div className="h-5 bg-gray-200 rounded-full w-20" />
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="flex gap-2">
            <div className="h-7 bg-gray-200 rounded-lg w-24" />
            <div className="h-7 bg-gray-200 rounded-lg w-28" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ImportTableSkeleton;
