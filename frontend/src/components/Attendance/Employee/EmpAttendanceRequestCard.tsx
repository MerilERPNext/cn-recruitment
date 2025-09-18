import { format } from "date-fns";
import { AttendanceRequest } from "../../../types/attendance";
import Badge from "../../shared/Badge";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { Edit2 } from "lucide-react";
import Tooltip from "../../shared/Tooltip";

const EmpAttendanceRequestCard = ({ data }: { data: AttendanceRequest }) => {
  const { isDesktop } = useScreenSize();
  const getStatus = (rawStatus: string) => {
    const status = rawStatus?.toLowerCase().trim();

    if (status === "pending") {
      return {
        label: "Pending",
        statusColor: "bg-yellow-100 text-yellow-800",
      };
    } else if (status === "approved") {
      return {
        label: "Approved",
        statusColor: "bg-green-100 text-green-800",
      };
    } else {
      return {
        label: "Rejected",
        statusColor: "bg-red-100 text-red-800",
      };
    }
  };
  const status = getStatus(data?.custom_status);
  const formattedFromDate = data?.from_date
    ? format(new Date(data.from_date), "dd/MM/yyyy")
    : "N/A";
  const formattedToDate = data?.to_date
    ? format(new Date(data.to_date), "dd/MM/yyyy")
    : "N/A";
  return (
    <>
      {isDesktop ? (
        <div className="grid grid-cols-5 items-center gap-4 px-6 h-14 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
          {/* Request Type */}
          <div className="text-sm font-medium text-gray-700 text-start truncate">
            {data?.custom_request_type}
          </div>

          {/* From Date */}
          <div className="text-sm text-gray-900 text-start">
            {formattedFromDate}
          </div>

          {/* To Date */}
          <div className="text-sm text-gray-900 text-start">
            {formattedToDate}
          </div>

          {/* Status */}
          <div className="flex justify-start">
            <Tooltip content={status?.label === "Pending" ? "Test" : ""}>
              <Badge
                backgroundColor={status?.statusColor}
                label={status?.label || ""}
              />
            </Tooltip>
          </div>
          <div className="text-sm text-gray-900 text-start">
            <Edit2 />
          </div>
        </div>
      ) : (
        <div className="w-full flex border border-gray-100 items-center justify-between gap-3 bg-white shadow-sm rounded-xl cursor-pointer hover:shadow-md transition-shadow">
          <div className="px-4 py-2 w-full">
            <div className=" flex items-start justify-between gap-1">
              <div>
                <div>{data?.custom_request_type}</div>
                <div className="font-medium text-gray-900">
                  {data?.from_date
                    ? format(new Date(data?.from_date), "dd/MM/yyyy")
                    : "N/A"}
                  {data?.to_date
                    ? ` - ${format(new Date(data?.to_date), "dd/MM/yyyy")}`
                    : "N/A"}
                </div>
                {/* <div className="text-sm text-gray-600">{data?.reason}</div> */}
              </div>
              <Badge
                backgroundColor={status?.statusColor}
                label={status?.label || ""}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmpAttendanceRequestCard;
