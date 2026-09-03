import React from "react";
import { EditIcon, TrendingUp, TrashIcon } from "lucide-react";
import Tooltip from "../../../components/shared/Tooltip";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import IconButton from "../../shared/atoms/IconButton";

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
  onDelete?: () => void;
}

const EmploymentHistoryCard: React.FC<EmploymentHistoryCardProps> = ({ company, functionalArea, department, band, grade, start_date, end_date, designation, isCurrent, is_promotion = false, onEdit, onDelete }) => {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border hover:border-primary/40 p-6 relative hover-lift max-w-[90vw] min-w-[90vw] md:min-w-[400px] md:max-w-[400px] transition-colors">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {isCurrent && <span className="bg-success/10 text-success border border-success/30 text-xs font-medium px-3 py-1 rounded-xl">
          Current
        </span>}
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
        {onDelete && !isCurrent && (
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

      <div className="space-y-4 pr-28">
        <div>
          <p className="text-xs text-gray-500">Group Company</p>
          <Tooltip content={company || "-"}>
            <p className="font-semibold text-gray-900 line-clamp-1">{company || "-"}</p>
          </Tooltip>
        </div>
        <div>
          <p className="text-xs text-gray-500">Department</p>
          <Tooltip content={department || "-"}>

            <p className="font-semibold text-gray-900 line-clamp-1">{department || "-"}</p>
          </Tooltip>
        </div>
        <div>
          <p className="text-xs text-gray-500">Designation</p>
          <div className=" flex gap-1 items-center justify-start">

            <Tooltip content={designation || "-"}>
              <p className="font-semibold text-gray-900 flex line-clamp-1 items-center gap-1.5">
                {designation || "-"}
              </p>
            </Tooltip>
            {is_promotion && (
              <Tooltip content="Promotion">
                <TrendingUp className="text-success h-4 w-4" />
              </Tooltip>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500">Band</p>
          <Tooltip content={band || "-"}>

            <p className="font-semibold text-gray-900 line-clamp-1">{band || "-"}</p>
          </Tooltip>
        </div>
        <div>
          <p className="text-xs text-gray-500">Grade</p>
          <Tooltip content={grade || "-"}>
            <p className="font-semibold text-gray-900 line-clamp-1">{grade || "-"}</p>
          </Tooltip>
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
