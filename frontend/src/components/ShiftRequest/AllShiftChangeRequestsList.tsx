import React, { useMemo } from "react";
import { approvalQueueData } from "./AllShiftsDashboard";
import HeaderBar from "../HeaderBar";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "./AllShiftsDashboard";

const AllShiftChangeRequestsList: React.FC = () => {
    const navigate = useNavigate();

    const sortedData = useMemo(
        () =>
            [...approvalQueueData].sort(
                (a, b) =>
                    new Date(b.from_date).getTime() -
                    new Date(a.from_date).getTime()
            ),
        []
    );

    return (
        <div className="w-full mx-auto px-6">
            <HeaderBar
                title="All Shift Change Requests"
                onBack={() => navigate(-1)}
            />

            {/* Table */}
            <div className="overflow-x-auto mt-6 rounded-lg border border-gray-200 bg-white shadow-sm">
                {/* Header */}
                <div className="grid grid-cols-6 gap-4 px-6 h-12 bg-gray-50 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-500 flex items-center">
                        EMPLOYEE
                    </span>
                    <span className="text-xs font-semibold text-gray-500 flex items-center">
                        SHIFT TYPE
                    </span>
                    <span className="text-xs font-semibold text-gray-500 flex items-center">
                        STATUS
                    </span>
                    <span className="text-xs font-semibold text-gray-500 flex items-center">
                        START DATE
                    </span>
                    <span className="text-xs font-semibold text-gray-500 flex items-center">
                        END DATE
                    </span>
                    <span className="text-xs font-semibold text-gray-500 flex items-center justify-center">
                        ACTIONS
                    </span>
                </div>

                {/* Rows */}
                <div className="divide-y divide-gray-200">
                    {sortedData.map((item) => (
                        <div
                            key={item.name}
                            className="grid grid-cols-6 gap-4 items-center px-6 h-14 hover:bg-gray-50 transition-colors"
                        >
                            <div className="font-medium text-gray-900 truncate">
                                {item.employee_name}
                            </div>
                            <div className="text-gray-700 truncate">
                                {item.shift_type}
                            </div>
                            <div>
                                <StatusBadge status={item.status} />
                            </div>
                            <div className="text-gray-600">
                                {item.from_date}
                            </div>
                            <div className="text-gray-600">{item.to_date}</div>
                            <div className="flex justify-evenly items-center space-x-2">
                                <button className="px-3 py-1.5 text-sm font-medium rounded-lg text-green-600 bg-green-100 hover:bg-green-200 transition">
                                    Approve
                                </button>
                                <button className="px-3 py-1.5 text-sm font-medium rounded-lg text-red-600 bg-red-100 hover:bg-red-200 transition">
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AllShiftChangeRequestsList;
