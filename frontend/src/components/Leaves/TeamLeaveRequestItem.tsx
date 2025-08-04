import { format } from "date-fns";
const TeamLeaveRequestItem = ({
  item,
  onClick,
  onApprove,
  onReject,
}: {
  item: any;
  onClick?: () => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}) => {
  const formatDateRange = (fromDate: string, toDate: string) => {
    const formatDate = (dateStr: string) =>
      format(new Date(dateStr), "MMM d, yyyy");
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
        return "bg-orange-100 text-orange-800";
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
                className="bg-red-100 p-2 w-1/2 text-red-700 rounded-md font-semibold"
                onClick={(e) => {
                  e.stopPropagation();
                  onReject?.(item.name);
                }}
              >
                Reject
              </button>
              <button
                className="bg-green-100 p-2 w-1/2 text-green-700 rounded-md font-semibold"
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove?.(item.name);
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
