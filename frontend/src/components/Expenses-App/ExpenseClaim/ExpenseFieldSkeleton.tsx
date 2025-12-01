import React from "react";
const ExpenseFieldSkeleton: React.FC<{ columns?: number }> = ({
  columns = 2,
}) => {
  return (
    <div className="mt-4 space-y-4 animate-pulse">
      {/* <div className="h-6 bg-gray-200 rounded w-1/3" /> */}
      <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-4`}>
        {Array.from({ length: columns * 6 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded" />
        ))}
      </div>
    </div>
  );
};

export default ExpenseFieldSkeleton;
