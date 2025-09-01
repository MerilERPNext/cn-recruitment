import { format } from "date-fns";
import type { TeamRequest } from "../../types/leaves";

const TeamLeaveRequestItem = ({
  item,
  isSelected,
  onToggleSelect,
  onClick,
  onApprove,
  onReject,
}: {
  item: TeamRequest;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onClick?: () => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}) => {
  const formatDateRange = (fromDate: string, toDate: string) => {
    const formatDate = (dateStr: string) =>
      format(new Date(dateStr), "d MMM, yyyy");
    const from = formatDate(fromDate);
    const to = formatDate(toDate);
    return from === to ? from : `${from} - ${to}`;
  };

  const dateRange = formatDateRange(item.from_date, item.to_date);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-800";
      case "Open":
        return "bg-yellow-100 text-yellow-800";
      case "Rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getBlockColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-green-700";
      case "Open":
        return "bg-orange-700";
      case "Rejected":
        return "bg-red-700";
      default:
        return "bg-gray-700";
    }
  };

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 mb-3 shadow-sm cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start space-x-3">
        {item.status === "Open" && onToggleSelect && (
          <input
            type="checkbox"
            className=""
            checked={isSelected}
            onChange={() => onToggleSelect(item.name)}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap">
            <div className="ml-0">
              <h3 className="font-semibold text-gray-900 text-sm">
                {item.employee_name}
              </h3>
              <p className="text-xs text-gray-600">{item.leave_type}</p>
              <p className="text-xs text-gray-500 mt-1">{dateRange}</p>
            </div>
            <span
              className={`ml-auto px-2 py-1 text-xs rounded-[20px] font-medium flex items-center ${getStatusColor(
                item.status
              )}`}
            >
              <span
                className={`w-1.5 h-1.5 mr-2 rounded-full ${getBlockColor(
                  item.status
                )}`}
              />
              {item.status === "Open" ? "Pending" : item.status}
            </span>
          </div>
          {item.status === "Open" && (
            <div className="mt-3 flex gap-2 w-full">
              <button
                className="w-1/2 px-3 py-1.5 rounded-md bg-red-100 text-red-600 text-sm hover:bg-red-100 transition-colors border border-transparent hover:border-red-200"
                onClick={(e) => {
                  e.stopPropagation();
                  onReject?.(item.todo_id);
                }}
              >
                Reject
              </button>
              <button
                className="w-1/2 px-3 py-1.5 rounded-md bg-green-100 text-green-600 text-sm hover:bg-green-100 transition-colors border border-transparent hover:border-green-200"
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove?.(item.todo_id);
                }}
              >
                Approve
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamLeaveRequestItem;
