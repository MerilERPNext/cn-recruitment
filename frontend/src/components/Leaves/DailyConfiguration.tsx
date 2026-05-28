import React, { useMemo } from "react";
import { getDatesBetween } from "../../utils/helperUtils";
import { AttendanceStatusItem } from "../../types/leaves";
import Badge from "../shared/Badge";
import { format, parseISO } from "date-fns";

import formatToIndianDate from "../../utils/formatToIndianDate";
import { useScreenSize } from "../../hooks/useScreenSize";

type DayConfig = "Full Day" | "First Half" | "Second Half";
interface DailyConfigProps {
  fromDate: string;
  toDate: string;
  value: Record<string, DayConfig>;
  onChange: (val: Record<string, DayConfig>) => void;
  attendanceStatus?: AttendanceStatusItem[];
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  Present: {
    bg: "bg-green-100",
    text: "text-green-800",
  },
  Absent: {
    bg: "bg-red-100",
    text: "text-red-800",
  },
  "On Leave": {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
  },
  "Half Day": {
    bg: "bg-orange-100",
    text: "text-orange-800",
  },
  "Work From Home": {
    bg: "bg-blue-100",
    text: "text-blue-800",
  },
};

const DailyConfiguration: React.FC<DailyConfigProps> = ({
  fromDate,
  toDate,
  value,
  onChange,
  attendanceStatus,
}) => {
  const { isMobile } = useScreenSize();
  const dates = useMemo(
    () => getDatesBetween(fromDate, toDate),
    [fromDate, toDate],
  );

  const applyToAll = (type: DayConfig) => {
    const next: Record<string, DayConfig> = {};
    dates.forEach((d) => {
      next[d] = type;
    });
    onChange(next);
  };

  const allSame: DayConfig | null = useMemo(() => {
    if (!dates.length) return null;

    const first = value[dates[0]] ?? "Full Day";
    return dates.every((d) => (value[d] ?? "Full Day") === first)
      ? first
      : null;
  }, [dates, value]);

  return (
    <div className="mx-2 mt-4 border rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-gray-50 font-medium text-gray-800 text-sm border-b">
        Daily Configuration
      </div>

      {/* Apply to all section */}
      <div className="px-4 py-3 border-b bg-white flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="font-medium text-gray-700">Apply to all:</span>

        <label className="flex items-center gap-1.5 cursor-pointer select-none text-gray-600 hover:text-gray-900">
          <input
            type="radio"
            name="apply-all"
            checked={allSame === "First Half"}
            onChange={() => applyToAll("First Half")}
            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
          />
          First Half
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer select-none text-gray-600 hover:text-gray-900">
          <input
            type="radio"
            name="apply-all"
            checked={allSame === "Second Half"}
            onChange={() => applyToAll("Second Half")}
            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
          />
          Second Half
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer select-none text-gray-600 hover:text-gray-900">
          <input
            type="radio"
            name="apply-all"
            checked={allSame === "Full Day"}
            onChange={() => applyToAll("Full Day")}
            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
          />
          Full Day
        </label>
      </div>

      {/* Conditionally Render Table on Desktop/Tablet and Cards on Mobile */}
      {!isMobile ? (
        <table className="w-full border-collapse">
          <thead className="bg-gray-100 text-left text-sm text-gray-600">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Attendance</th>
              <th className="px-4 py-2 font-medium">Leave Options</th>
            </tr>
          </thead>

          <tbody>
            {dates.map((date) => {
              const selected = value[date] ?? "Full Day";

              return (
                <tr key={date} className="border-t hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-2 text-sm text-gray-900">
                    <span>{formatToIndianDate(date)}</span>
                    <span className="text-gray-500 ml-1 text-xs">
                      ({format(parseISO(date), "EEEE")})
                    </span>
                  </td>

                  <td className="px-4 py-2">
                    {(() => {
                      const statusRecord = attendanceStatus?.find(
                        (r) => r.attendance_date === date,
                      );
                      if (!statusRecord) return "-";

                      const style = STATUS_STYLES[statusRecord.status] || {
                        bg: "bg-gray-100",
                        text: "text-gray-800",
                      };

                      return (
                        <Badge
                          label={statusRecord.status}
                          backgroundColor={style.bg}
                          textColor={style.text}
                          size="sm"
                        />
                      );
                    })()}
                  </td>

                  <td className="px-4 py-2">
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none text-gray-700 hover:text-gray-900 text-sm">
                        <input
                          type="radio"
                          name={`half-${date}`}
                          checked={selected === "First Half"}
                          onChange={() =>
                            onChange({ ...value, [date]: "First Half" })
                          }
                          className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        First Half
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer select-none text-gray-700 hover:text-gray-900 text-sm">
                        <input
                          type="radio"
                          name={`half-${date}`}
                          checked={selected === "Second Half"}
                          onChange={() =>
                            onChange({ ...value, [date]: "Second Half" })
                          }
                          className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        Second Half
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer select-none text-gray-700 hover:text-gray-900 text-sm">
                        <input
                          type="radio"
                          name={`half-${date}`}
                          checked={selected === "Full Day"}
                          onChange={() =>
                            onChange({ ...value, [date]: "Full Day" })
                          }
                          className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        Full Day
                      </label>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="divide-y divide-gray-100 bg-white">
          {dates.map((date) => {
            const selected = value[date] ?? "Full Day";
            const statusRecord = attendanceStatus?.find(
              (r) => r.attendance_date === date,
            );
            const style = statusRecord
              ? STATUS_STYLES[statusRecord.status] || {
                bg: "bg-gray-100",
                text: "text-gray-800",
              }
              : null;

            return (
              <div key={date} className="p-4 flex flex-col gap-3">
                {/* Card Header: Date & Attendance Status */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900 text-sm">
                      {formatToIndianDate(date)}
                    </span>
                    <span className="text-gray-500 text-xs ml-1.5">
                      ({format(parseISO(date), "EEEE")})
                    </span>
                  </div>
                  <div>
                    {statusRecord ? (
                      <Badge
                        label={statusRecord.status}
                        backgroundColor={style?.bg || "bg-gray-200"}
                        textColor={style?.text || "text-gray-700"}
                        size="sm"
                      />
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </div>
                </div>

                {/* Radio options inside a custom horizontal pill selector for cards */}
                <div className="flex items-center justify-between gap-1.5 bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-gray-700 hover:text-gray-900 flex-1 justify-center">
                    <input
                      type="radio"
                      name={`half-mobile-${date}`}
                      checked={selected === "First Half"}
                      onChange={() =>
                        onChange({ ...value, [date]: "First Half" })
                      }
                      className="h-3.5 w-3.5 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span>First Half</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-gray-700 hover:text-gray-900 flex-1 justify-center border-l border-gray-200 pl-1.5">
                    <input
                      type="radio"
                      name={`half-mobile-${date}`}
                      checked={selected === "Second Half"}
                      onChange={() =>
                        onChange({ ...value, [date]: "Second Half" })
                      }
                      className="h-3.5 w-3.5 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span>Second Half</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-gray-700 hover:text-gray-900 flex-1 justify-center border-l border-gray-200 pl-1.5">
                    <input
                      type="radio"
                      name={`half-mobile-${date}`}
                      checked={selected === "Full Day"}
                      onChange={() =>
                        onChange({ ...value, [date]: "Full Day" })
                      }
                      className="h-3.5 w-3.5 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span>Full Day</span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DailyConfiguration;
