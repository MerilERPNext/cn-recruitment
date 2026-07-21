import React, { useState } from "react";
import { EditIcon, TrashIcon } from "lucide-react";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import IconButton from "../../shared/atoms/IconButton";
import Tooltip from "../../shared/Tooltip";
import Modal from "../../shared/Modal";

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

const VISIBLE_ALLOCATIONS_LIMIT = 2;

const AllocationRow: React.FC<{ allocation: Allocation }> = ({ allocation }) => (
    <div className="flex items-center justify-between gap-2">
        <Tooltip content={allocation.cost_center.name}>
            <span className="text-gray-900 font-medium line-clamp-1">
                {allocation.cost_center.name}
            </span>
        </Tooltip>

        <span className="text-sm text-gray-600 flex-shrink-0">
            {allocation.percentage}%
        </span>
    </div>
);

const EmployeeCostCenterCard: React.FC<EmployeeCostCenterCardProps> = ({
    from_date,
    to_date,
    is_current,
    allocations,
    onEdit,
    onDelete,
}) => {
    const [isAllocationsModalOpen, setIsAllocationsModalOpen] = useState(false);
    const visibleAllocations = allocations.slice(0, VISIBLE_ALLOCATIONS_LIMIT);
    const hasMoreAllocations = allocations.length > VISIBLE_ALLOCATIONS_LIMIT;

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

                    <div className="space-y-2 min-h-[3.5rem]">
                        {allocations.length > 0 ? (
                            visibleAllocations.map((allocation, index) => (
                                <AllocationRow
                                    key={`${allocation.cost_center.id}-${index}`}
                                    allocation={allocation}
                                />
                            ))
                        ) : (
                            <p className="text-gray-400">-</p>
                        )}
                    </div>

                    {hasMoreAllocations && (
                        <button
                            type="button"
                            onClick={() => setIsAllocationsModalOpen(true)}
                            className="text-primary text-xs font-medium mt-2 hover:underline cursor-pointer"
                        >
                            Show All ({allocations.length})
                        </button>
                    )}
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

            <Modal
                isOpen={isAllocationsModalOpen}
                onClose={() => setIsAllocationsModalOpen(false)}
                size="sm"
            >
                <div className="p-6">
                    <p className="text-lg font-semibold text-gray-900 mb-4">
                        Cost Center Allocations
                    </p>

                    <div className="space-y-3">
                        {allocations.map((allocation, index) => (
                            <AllocationRow
                                key={`${allocation.cost_center.id}-${index}`}
                                allocation={allocation}
                            />
                        ))}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default EmployeeCostCenterCard;