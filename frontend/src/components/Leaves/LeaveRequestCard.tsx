import { Calendar } from "lucide-react";
import { PiHandTap } from "react-icons/pi";
import { format } from "date-fns";
import Badge from "../shared/Badge";
import { useScreenSize } from "../../hooks/useScreenSize";
import type { LeaveApplicationItem } from "../../types/leaves";

type LeaveRequestCardProps = {
  item: LeaveApplicationItem;
  index?: number;
  doctype: string;
  onClick?: () => void;
};

const LeaveRequestCard = ({ item, onClick }: LeaveRequestCardProps) => {
  const { isDesktop } = useScreenSize();

  const getStatus = (rawStatus: string) => {
    const statusMap: { [key: string]: { label: string; statusColor: string } } =
      {
        open: {
          label: "Pending",
          statusColor: "bg-yellow-100 text-yellow-800",
        },
        approved: {
          label: "Approved",
          statusColor: "bg-green-100 text-green-800",
        },
        cancelled: {
          label: "Cancelled",
          statusColor: "bg-red-100 text-red-800",
        },
      };
    const status = rawStatus?.toLowerCase().trim();
    return (
      statusMap[status] || {
        label: "Rejected",
        statusColor: "bg-red-100 text-red-800",
      }
    );
  };

  const status = getStatus(item?.status);

  const formattedFromDate = item?.from_date
    ? format(new Date(item.from_date), "d MMM yyyy")
    : "N/A";
  const formattedToDate = item?.to_date
    ? format(new Date(item.to_date), "d MMM yyyy")
    : "N/A";

  return isDesktop ? (
    <div
      style={{ gridTemplateColumns: "1fr 1fr 1fr 2.5fr 1fr 0.5fr" }}
      className="grid items-center gap-4 px-6 h-14 border-b border-gray-200 hover:bg-gray-50 transition-colors"
      onClick={onClick}
    >
      <div className="text-sm font-medium text-gray-700 truncate">
        {item?.leave_type}
      </div>
      <div className="text-sm text-gray-900">{formattedFromDate}</div>
      <div className="text-sm text-gray-900">{formattedToDate}</div>
      <div className="text-sm text-gray-600 truncate pr-4">
        {item.description || "—"}
      </div>
      <div className="flex justify-start">
        <Badge
          backgroundColor={status?.statusColor}
          label={status?.label || ""}
        />
      </div>

      <div>
        {item.status === "Open" && (
          <button
            onClick={() => console.log("Revoke request:", item.name)}
            className="px-3 py-1 text-sm rounded-md bg-gray-800 text-white hover:bg-gray-700"
          >
            Revoke
          </button>
        )}
      </div>
    </div>
  ) : (
    <div
      className="w-full flex items-center gap-3 bg-white shadow-sm rounded-xl border border-gray-200 p-3"
      onClick={onClick}
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 text-blue-600">
        <Calendar size={20} />
      </div>

      <div className="flex-1">
        <div className="text-sm font-semibold text-gray-900">
          {item?.leave_type}
        </div>
        <div className="text-xs text-gray-600">
          {formattedFromDate} – {formattedToDate}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {status?.label === "Pending" && (
          <PiHandTap size={18} className="text-gray-400" />
        )}
        <Badge
          backgroundColor={status?.statusColor}
          label={status?.label || ""}
        />
      </div>
    </div>
  );
};

export default LeaveRequestCard;
