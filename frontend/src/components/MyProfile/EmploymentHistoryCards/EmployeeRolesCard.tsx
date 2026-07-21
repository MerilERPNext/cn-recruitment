import React from "react";
import { EditIcon, TrashIcon } from "lucide-react";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import IconButton from "../../shared/atoms/IconButton";
import Tooltip from "../../shared/Tooltip";

interface Field {
    id: string | null;
    name: string | null;
}

interface EmploymentRolesCardProps {
    from_date: string;
    to_date: string | null;
    is_current: boolean;
    is_promotion: boolean;

    employee_role?: Field | null;

    onEdit?: () => void;
    onDelete?: () => void;
}

const EmployeeRolesCard: React.FC<EmploymentRolesCardProps> = ({
    from_date,
    to_date,
    is_current,
    is_promotion,
    employee_role,
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

                {is_promotion && (
                    <span className="bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1 rounded-xl">
                        Promotion
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
                    <p className="text-xs text-gray-500">
                        Employee Role
                    </p>

                    <Tooltip content={employee_role?.name || "-"}>
                        <p className="font-semibold text-lg text-gray-900 line-clamp-1">
                            {employee_role?.name || "-"}
                        </p>
                    </Tooltip>
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

export default EmployeeRolesCard;