import React from "react";

export const CategoryCardSkeleton: React.FC = () => {
  return (
    <div className="flex border border-gray-100 items-center justify-between gap-3 bg-white shadow-sm rounded-xl p-2 my-2 animate-pulse">
      <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-gray-200">
        <div className="h-4 w-4 bg-gray-300 rounded"></div>
      </div>
    </div>
  );
};

export const PolicyCardSkeleton: React.FC = () => {
  return (
    <div className="flex justify-between items-center border rounded-lg p-4 animate-pulse bg-white my-2">
      <div className="mr-2 flex-1">
        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-40"></div>
      </div>
      <div>
        <div className="h-8 w-16 bg-gray-300 rounded-md"></div>
      </div>
    </div>
  );
};
