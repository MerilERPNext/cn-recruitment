import type React from "react";
import { Clock, Calendar } from "lucide-react";
import formatToIndianDate from "../../utils/formatToIndianDate";
import { TimesheetListRecord } from "../../types/timesheet";

interface TimesheetListItemProps {
  item: TimesheetListRecord;
  index?: number;
  doctype: string;
}

const TimesheetListItem: React.FC<TimesheetListItemProps> = ({ item }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Submitted":
        return "bg-blue-100 text-blue-800";
      case "Billed":
        return "bg-green-100 text-green-800";
      case "Draft":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
          <p className="text-sm text-gray-500">Employee: {item.employee_name || item.employee}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
            item.status || ""
          )}`}
        >
          {item.status}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span>{item.start_date ? formatToIndianDate(item.start_date) : "-"} to {item.end_date ? formatToIndianDate(item.end_date) : "-"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span>Total Hours: {item.total_hours || 0}</span>
        </div>
      </div>
    </div>
  );
};

export default TimesheetListItem;
