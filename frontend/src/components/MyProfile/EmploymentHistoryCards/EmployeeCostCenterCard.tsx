import React from "react";
import { EditIcon, TrashIcon } from "lucide-react";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import IconButton from "../../shared/atoms/IconButton";
import Tooltip from "../../shared/Tooltip";

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
    allocations: Allocation[];

    onEdit?: () => void;
    onDelete?: () => void;
}

const EmployeeCostCenterCard: React.FC<EmployeeCostCenterCardProps> = ({
    from_date,
    to_date,
    is_current,
    allocations,
    onEdit,
    onDelete,
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
                    <IconButton
                        onClick={() => onEdit?.()}
                        icon={<EditIcon className="h-4 w-4" />}
                        className="cursor-pointer"
                        color="primary"
                        variant="subtle"
                        size="xs"
                    />
                )}
                {onDelete && !is_current && (
                    <IconButton
                        onClick={() => onDelete?.()}
                        icon={<TrashIcon className="h-4 w-4" />}
                        className="cursor-pointer"
                        color="error"
                        variant="subtle"
                        size="xs"
                    />
                )}
            </div>

            <div className="space-y-4 pr-20">
                <div>
                    <p className="text-xs text-gray-500 mb-2">
                        Cost Center Name
                    </p>

                    <div className="space-y-2">
                        {allocations.length > 0 ? (
                            allocations.map((allocation, index) => (
                                <div
                                    key={`${allocation.cost_center.id}-${index}`}
                                    className="flex items-center justify-between gap-2"
                                >
                                    <Tooltip content={allocation.cost_center.name}>
                                        <span className="text-gray-900 font-medium line-clamp-1">
                                            {allocation.cost_center.name}
                                        </span>
                                    </Tooltip>

                                    <span className="text-sm text-gray-600 flex-shrink-0">
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