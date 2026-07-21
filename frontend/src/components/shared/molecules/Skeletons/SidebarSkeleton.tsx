import React from "react";

interface SidebarSkeletonProps {
    isExpanded: boolean;
}

const SidebarSkeleton: React.FC<SidebarSkeletonProps> = ({ isExpanded }) => {
    return (
        <aside
            className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 shadow-sm overflow-hidden z-20 transition-all duration-300 ease-in-out ${isExpanded ? "w-64" : "w-20"
                }`}
        >
            <div className="flex flex-col h-full animate-pulse">
                {/* Header Skeleton */}
                <div
                    className="px-4 py-3 border-b border-gray-200 flex items-center gap-3"
                    style={{ height: "73px" }}
                >
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />
                    {isExpanded && (
                        <div className="flex flex-col gap-2 w-full">
                            <div className="h-4 w-3/4 bg-gray-200 rounded" />
                            <div className="h-3 w-1/2 bg-gray-200 rounded" />
                        </div>
                    )}
                </div>

                {/* Navigation Items Skeleton */}
                <div className="flex-1 p-4 space-y-2 overflow-hidden">
                    {Array.from({ length: 12 }).map((_, index) => (
                        <div
                            key={index}
                            className="flex items-center w-full h-12 px-3 rounded-lg"
                        >
                            <div className="w-5 h-5 rounded bg-gray-200 flex-shrink-0" />
                            {isExpanded && (
                                <div className="ml-3 h-4 w-3/4 bg-gray-200 rounded flex-1" />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </aside>
    );
};

export default SidebarSkeleton;
