import React from "react";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import Tooltip from "../../shared/Tooltip";

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
    return (
        <div className="bg-white rounded-xl shadow-sm border p-6 relative hover-lift max-w-[90vw] min-w-[90vw] md:min-w-[400px] md:max-w-[400px]">
            <div className="space-y-4">
                <div>
                    <p className="text-xs text-gray-500">Employee</p>
                    <p className="font-semibold text-gray-900">
                        {employee_name || "-"} {employee ? `(${employee})` : ""}
                    </p>
                </div>

                <div>
                    <p className="text-xs text-gray-500">Designation</p>
                    <p className="font-semibold text-gray-900 truncate line-clamp-1">
                        <Tooltip content={designation}>
                            {designation || "-"}
                        </Tooltip>
                    </p>
                </div>

                <div>
                    <p className="text-xs text-gray-500">Company</p>
                    <p className="font-semibold text-gray-900">{company_name || "-"}</p>
                </div>

                <div>
                    <p className="text-xs text-gray-500">Department</p>
                    <p className="font-semibold text-gray-900 truncate line-clamp-1">{department_name || "-"}</p>
                </div>

                <div>
                    <p className="text-xs text-gray-500">Work Location</p>
                    <p className="font-semibold text-gray-900 truncate">{location_name || "-"}</p>
                </div>

                <div>
                    <p className="text-xs text-gray-500">From - To</p>
                    <p className="font-semibold text-gray-900">
                        {date_of_joining ? formatToIndianDate(date_of_joining) : "-"} -{" "}
                        {relieving_date ? formatToIndianDate(relieving_date) : "Present"}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default EmployeePreviousJoiningCard;
