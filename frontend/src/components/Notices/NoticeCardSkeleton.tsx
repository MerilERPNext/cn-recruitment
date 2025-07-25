
const NoticeCardSkeleton = () => (
    <div className="flex items-start gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-200 animate-pulse mb-3">
        <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0"></div>
        <div className="flex-grow space-y-2">
            <div className="flex justify-between items-start">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-12"></div>
            </div>
            <div className="space-y-1">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-20"></div>
        </div>
    </div>
);

export default NoticeCardSkeleton;

