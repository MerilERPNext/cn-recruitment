import { CalendarDays } from "lucide-react";
import { AttendanceRequest } from "../../../types/attendance";
import Badge from "../../shared/Badge";
import { format } from "date-fns";

const AttendanceRequestCard = ({ data }: { data: AttendanceRequest }) => {
  const getStatus = (status: number) => {
    if (status === 0) {
      return {
        label: "Draft",
        statusColor: "bg-yellow-100 text-yellow-600",
      };
    } else if (status === 1) {
      return {
        label: "Submitted",
        statusColor: "bg-green-100 text-green-600",
      };
    } else {
      return {
        label: "Rejected",
        statusColor: "bg-red-100 text-red-600",
      };
    }
  };

  const status = getStatus(data?.docstatus);

  return (
    <div className="bg-white px-2  border border-gray-100 gap-3 bg-white shadow-sm rounded-xl">
      <div className="py-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <CalendarDays className="h-4 w-4" />
              <span className="font-medium text-gray-700">
                {data?.modified
                  ? format(new Date(data?.modified), "dd/MM/yyyy")
                  : "N/A"}
              </span>
            </div>
            <div className="mt-1 text-base text-gray-800 font-semibold">
              {data?.reason || "No reason provided"}
            </div>
          </div>
          <Badge backgroundColor={status.statusColor} label={status.label} />
        </div>
      </div>
    </div>
  );
};

export default AttendanceRequestCard;
