import React from "react";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { useEmployeeByUserId } from "../../hooks/useEmployee";
import FrappeListView from "../ListView";
import { format } from "date-fns";


const LeaveRequestItem = ({ item }: { item: any }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-800";
      case "Open":
        return "bg-yellow-100 text-yellow-800";
      case "Rejected":
      case "Cancelled":
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
        return "bg-yellow-700";
      case "Rejected":
      case "Cancelled":
        return "bg-red-700";
      default:
        return "bg-gray-700";
    }
  };

  const formatDateRange = (fromDate: string, toDate: string) => {
    const formatDate = (dateStr: string) => format(new Date(dateStr), "MMM d, yyyy");
    const from = formatDate(fromDate);
    const to = formatDate(toDate);
    return from === to ? from : `${from} - ${to}`;
  };

  const displayStatus = item.status === "Open" ? "Pending" : item.status;
  const dateRange = formatDateRange(item.from_date, item.to_date);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 mb-3 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-sm">{item.leave_type}</h3>
            <p className="text-xs text-gray-500 mt-1">{dateRange}</p>
            {item.description && (
              <p className="text-xs text-gray-600 mt-2">{item.description}</p>
            )}
          </div>
        </div>
        <span
          className={`px-2 py-1 flex items-center rounded-[20px] text-xs font-medium ${getStatusColor(item.status)}`}
        >
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${getBlockColor(item.status)}`}
          ></span>
          {displayStatus}
        </span>
      </div>
    </div>
  );
};

const MyLeaveRequest: React.FC = () => {
  const { data: userId } = useLoggedInUser();
  const { data: currentEmployee } = useEmployeeByUserId(userId);

  return (
    <div className="space-y-4 mt-2">
      <FrappeListView
        doctype="Leave Application"
        ItemComponent={LeaveRequestItem}
        defaultFields={["name", "leave_type", "from_date", "to_date", "status", "description"]}
        defaultFilters={{
          employee: currentEmployee?.name || "",
        }}
        isSearch={false}
        infiniteScroll={true}
        showRefereshButton={false}
      />
    </div>
  );
};

export default MyLeaveRequest;
