import React, { useMemo } from "react";
import { StatusBadge, myShiftsData } from "./AllShiftsDashboard";
import { useNavigate } from "react-router-dom";
import HeaderBar from "../HeaderBar";

const AllMyShiftsList: React.FC = () => {
    const navigate = useNavigate();

    const sortedData = useMemo(
        () =>
            [...myShiftsData].sort(
                (a, b) =>
                    new Date(b.start_date).getTime() -
                    new Date(a.start_date).getTime()
            ),
        []
    );

    return (
        <div className="w-full mx-auto px-6">
            <HeaderBar
                title="All My Shifts"
                onBack={() => navigate(-1)}
            />

            {/* Table */}
            <div className="overflow-x-auto mt-6 rounded-lg border border-gray-200 bg-white shadow-sm">
                {/* Header */}
                <div className="grid grid-cols-5 gap-4 px-6 h-12 bg-gray-50 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-500 flex items-center justify-center">
                        EMPLOYEE
                    </span>
                    <span className="text-xs font-semibold text-gray-500 flex items-center justify-center">
                        SHIFT TYPE
                    </span>

                    <span className="text-xs font-semibold text-gray-500 flex items-center justify-center">
                        START DATE
                    </span>
                    <span className="text-xs font-semibold text-gray-500 flex items-center justify-center">
                        END DATE
                    </span>
                    <span className="text-xs font-semibold text-gray-500 flex items-center justify-center">
                        STATUS
                    </span>
                </div>

                {/* Rows */}
                <div className="divide-y divide-gray-200">
                    {sortedData.map((item, index) => (
                        <div
                            key={`${item.name}-${index}`}
                            className="grid grid-cols-5 gap-4 items-center px-6 h-14 hover:bg-gray-50 transition-colors text-center"
                        >
                            <div className="font-medium text-gray-900 truncate">
                                {item.employee_name}
                            </div>
                            <div className="text-gray-700 truncate">
                                {item.shift_type}
                            </div>

                            <div className="text-gray-600">
                                {item.start_date}
                            </div>
                            <div className="text-gray-600 ">
                                {item.end_date}
                            </div>
                            <div>
                                <StatusBadge status={item.status} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AllMyShiftsList;
