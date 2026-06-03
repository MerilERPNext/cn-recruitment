import React from "react";
import formatToIndianDate from "../../../utils/formatToIndianDate";

interface EmploymentSegmentsCardProps {
    from_date: string;
    to_date: string | null;
    is_current: boolean;
    total_percentage: number;
    segment_totals: Record<string, number>;
}

const EmploymentSegmentsCard: React.FC<EmploymentSegmentsCardProps> = ({
    from_date,
    to_date,
    is_current,
    total_percentage,
    segment_totals,
}) => {
    const segments = Object.entries(segment_totals || {});

    return (
        <div className="bg-white rounded-xl shadow-sm border p-6 relative hover-lift max-w-[90vw] min-w-[90vw] md:min-w-[400px] md:max-w-[400px]">
            <div className="absolute top-4 right-4 flex items-center gap-2">
                {is_current && (
                    <span className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-xl">
                        Current
                    </span>
                )}

            </div>

            <div className="space-y-4 pr-20">
                <div>
                    <p className="text-xs text-gray-500">
                        Total Allocation
                    </p>

                    <p className="font-semibold text-lg text-gray-900">
                        {total_percentage}%
                    </p>
                </div>

                <div>
                    <p className="text-xs text-gray-500 mb-2">
                        Segments
                    </p>

                    <div className="space-y-2">
                        {segments.length > 0 ? (
                            segments.map(([segmentName, percentage]) => (
                                <div
                                    key={segmentName}
                                    className="flex items-center justify-between"
                                >
                                    <span className="text-gray-900 font-medium">
                                        {segmentName}
                                    </span>

                                    <span className="text-sm text-gray-600">
                                        {percentage}%
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-400">-</p>
                        )}
                    </div>
                </div>

                <div>
                    <p className="text-xs text-gray-500">
                        Duration
                    </p>

                    <p className="font-medium text-gray-900">
                        {formatToIndianDate(from_date)} -{" "}
                        {is_current
                            ? "Present"
                            : to_date
                                ? formatToIndianDate(to_date)
                                : "-"}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default EmploymentSegmentsCard;