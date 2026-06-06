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
import { Card } from "./shared/atoms/Card";
import { Typography } from "./shared/atoms/Typography";

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
    innerRadius: number,
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

  const otherDays = Math.max(
    daysInMonth - (present + absent + leaves + week_offs),
    0,
  );

  // Percentages based on total working days
  const presentPercent = isNaN((present / total) * 100)
    ? 0
    : (present / total) * 100;
  const absentPercent = isNaN((absent / total) * 100)
    ? 0
    : (absent / total) * 100;
  const leavesPercent = isNaN((leaves / total) * 100)
    ? 0
    : (leaves / total) * 100;
  const otherDaysPercent = isNaN((otherDays / total) * 100)
    ? 0
    : (otherDays / total) * 100;

  const toAngle = (percent: number) => Math.min((percent / 100) * 360, 359.999);

  // Angles
  const presentAngle = toAngle(presentPercent);
  const absentAngle = toAngle(absentPercent);
  const leavesAngle = toAngle(leavesPercent);
  const otherDaysAngle = toAngle(otherDaysPercent);

  return (
    <div className={`p-1 ${className}`}>
      {/* Header Section */}

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-4 items-stretch ">
        {/* Chart Section - 70% */}
        {/* Chart Section - 70% */}
        <Card
          radius="xl"
          className="w-full lg:w-[70%] p-6 lg:p-0 flex flex-col xl:flex-row items-center justify-center lg:justify-around gap-8"
        >
          {/* Chart */}
          <div className="relative w-full max-w-[20rem] xl:max-w-[24rem] aspect-square flex-shrink-0">
            <svg
              width="100%"
              height="100%"
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
                  className="hover:opacity-80"
                />
              )}

              {/* Absent */}
              {absent > 0 && (
                <path
                  d={createArcPath(
                    presentAngle,
                    presentAngle + absentAngle,
                    80,
                    50,
                  )}
                  fill="#ef4444"
                  className="hover:opacity-80"
                />
              )}

              {/* Leaves */}
              {leaves > 0 && (
                <path
                  d={createArcPath(
                    presentAngle + absentAngle,
                    presentAngle + absentAngle + leavesAngle,
                    80,
                    50,
                  )}
                  fill="#f59e0b"
                  className="hover:opacity-80"
                />
              )}

              {/* Week Offs */}
              {week_offs > 0 && (
                <path
                  d={createArcPath(
                    presentAngle + absentAngle + leavesAngle,
                    presentAngle + absentAngle + leavesAngle,
                    80,
                    50,
                  )}
                  fill="#FFC0CB"
                  className="hover:opacity-80"
                />
              )}

              {/* Other/Remaining */}
              {otherDaysAngle > 0 && (
                <path
                  d={createArcPath(
                    presentAngle + absentAngle + leavesAngle,
                    presentAngle + absentAngle + leavesAngle + otherDaysAngle,
                    80,
                    50,
                  )}
                  fill="transparent"
                />
              )}
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">
                  {presentPercent.toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                  Present
                </p>
              </div>
            </div>
          </div>

          {/* Percentage Cards */}
          <div className="flex flex-col xl:flex-col gap-4 w-full xl:w-auto h-fit justify-center">
            {/* Present Card */}
            <div className="flex gap-2 flex-1 xl:flex-none min-w-[120px] px-4 py-3 xl:py-1 rounded-xl bg-emerald-50 border border-emerald-100 items-center justify-center">
              <Typography
                variant="bodyMedium"
                color="success"
                className="font-bold text-"
              >
                {presentPercent.toFixed(0)}%
              </Typography>
              <Typography variant="bodyMedium" color="success" className="">
                Present
              </Typography>
            </div>

            {/* Absent Card */}
            <div className="gap-2 flex-1 xl:flex-none min-w-[120px] px-4 py-3 xl:py-1 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
              <Typography variant="bodyMedium" color="error">
                {absentPercent.toFixed(0)}%
              </Typography>
              <Typography variant="bodyMedium" color="error">
                Absent
              </Typography>
            </div>

            {/* Leave Card */}
            <div className="gap-2 flex-1 xl:flex-none min-w-[120px] px-4 py-3 xl:py-1 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
              <Typography variant="bodyMedium" color="warning">
                {leavesPercent.toFixed(0)}%
              </Typography>
              <Typography variant="bodyMedium" color="warning">
                Leaves
              </Typography>
            </div>
          </div>
        </Card>

        {/* Summary Cards Grid - 30% */}
        <div className="w-full lg:w-[30%] grid grid-cols-2 gap-4 h-full content-start">
          <SummaryCard
            icon={CheckCircle}
            iconColor="text-primary-600"
            bgColor="bg-primary-50"
            borderColor="border-primary-100"
            value={total}
            label="Total Days"
            isDesktop={isDesktop}
            isMetric={true}
          />
          <SummaryCard
            icon={CheckCircle}
            iconColor="text-emerald-600"
            bgColor="bg-emerald-50"
            borderColor="border-emerald-100"
            value={present}
            label="Present"
            isDesktop={isDesktop}
            isMetric={true}
          />

          <SummaryCard
            icon={XCircle}
            iconColor="text-rose-600"
            bgColor="bg-rose-50"
            borderColor="border-rose-100"
            value={absent}
            label="Absent"
            isDesktop={isDesktop}
            isMetric={true}
          />

          <SummaryCard
            icon={Calendar}
            iconColor="text-amber-600"
            bgColor="bg-amber-50"
            borderColor="border-amber-100"
            value={leaves}
            label="Leaves"
            isDesktop={isDesktop}
            isMetric={true}
          />

          <SummaryCard
            icon={Timer}
            iconColor="text-yellow-600"
            bgColor="bg-yellow-50"
            borderColor="border-yellow-100"
            value={avg_late_by}
            label="Avg. OT"
            isDesktop={isDesktop}
            isMetric={true}
          />

          <SummaryCard
            icon={Timer}
            iconColor="text-pink-600"
            bgColor="bg-pink-50"
            borderColor="border-pink-100"
            value={week_offs}
            label="Week Offs"
            isDesktop={isDesktop}
            isMetric={true}
          />

          <SummaryCard
            icon={Clock}
            iconColor="text-blue-600"
            bgColor="bg-blue-50"
            borderColor="border-blue-100"
            value={avg_working_hours}
            label="Avg. Hours"
            isDesktop={isDesktop}
            isMetric={true}
          />

          <SummaryCard
            icon={Clock8}
            iconColor="text-violet-600"
            bgColor="bg-violet-50"
            borderColor="border-violet-100"
            value={avg_overtime}
            label="Avg. Late"
            isDesktop={isDesktop}
            isMetric={true}
          />
        </div>
      </div>
    </div>
  );
};

export default AttendanceChart;
