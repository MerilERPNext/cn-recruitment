import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { Calendar, ChevronRight } from "lucide-react";
import { useGetLeaveHistory } from "../../hooks/useLeaves";
import type { LeaveHistoryItem } from "../../types/leaves";
import { CardSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";
import CustomDropdown from "../shared/CustomDropdown";
import StatusBadge from "../shared/atoms/statusBadge";
import { NoDataFound } from "../shared/atoms/NoDataFound";
import formatToIndianDate from "../../utils/formatToIndianDate";
import { sanitizeToPlainText } from "../../utils/sanitizeToPlainText";

/* ────────────────────────────────────────────
 * Individual history card – matches reference
 * ──────────────────────────────────────────── */
interface HistoryCardProps {
  data: LeaveHistoryItem;
}

const HistoryCard: React.FC<HistoryCardProps> = ({ data }) => {
  const [expanded, setExpanded] = useState(false);
  if (!data) return null;

  const dateObj = new Date(data.from_date);
  const formattedDate = format(dateObj, "do MMMM");
  const leaveTypeName = data.custom_leave_type_name || data.leave_type || "";

  const status = data.status;
  const cleanDescription = sanitizeToPlainText(data.description);

  // Build the card title – prefer description, fall back to leave type name
  const cardTitle = data.name;

  // Determine if it's a half-day leave
  const isHalfDay = data.half_day === 1;
  const halfDayLabel = isHalfDay
    ? data.custom_half_day_type
      ? `Half day (${data.custom_half_day_type})`
      : "Half day leave"
    : "";

  // Subtitle: date | leave type (| half day info)
  const subtitleParts = [formattedDate, leaveTypeName];
  if (halfDayLabel) subtitleParts.push(halfDayLabel);
  const subtitle = subtitleParts.join(" | ");

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden transition-all mb-3 last:mb-0"
      onClick={() => setExpanded((prev) => !prev)}
    >
      <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer">
        {/* Calendar Icon */}
        <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {cardTitle}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          <div className="mt-1.5">
            <StatusBadge status={status} />
          </div>
        </div>

        {/* Chevron */}
        <ChevronRight
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
            expanded ? "rotate-90" : ""
          }`}
        />
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Duration</span>
            <span className="text-gray-900 font-medium">
              {formatToIndianDate(data.from_date)} –{" "}
              {formatToIndianDate(data.to_date)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Leave Days</span>
            <span className="text-gray-900 font-medium">
              {data.total_leave_days > 1
                ? data.total_leave_days + " Days"
                : data.total_leave_days + " Day"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Leave Type</span>
            <span className="text-gray-900 font-medium">{leaveTypeName}</span>
          </div>
          {cleanDescription && (
            <div className="flex justify-between">
              <span className="text-gray-500">Description</span>
              <span className="text-gray-900 font-medium text-right max-w-[60%]">
                {cleanDescription}
              </span>
            </div>
          )}
          {data.custom_rejection_reason && (
            <div className="flex justify-between">
              <span className="text-gray-500">Rejection Reason</span>
              <span className="text-gray-900 font-medium text-right max-w-[60%]">
                {data.custom_rejection_reason}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────
 * Main History page
 * ──────────────────────────────────────────── */
const LeaveHistory: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));

  const yearOptions = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const y = currentYear - 2 + i;
      return {
        value: String(y),
        label: `Year ${y} - ${(y + 1).toString().slice(-2)}`,
      };
    });
  }, [currentYear]);

  const { data: historyData, isLoading } = useGetLeaveHistory(year);

  const historyList: LeaveHistoryItem[] = historyData || [];

  return (
    <div className="flex flex-col h-full bg-white/50 px-3 py-4 sm:p-6 min-h-full pb-24">
      {/* Year Filter */}
      <div className="flex items-center justify-between mb-6">
        <CustomDropdown
          value={year}
          onChange={(e) => setYear(e.target.value)}
          options={yearOptions}
          variant="outline"
        />
      </div>

      <div className="flex-1 overflow-y-auto pb-5">
        {isLoading ? (
          <div className="space-y-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : historyList.length === 0 ? (
          <NoDataFound
            title="No Leave History"
            subtitle="No reportee leave history for the selected year."
          />
        ) : (
          <div>
            {historyList.map((leave) => (
              <HistoryCard key={leave.name} data={leave} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveHistory;
