import { format } from "date-fns";
import { AttendanceRequest } from "../../../types/attendance";
import Badge from "../../shared/Badge";

const EmpAttendanceRequestCard = ({
  data,
  onClick,
}: {
  data: AttendanceRequest;
  onClick?: () => void;
}) => {
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

  return (
    <div
      className="w-full flex border border-gray-100 items-center justify-between gap-3 bg-white shadow-sm rounded-xl"
      onClick={() => {
        if (data?.docstatus === 0 && onClick) {
          onClick();
        }
      }}
    >
      <div className="px-4 py-2 w-full">
        <div className=" flex items-center justify-between gap-1">
          <div>
            <div className="font-medium text-gray-900">
              {data?.creation
                ? format(new Date(data.creation), "dd/MM/yyyy")
                : "N/A"}
            </div>
            <div className="text-sm text-gray-600">{data?.reason}</div>
          </div>
          <Badge
            backgroundColor={status?.statusColor}
            label={status?.label || ""}
          />
        </div>
      </div>
    </div>
  );
};

export default EmpAttendanceRequestCard;
