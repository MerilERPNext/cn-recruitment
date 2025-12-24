import React from "react";
import {
  CheckCircle,
  XCircle,
  Timer,
  Calendar,
  Clock,
  Clock8,
} from "lucide-react";
import SummaryCard from "./Attendance/SummaryCard";
import { useScreenSize } from "../hooks/useScreenSize";
import { ViewAll } from "./shared/atoms/ViewAll";

interface AttendanceChartProps {
  present?: number;
  absent?: number;
  leaves?: number;
  week_offs?: number;
  avg_late_by?: number;
  avg_working_hours?: number;
  avg_overtime?: number;
  className?: string;
  selectedMonth?: Date;
}

const AttendanceChart: React.FC<AttendanceChartProps> = ({
  present = 0,
  absent = 0,
  leaves = 0,
  week_offs = 0,
  avg_working_hours = 0,
  avg_overtime = 0,
  avg_late_by = 0,
  className = "",
  selectedMonth,
}) => {
  const { isDesktop } = useScreenSize();

  const total = present + absent + leaves;
  // const presentPercent = total > 0 ? (present / total) * 100 : 0;
  // const absentPercent = total > 0 ? (absent / total) * 100 : 0;
  // const leavesPercent = total > 0 ? (leaves / total) * 100 : 0;

  // Convert percentages to angles (360 degrees = 100%)
  // const presentAngle = (presentPercent / 100) * 360;
  // const absentAngle = (absentPercent / 100) * 360;

  // SVG path for donut segments
  const createArcPath = (
    startAngle: number,
    endAngle: number,
    outerRadius: number,
    innerRadius: number
  ) => {
    const startAngleRad = (startAngle - 90) * (Math.PI / 180);
    const endAngleRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = 100 + outerRadius * Math.cos(startAngleRad);
    const y1 = 100 + outerRadius * Math.sin(startAngleRad);
    const x2 = 100 + outerRadius * Math.cos(endAngleRad);
    const y2 = 100 + outerRadius * Math.sin(endAngleRad);

    const x3 = 100 + innerRadius * Math.cos(endAngleRad);
    const y3 = 100 + innerRadius * Math.sin(endAngleRad);
    const x4 = 100 + innerRadius * Math.cos(startAngleRad);
    const y4 = 100 + innerRadius * Math.sin(startAngleRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  // Get days in current month
  const getDaysInCurrentMonth = () => {
    const today = selectedMonth || new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  };

  const daysInMonth = getDaysInCurrentMonth();

  const totalWorkingDays = daysInMonth - (present + absent + leaves + week_offs);
  // Percentages based on total working days
  const presentPercent = (present / totalWorkingDays) * 100;
  const absentPercent = (absent / totalWorkingDays) * 100;
  const leavesPercent = (leaves / totalWorkingDays) * 100;

  // Angles
  const presentAngle = (presentPercent / 100) * 360;
  const absentAngle = (absentPercent / 100) * 360;
  const leavesAngle = (leavesPercent / 100) * 360;


  return (
    <div
      className={`bg-white p-6 rounded-lg border border-gray-200 ${className}`}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="base-title md:module-title">Attendance Overview</h3>
          <p className="text-sm text-gray-600">Monthly attendance summary</p>
        </div>
        <div className="text-center">
          <p className="text-xl md:text-2xl font-bold text-gray-900">{total}</p>
          <p className="text-sm text-gray-500">Total Days</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Donut Chart */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <svg
              width="300"
              height="300"
              viewBox="0 0 200 200"
              className="transform -rotate-90"
            >
              {/* Base gray ring */}
              <circle
                cx="100"
                cy="100"
                r="65"
                stroke="#e5e7eb"
                strokeWidth="30"
                fill="none"
              />

              {/* Present */}
              {present > 0 && (
                <path
                  d={createArcPath(0, presentAngle, 80, 50)}
                  fill="#10b981"
                  className="transition-all duration-700 hover:opacity-80"
                />
              )}

              {/* Absent */}
              {absent > 0 && (
                <path
                  d={createArcPath(
                    presentAngle,
                    presentAngle + absentAngle,
                    80,
                    50
                  )}
                  fill="#ef4444"
                  className="transition-all duration-700 hover:opacity-80"
                />
              )}

              {/* Leaves */}
              {leaves > 0 && (
                <path
                  d={createArcPath(
                    presentAngle + absentAngle,
                    presentAngle + absentAngle + leavesAngle,
                    80,
                    50
                  )}
                  fill="#f59e0b"
                  className="transition-all duration-700 hover:opacity-80"
                />
              )}
            </svg>


            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-xl md:text-2xl font-bold text-gray-900">
                  {presentPercent.toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500">Present</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <ViewAll className="ml-auto mb-2" title="View in Calender" to="/webapp/attendance/emp-attendance" />
          {/* Statistics */}
          {/* Attendance Summary Cards */}
          <div
            className={`grid gap-3 ${isDesktop ? "grid-cols-2" : "grid-cols-3"}`}
          >
            {/* Present Summary Card */}
            <SummaryCard
              icon={CheckCircle}
              iconColor="text-green-600"
              bgColor="bg-green-50"
              borderColor="border-green-100"
              value={present}
              label="Present Days"
              isDesktop={isDesktop}
              isMetric={true}
            />

            {/* Absent Summary Card */}
            <SummaryCard
              icon={XCircle}
              iconColor="text-red-600"
              bgColor="bg-red-50"
              borderColor="border-red-100"
              value={absent}
              label="Absent Days"
              isDesktop={isDesktop}
              isMetric={true}
            />

            {/* Leave Summary Card */}
            <SummaryCard
              icon={Calendar}
              iconColor="text-orange-600"
              bgColor="bg-orange-50"
              borderColor="border-orange-100"
              value={leaves}
              label="Leave Days"
              isDesktop={isDesktop}
              isMetric={true}
            />

            <SummaryCard
              icon={Timer}
              iconColor="text-yellow-600"
              bgColor="bg-yellow-50"
              borderColor="border-yellow-100"
              value={avg_late_by}
              label="Avg. Overtime"
              isDesktop={isDesktop}
              isMetric={true}
            />

            <SummaryCard
              icon={Clock}
              iconColor="text-blue-600"
              bgColor="bg-blue-50"
              borderColor="border-blue-100"
              value={avg_working_hours}
              label="Avg. Work Duration"
              isDesktop={isDesktop}
              isMetric={true}
            />

            <SummaryCard
              icon={Clock8}
              iconColor="text-purple-600"
              bgColor="bg-purple-50"
              borderColor="border-purple-100"
              value={avg_overtime}
              label="Avg. Late By"
              isDesktop={isDesktop}
              isMetric={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceChart;
