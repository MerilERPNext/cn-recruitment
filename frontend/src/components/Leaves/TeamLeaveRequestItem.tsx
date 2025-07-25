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
        const formatDate = (dateStr: string) => format(new Date(dateStr), "MMM d, yyyy");
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
                <div className="flex-1">
                    <div className="flex items-center">
                        <img
                            src={item.employee_image || "https://img.freepik.com/premium-vector/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-vector-illustration_561158-3396.jpg"}
                            alt={item.employee_name}
                            className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="ml-3">
                            <h3 className="font-semibold text-gray-900 text-sm">
                                {item.employee_name}
                            </h3>
                            <p className="text-xs text-gray-600">{item.leave_type}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                {dateRange}
                            </p>
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
                    <p className="text-xs text-gray-700 mt-2">
                        <span className="font-medium">Reason:</span> {item.description}
                    </p>
                    {item.status === "Open" && (
                        <div className="mt-3 flex gap-2 w-full">
                            <button
                                className=" w-full text-red-500 border border-gray-300 text-xs px-3 py-1.5 rounded hover:bg-red-700"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onReject?.(item.name);
                                }}
                            >
                                Reject
                            </button>
                            <button
                                className="bg-green-600 w-full text-white text-xs px-3 py-1.5 rounded hover:bg-green-700"
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
