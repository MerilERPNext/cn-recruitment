import React from "react";
import { Pencil, TrendingUp } from "lucide-react";
import Tooltip from "../../../components/shared/Tooltip";
import formatToIndianDate from "../../../utils/formatToIndianDate";

interface EmploymentHistoryCardProps {
  company: string;
  department: string;
  band: string;
  grade: string;
  functionalArea: string;
  start_date: string;
  end_date: string;
  isCurrent: boolean;
  is_promotion: boolean;
  designation?: string;
  onEdit?: () => void;
}

const EmploymentHistoryCard: React.FC<EmploymentHistoryCardProps> = ({ company, functionalArea, department, band, grade, start_date, end_date, isCurrent, is_promotion = false, onEdit }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 relative hover-lift  max-w-[90vw] min-w-[90vw]  md:min-w-[400px] md:max-w-[400px]">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {isCurrent && <span className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-xl">
          Current
        </span>}
        {onEdit && (
          <button className="text-gray-400 hover:text-gray-600" onClick={onEdit}>
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-4 pr-28">
        <div>
          <p className="text-xs text-gray-500">Group Company</p>
          <p className="font-semibold text-gray-900">{company || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Department</p>
          <p className="font-semibold text-gray-900">{department || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Designation</p>
          <p className="font-semibold text-gray-900 flex items-center gap-1.5">
            Associate
            {is_promotion && (
              <Tooltip content="Promotion">
                <TrendingUp className="text-success h-4 w-4" />
              </Tooltip>
            )}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Band</p>
          <p className="font-semibold text-gray-900">{band || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Grade</p>
          <p className="font-semibold text-gray-900">{grade || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Functional Area</p>
          <Tooltip content={functionalArea || "-"}>
            <p className="font-semibold text-gray-900 line-clamp-1">{functionalArea || "-"}</p>
          </Tooltip>
        </div>
        <div>
          <p className="text-xs text-gray-500">From - To</p>
          <p className="font-semibold text-gray-900">{formatToIndianDate(start_date)} - {isCurrent ? "Present" : formatToIndianDate(end_date)}</p>
        </div>
      </div>
    </div>
  );
};

export default EmploymentHistoryCard;

