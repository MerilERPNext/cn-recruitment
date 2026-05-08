import { format } from "date-fns";
import { LeaveApplication } from "../../../types/leaves";
import Badge from "../../shared/Badge";
import { getBadgePropsByStatus } from "../../../utils/helperUtils";
import { Typography } from "../../shared/atoms/Typography";
import Tooltip from "../../shared/Tooltip";
import { formatToIndianDateWithTime } from "../../../utils/formatToIndianDate";

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

  const Row = ({
    label,
    value,
  }: {
    label: string;
    value: React.ReactNode;
  }) => (
    <div className="flex items-start justify-between py-3">
      <Typography variant="label" color="body2" className="font-medium text-xs text-gray-500 font-medium uppercase tracking-wide block">
        {label}</Typography>
      <Typography variant="bodySmall" className="text-gray-900">
        {value}
      </Typography>
    </div>
  );

  return (
    <div className="rounded-xl bg-white">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex  gap-2 items-center">
          <Typography variant="subheading" className="font-semibold">
            Leave Details
          </Typography>
          {/* if custom_auto_created is 1 that means its a Unpaid Leave and we show it like a leave on UI in yellow color */}
          {data?.custom_auto_created === 1 && (
            <Badge
              size="sm"
              label="System Generated"
              backgroundColor="bg-blue-50"
              textColor="text-blue-600"
            />
          )}
        </div>

        {data.status && (
          <Tooltip content="Status" position="bottom">
            <Badge
              size="sm"
              label={data.status === "Cancelled" ? "Revoked" : data.status}
              backgroundColor={status.backgroundColor}
              textColor={status.textColor}
            />
          </Tooltip>
        )}
      </div>

      {/* Content */}
      <div>
        {data.leave_type && (
          <Row label="Leave Type" value={`${data?.custom_leave_type_name || ""} (${data.leave_type})`} />
        )}

        <Row
          label="Duration"
          value={`${formatDate(data.from_date)} – ${formatDate(
            data.to_date
          )}`}
        />

        {data.total_leave_days && (
          <Row
            label="Total Days"
            value={`${data.total_leave_days} ${data.total_leave_days === 1 ? "day" : "days"
              }`}
          />
        )}

        {isHalfDay && (
          <div className="py-4">
            <div className="bg-blue-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                  Half Day Details
                </span>
              </div>

              {data.half_day_date && (
                <div className="flex justify-between text-xs">
                  <span className="text-blue-700">Half Day Date</span>
                  <span className="font-medium text-blue-900 bg-white px-2 py-1 rounded">
                    {formatDate(data.half_day_date)}
                  </span>
                </div>
              )}

              {data.custom_half_day_type && (
                <div className="flex justify-between text-xs">
                  <span className="text-blue-700">Type</span>
                  <span className="font-medium text-blue-900 bg-white px-2 py-1 rounded">
                    {data.custom_half_day_type}
                  </span>
                </div>
              )}

              {data.custom_second_half_day_date && (
                <div className="flex justify-between text-xs">
                  <span className="text-blue-700">Second Half Date</span>
                  <span className="font-medium text-blue-900 bg-white px-2 py-1 rounded">
                    {formatDate(data.custom_second_half_day_date)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {data.name && (
          <Row label="Application ID" value={data.name} />
        )}

        {data.posting_date && (
          <Row
            label="Posted On"
            value={formatToIndianDateWithTime(data.posting_date)}
          />
        )}

        {data.leave_balance !== undefined && (
          <Row
            label="Leave Balance"
            value={`${data.leave_balance} ${data.leave_balance === 1 ? "day" : "days"
              }`}
          />
        )}
      </div>

      {/* Description */}
      {data.description && data.description.trim() && (
        <div className="mt-5">
          <Typography variant="label" color="body2" className="font-medium text-xs text-gray-500 font-medium uppercase tracking-wide block">
            Description
          </Typography>
          <Typography
            variant="bodySmall"
            className="text-gray-700 bg-gray-50/30 p-2 rounded-lg leading-relaxed"
          >            {data.description.trim()}
          </Typography>
        </div>
      )}
    </div>
  );
};
