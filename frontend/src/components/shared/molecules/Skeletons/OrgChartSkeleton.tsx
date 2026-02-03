const OrgChartSkeleton = () => {
    return (
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
            <div className="relative flex flex-col items-center gap-10 animate-pulse">

                {/* Parent */}
                <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 bg-gray-200 rounded-full" />
                    <div className="w-40 h-4 bg-gray-200 rounded" />
                    <div className="w-28 h-3 bg-gray-200 rounded" />
                </div>

                {/* Connector */}
                <div className="w-px h-10 bg-gray-300" />

                {/* Main Employee */}
                <div className="flex flex-col items-center gap-2">
                    <div className="w-20 h-20 bg-gray-300 rounded-full" />
                    <div className="w-48 h-4 bg-gray-300 rounded" />
                    <div className="w-32 h-3 bg-gray-300 rounded" />
                </div>

                {/* Connector */}
                <div className="w-px h-10 bg-gray-300" />

                {/* Children */}
                <div className="flex gap-12">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 bg-gray-200 rounded-full" />
                            <div className="w-32 h-3 bg-gray-200 rounded" />
                            <div className="w-24 h-3 bg-gray-200 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default OrgChartSkeleton;