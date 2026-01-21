import React from "react";
import { Building2 } from "lucide-react";
import { format } from "date-fns";

interface EmploymentHistoryCardProps {
  title?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  isCurrent?: boolean;
}

const EmploymentHistoryCard: React.FC<EmploymentHistoryCardProps> = ({
  title,
  start_date,
  end_date,
  isCurrent,
}) => {
  const formatDate = (date?: string | null) => {
    if (!date) return "N/A";
    return format(new Date(date), "dd-MM-yyyy");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border hover-lift p-6 relative min-w-[400px]">
      <div className="flex items-center gap-3  mb-6">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Building2 className="w-5 h-5 text-blue-600" />
        </div>
        <h3 className=" font-medium text-gray-900 truncate">
          <span title={title || ""}>{title}</span>
        </h3>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Start Date</span>
          <span className="text-sm font-medium bg-gray-50 px-3 py-1 rounded-md">
            {formatDate(start_date)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">End Date</span>
          <span
            style={{
              backgroundColor: `${isCurrent ? "#DCFCE7" : "#F9FAFB"}`,
              color: `${isCurrent ? "#166534" : ""}`,
            }}
            className="text-sm font-medium px-3 py-1 rounded-md"
          >
            {end_date ? formatDate(end_date) : "Present"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default EmploymentHistoryCard;
