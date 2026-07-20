import React from "react";
import { Typography } from "../shared/atoms/Typography";
import Modal from "../shared/Modal";
import TableSkeleton from "../shared/molecules/Skeletons/TableSkeleton";
import { NoDataFound } from "../shared/atoms/NoDataFound";
import type { FunnelActivityLogEntry } from "../../types/flows";
import { formatToIndianDateWithTime } from "../../utils/formatToIndianDate";

interface ActivityLogProps {
    show: boolean;
    setShowActivityLog: (show: boolean) => void;
    entries?: FunnelActivityLogEntry[];
    isLoading?: boolean;
    isError?: boolean;
}

const ActivityLog: React.FC<ActivityLogProps> = ({
    show,
    setShowActivityLog,
    entries,
    isLoading = false,
    isError = false,
}) => {
    return (
        <Modal isOpen={show} onClose={() => { }} size="md">
            <div className="flex flex-col bg-white w-full">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white flex justify-between items-center px-6 py-4 border-b border-gray-100">
                    <Typography variant="h4" className="font-semibold text-slate-800">
                        Activity Logs
                    </Typography>
                    <button
                        onClick={() => setShowActivityLog(false)}
                        className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-md hover:bg-gray-100"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
                    {isLoading && (
                        <TableSkeleton columns={2} rows={3} />
                    )}

                    {isError && !isLoading && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <div className="text-red-500 mb-3">
                                <svg className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                            <Typography variant="bodySmall" className="text-slate-500">
                                Failed to load activity logs.
                            </Typography>
                        </div>
                    )}

                    {!isLoading && !isError && (!entries || entries.length === 0) && (
                        <NoDataFound
                            title="No Activity Logs"
                            subtitle="There are no activity logs for this onboarding yet."
                        />
                    )}

                    {!isLoading && !isError && entries && entries.length > 0 && (
                        entries.map((log, index) => (
                            <div key={index} className="flex flex-col gap-3">
                                <div className="flex flex-col gap-0.5">
                                    <Typography variant="body" className="text-slate-800">
                                        {log.title}
                                    </Typography>
                                    <Typography variant="bodySmall" className="text-slate-400">
                                        {log.timestamp ? formatToIndianDateWithTime(log.timestamp) : "-"}
                                    </Typography>
                                    {log.category && (
                                        <Typography variant="caption" className="text-blue-500">
                                            {log.category}
                                        </Typography>
                                    )}
                                </div>

                                {log.details && log.details.length > 0 && (
                                    <div className="bg-[#f8f9fc] p-5 rounded-xl flex flex-col gap-5">
                                        <div className={`grid gap-y-6 gap-x-4 ${log.details.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                                            {log.details.map((detail, idx) => (
                                                <div key={idx} className="flex flex-col gap-1">
                                                    <Typography variant="bodySmall" className="font-semibold text-slate-800">
                                                        {detail.label}
                                                    </Typography>
                                                    <Typography variant="bodySmall" className="text-slate-500 leading-relaxed">
                                                        {detail.value}
                                                    </Typography>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default ActivityLog;
