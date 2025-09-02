import { format } from "date-fns";
import { AttendanceRequest } from "../../../types/attendance";
import Badge from "../../shared/Badge";

const EmpAttendanceRequestCard = ({
  data,
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
  const status = getStatus(data?.status);

  return (
    <div
      className="w-full flex border border-gray-100 items-center justify-between gap-3 bg-white shadow-sm rounded-xl"
      // onClick={() => {
      //   if (data?.docstatus === 0 && onClick) {
      //     onClick();
      //   }
      // }}
    >
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
  );
};

export default EmpAttendanceRequestCard;
