import React from "react";
import { Pencil } from "lucide-react";
import formatToIndianDate from "../../../utils/formatToIndianDate";

interface CostCenter {
    id: string;
    name: string;
}

interface Allocation {
    cost_center: CostCenter;
    percentage: number;
}

interface EmployeeCostCenterCardProps {
    from_date: string;
    to_date: string | null;
    is_current: boolean;
    total_percentage: number;
    allocations: Allocation[];

    onEdit?: () => void;
}

const EmployeeCostCenterCard: React.FC<EmployeeCostCenterCardProps> = ({
    from_date,
    to_date,
    is_current,
    total_percentage,
    allocations,
    onEdit,
}) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border p-6 relative hover-lift  max-w-[90vw] min-w-[90vw]  md:min-w-[400px] md:max-w-[400px]">
            <div className="absolute top-4 right-4 flex items-center gap-2">
                {is_current && (
                    <span className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-xl">
                        Current
                    </span>
                )}

                {onEdit && (
                    <button
                        className="text-gray-400 hover:text-gray-600 transition"
                        onClick={onEdit}
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
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
                        Cost Centers
                    </p>

                    <div className="space-y-2">
                        {allocations.length > 0 ? (
                            allocations.map((allocation, index) => (
                                <div
                                    key={`${allocation.cost_center.id}-${index}`}
                                    className="flex items-center justify-between"
                                >
                                    <span className="text-gray-900 font-medium">
                                        {allocation.cost_center.name}
                                    </span>

                                    <span className="text-sm text-gray-600">
                                        {allocation.percentage}%
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

export default EmployeeCostCenterCard;