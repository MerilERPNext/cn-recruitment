import React from "react";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { SalaryStructureAssignment } from "../../../types/employee";

interface CompensationDetailsCardProps {
    assignment: SalaryStructureAssignment;
}

const CompensationDetailsCard: React.FC<CompensationDetailsCardProps> = ({ assignment }) => {
    const isActive = assignment.docstatus === 1;

    return (
        <div className="bg-card rounded-xl shadow-sm border border-border hover:border-primary/40 p-6 relative hover-lift max-w-[90vw] min-w-[90vw] md:min-w-[400px] md:max-w-[400px] transition-colors">
            <div className="absolute top-4 right-4 flex items-center gap-2">
                {isActive && (
                    <span className="bg-success/10 text-success border border-success/30 text-xs font-medium px-3 py-1 rounded-xl">
                        Active
                    </span>
                )}
            </div>

            <div className="space-y-4 pr-20">
                <div>
                    <p className="text-xs text-gray-500">Salary Structure</p>
                    <p className="font-semibold text-lg text-gray-900">
                        {assignment.salary_structure || "-"}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-gray-500">Base Pay</p>
                        <p className="font-medium text-gray-900">
                            {assignment.currency} {assignment.base?.toLocaleString() ?? "-"}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Company</p>
                        <p className="font-medium text-gray-900">
                            {assignment.company || "-"}
                        </p>
                    </div>
                </div>

                <div>
                    <p className="text-xs text-gray-500">Effective From</p>
                    <p className="font-medium text-gray-900">
                        {assignment.from_date ? formatToIndianDate(assignment.from_date) : "-"}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CompensationDetailsCard;
