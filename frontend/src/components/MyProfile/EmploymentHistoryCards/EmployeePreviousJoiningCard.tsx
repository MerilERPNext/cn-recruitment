import React from "react";
import { Link } from "react-router-dom";
import {
    Building2,
    ExternalLink,
    IdCard,
    Warehouse,
    MapPin,
    Award,
} from "lucide-react";

import formatToIndianDate from "../../../utils/formatToIndianDate";
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
}

const EmployeePreviousJoiningCard: React.FC<EmployeePreviousJoiningCardProps> = ({
    employee,
    employee_name,
    designation,
    company_name,
    department_name,
    location_name,
    date_of_joining,
    relieving_date,
}) => {
    const isCurrent = !relieving_date;

    return (
        <div className="bg-white rounded-xl shadow-sm border p-6 relative hover-lift max-w-[90vw] min-w-[90vw] md:min-w-[400px] md:max-w-[400px]">
            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                    <Building2 className="w-5 h-5 text-blue-600" />
                </div>

                <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <WrapperHoverCard employeeId={employee}>
                        <Link
                            to={`/webapp/employee-profile?target_user=${employee}`}
                            target="_blank"
                        >
                            <div className="flex items-center gap-1 hover:text-primary">
                                <h3 className="font-bold text-gray-900 truncate">
                                    {employee_name || "-"}
                                </h3>
                                <ExternalLink className="h-4 w-4 flex-shrink-0" />
                            </div>
                        </Link>
                    </WrapperHoverCard>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 min-w-0">
                        <Award size={14} className="text-primary-500 flex-shrink-0" />
                        <p className="text-sm text-gray-600 min-w-0 flex-1">
                            <Tooltip
                                content={designation || "-"}
                                triggerClassName="block truncate"
                            >
                                {designation || "-"}
                            </Tooltip>
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4 mt-1">
                        {employee && (
                            <Tooltip content={"Employee ID"}>
                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                    <IdCard size={14} className="text-primary-500" />
                                    <span>{employee}</span>
                                </div>
                            </Tooltip>
                        )}
                        {company_name && (
                            <Tooltip content={"Company"}>
                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                    <Building2 size={14} className="text-primary-500" />
                                    <span>{company_name}</span>
                                </div>
                            </Tooltip>
                        )}

                        {department_name && (
                            <Tooltip content={"Department"}>
                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                    <Warehouse size={14} className="text-primary-500" />
                                    <span className="truncate">{department_name}</span>
                                </div>
                            </Tooltip>
                        )}

                        {location_name && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                <MapPin size={14} className="text-primary-500" />
                                <span className="truncate">{location_name}</span>
                            </div>
                        )}
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

                    <span
                        className="text-sm font-medium px-3 py-1 rounded-md"
                        style={{
                            backgroundColor: isCurrent ? "#DCFCE7" : "#F9FAFB",
                            color: isCurrent ? "#166534" : undefined,
                        }}
                    >
                        {relieving_date
                            ? formatToIndianDate(relieving_date)
                            : "Present"}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default EmployeePreviousJoiningCard;