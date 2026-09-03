import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
    Building2,
    ExternalLink,
    IdCard,
    Warehouse,
    MapPin,
} from "lucide-react";

import formatToIndianDate, { formatEndDate } from "../../../utils/formatToIndianDate";
import Tooltip from "../../shared/Tooltip";
import WrapperHoverCard from "../../shared/WrapperHoverCard";

interface EmployeePreviousJoiningCardProps {
    employee: string;
    employee_name: string;
    designation: string | null;
    company_name: string | null;
    department_name: string | null;
    location_name: string | null;
    date_of_joining: string | null;
    relieving_date: string | null;
    image?: string | null;
}

const EmployeePreviousJoiningCard: React.FC<EmployeePreviousJoiningCardProps> = ({
    employee,
    employee_name,
    image,
    designation,
    company_name,
    department_name,
    location_name,
    date_of_joining,
    relieving_date,
}) => {
    const [imageError, setImageError] = useState(false);

    return (
        <div className="bg-white rounded-xl shadow-sm border p-6 relative hover-lift max-w-[90vw] min-w-[90vw] md:min-w-[400px] md:max-w-[400px] flex flex-col justify-between">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                        {image && !imageError ? (
                            <img
                                src={image}
                                alt={employee_name}
                                className="w-6 h-6 rounded-full object-cover"
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs">
                                {employee_name ? employee_name.charAt(0).toUpperCase() : "E"}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                        <WrapperHoverCard employeeId={employee}>
                            <Link
                                to={`/webapp/employee-profile?target_user=${employee}`}
                                target="_blank"
                            >
                                <div className="flex items-center gap-1.5 hover:text-primary min-w-0">
                                    <Tooltip content={employee_name || "-"} triggerClassName="min-w-0 flex-1">
                                        <h3 className="font-bold text-gray-900 truncate text-base">
                                            {employee_name || "-"}
                                        </h3>
                                    </Tooltip>
                                    <ExternalLink className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                </div>
                            </Link>
                        </WrapperHoverCard>
                        {designation && (
                            <Tooltip content={designation} triggerClassName="min-w-0">
                                <p className="text-xs text-gray-500 truncate">{designation}</p>
                            </Tooltip>
                        )}
                    </div>
                </div>

                {/* Metadata List */}
                <div className="flex flex-col gap-2.5 my-4 pt-3 border-t">
                    {/* Row 1: Employee ID and Company Name */}
                    <div className="grid grid-cols-2 gap-x-4">
                        {/* Employee ID */}
                        <div className="flex items-center gap-2 text-xs text-gray-600 min-w-0">
                            <IdCard size={14} className="text-primary-500 flex-shrink-0" />
                            <Tooltip content={employee ? `Employee ID: ${employee}` : "Employee ID: -"} triggerClassName="min-w-0 flex-1">
                                <span className="truncate block">{employee || "-"}</span>
                            </Tooltip>
                        </div>

                        {/* Company Name */}
                        <div className="flex items-center gap-2 text-xs text-gray-600 min-w-0">
                            <Building2 size={14} className="text-primary-500 flex-shrink-0" />
                            <Tooltip content={company_name || "-"} triggerClassName="min-w-0 flex-1">
                                <span className="truncate block">{company_name || "-"}</span>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Department Name */}
                    <div className="flex items-center gap-2 text-xs text-gray-600 min-w-0">
                        <Warehouse size={14} className="text-primary-500 flex-shrink-0" />
                        <Tooltip content={department_name || "-"} triggerClassName="min-w-0 flex-1">
                            <span className="truncate block">{department_name || "-"}</span>
                        </Tooltip>
                    </div>

                    {/* Location Name */}
                    <div className="flex items-center gap-2 text-xs text-gray-600 min-w-0">
                        <MapPin size={14} className="text-primary-500 flex-shrink-0" />
                        <Tooltip content={location_name || "-"} triggerClassName="min-w-0 flex-1">
                            <span className="truncate block">{location_name || "-"}</span>
                        </Tooltip>
                    </div>
                </div>
            </div>

            {/* Dates */}
            <div className="space-y-3 border-t pt-4">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Joining Date</span>
                    <span className="text-sm font-medium bg-gray-50 px-3 py-1 rounded-md">
                        {date_of_joining
                            ? formatToIndianDate(date_of_joining)
                            : "-"}
                    </span>
                </div>

                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Relieving Date</span>
                    <span className="text-sm font-medium px-3 py-1 rounded-md bg-gray-50">
                        {formatEndDate(relieving_date)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default EmployeePreviousJoiningCard;