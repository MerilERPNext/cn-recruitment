import { format } from "date-fns";
import { LeaveApplication } from "../../../types/leaves";
import Badge from "../../shared/Badge";
import { getBadgePropsByStatus } from "../../../utils/helperUtils";

export const LeaveDetailsCard = ({ data }: { data: LeaveApplication }) => {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy");
    } catch {
      return dateString;
    }
  };

  const isHalfDay = data.half_day === 1;
  const status = getBadgePropsByStatus(data.status);

  return (
    <div>
      {/* Status Badge */}
      {data.status && (
        <div className="flex justify-end mb-4">
          <Badge label={data.status} backgroundColor={status.backgroundColor} textColor={status.textColor} />
        </div>
      )}

      {/* Main Info Grid */}
      <div className="space-y-4">
        {/* Leave Type */}
        {data.leave_type && (
          <div className="flex items-start justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500 font-medium">
              Leave Type
            </span>
            <span className="text-sm text-gray-900 font-semibold">
              {data.leave_type}
            </span>
          </div>
        )}

        {/* Date Range */}
        <div className="flex items-start justify-between py-2 border-b border-gray-100">
          <span className="text-sm text-gray-500 font-medium">Duration</span>
          <span className="text-sm text-gray-900 text-right">
            {formatDate(data.from_date)} - {formatDate(data.to_date)}
          </span>
        </div>

        {/* Total Leave Days */}
        {data.total_leave_days && (
          <div className="flex items-start justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500 font-medium">
              Total Days
            </span>
            <span className="text-sm text-gray-900 font-semibold">
              {data.total_leave_days}{" "}
              {data.total_leave_days === 1 ? "day" : "days"}
            </span>
          </div>
        )}

        {/* Half Day Info */}
        {isHalfDay && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                Half Day Details
              </span>
            </div>
            {data.half_day_date && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-blue-700">Half Day Date</span>
                <span className="text-xs font-medium text-blue-900 bg-white px-2 py-1 rounded">
                  {formatDate(data.half_day_date)}
                </span>
              </div>
            )}
            {data.custom_half_day_type && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-blue-700">Type</span>
                <span className="text-xs font-medium text-blue-900 bg-white px-2 py-1 rounded">
                  {data.custom_half_day_type}
                </span>
              </div>
            )}
            {data.custom_second_half_day_date && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-blue-700">Second Half Date</span>
                <span className="text-xs font-medium text-blue-900 bg-white px-2 py-1 rounded">
                  {formatDate(data.custom_second_half_day_date)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Application Details */}
        {data.name && (
          <div className="flex items-start justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500 font-medium">
              Application ID
            </span>
            <span className="text-sm text-gray-900 font-mono text-xs">
              {data.name}
            </span>
          </div>
        )}

        {/* Posted On */}
        {data.posting_date && (
          <div className="flex items-start justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500 font-medium">Posted On</span>
            <span className="text-sm text-gray-900">
              {formatDate(data.posting_date)}
            </span>
          </div>
        )}

        {/* Leave Balance */}
        {data.leave_balance !== undefined && (
          <div className="flex items-start justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500 font-medium">
              Leave Balance
            </span>
            <span className="text-sm text-gray-900 font-semibold">
              {data.leave_balance} {data.leave_balance === 1 ? "day" : "days"}
            </span>
          </div>
        )}

        {/* Description */}
        {data.description && data.description.trim() && (
          <div className="pt-3 mt-2 border-t border-gray-200">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide block mb-2">
              Description
            </span>
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
              {data.description.trim()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
