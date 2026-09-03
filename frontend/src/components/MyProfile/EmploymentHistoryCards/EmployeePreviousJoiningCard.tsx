import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
    Building2,
    ExternalLink,
    IdCard,
    Warehouse,
    MapPin,
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
    image?: string | null;
}

const EmployeePreviousJoiningCard: React.FC<EmployeePreviousJoiningCardProps> = ({
    employee,
    employee_name,
    image,
    company_name,
    department_name,
    location_name,
    date_of_joining,
    relieving_date,
}) => {
    const [imageError, setImageError] = useState(false);

    return (
        <div className="bg-card rounded-xl shadow-sm border border-border hover:border-primary/40 p-6 relative hover-lift max-w-[90vw] min-w-[90vw] md:min-w-[400px] md:max-w-[400px] transition-colors">
            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                    {image && !imageError ? (
                        <img
                            src={image}
                            alt={employee_name}
                            className="w-5 h-5"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        // show first character avatar
                        <div className="flex items-center justify-center w-5 h-5 rounded-xxl">
                            {employee_name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <WrapperHoverCard employeeId={employee}>
                        <Link
                            to={`/webapp/employee-profile?target_user=${employee}`}
                            target="_blank"
                        >
                            <div className="flex items-center gap-1 hover:text-primary min-w-0">
                                <Tooltip content={employee_name || "-"} triggerClassName="min-w-0">
                                    <h3 className="font-bold text-gray-900 truncate">
                                        {employee_name || "-"}
                                    </h3>
                                </Tooltip>
                                <ExternalLink className="h-4 w-4 flex-shrink-0" />
                            </div>
                        </Link>
                    </WrapperHoverCard>
                    {/* <div className="flex items-center gap-1.5 text-xs text-gray-600 min-w-0">
                        <Award size={14} className="text-primary-500 flex-shrink-0" />
                        <p className="text-sm text-gray-600 min-w-0 flex-1">
                            <Tooltip
                                content={designation || "-"}
                                triggerClassName="block truncate"
                            >
                                {designation || "-"}
                            </Tooltip>
                        </p>
                    </div> */}

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
                            <Tooltip content={company_name}>
                                <div className="flex items-center gap-1.5 text-xs text-gray-600 min-w-0 max-w-[160px]">
                                    <Building2 size={14} className="text-primary-500 flex-shrink-0" />
                                    <span className="truncate">{company_name}</span>
                                </div>
                            </Tooltip>
                        )}

                        {department_name && (
                            <Tooltip content={department_name}>
                                <div className="flex items-center gap-1.5 text-xs text-gray-600 min-w-0 max-w-[160px]">
                                    <Warehouse size={14} className="text-primary-500 flex-shrink-0" />
                                    <span className="truncate">{department_name}</span>
                                </div>
                            </Tooltip>
                        )}

                        {location_name && (
                            <Tooltip content={location_name}>
                                <div className="flex items-center gap-1.5 text-xs text-gray-600 min-w-0 max-w-[160px]">
                                    <MapPin size={14} className="text-primary-500 flex-shrink-0" />
                                    <span className="truncate">{location_name}</span>
                                </div>
                            </Tooltip>
                        )}
                    </div>
                </div>
            </div>

            {/* Dates */}
            <div className="space-y-3 border-t border-border pt-4">
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
                        className="text-sm font-medium px-3 py-1 rounded-md bg-gray-50"
                    >
                        {relieving_date
                            ? formatToIndianDate(relieving_date)
                            : "-"}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default EmployeePreviousJoiningCard;
