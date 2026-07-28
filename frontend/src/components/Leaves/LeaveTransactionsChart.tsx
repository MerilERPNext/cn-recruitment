import React, { useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { LeaveTransaction } from "../../types/leaves";
import { ChevronUp } from "lucide-react";
import { ApexOptions } from "apexcharts";
import { useScreenSize } from "../../hooks/useScreenSize";

interface LeaveTransactionsChartProps {
  data?: LeaveTransaction[];
}

// 🎨 Tailwind-400-like color palette ranges
const COLOR_RANGES = [
  { hMin: 120, hMax: 150, s: 65, l: 50 }, // green
  { hMin: 0, hMax: 10, s: 75, l: 55 }, // red
  { hMin: 45, hMax: 60, s: 80, l: 55 }, // yellow
  { hMin: 25, hMax: 35, s: 85, l: 55 }, // orange
  { hMin: 260, hMax: 280, s: 60, l: 55 }, // purple
  { hMin: 200, hMax: 220, s: 70, l: 55 }, // blue
];

// 🎨 Generate stable color for a given type
const getColorByIndex = (index: number): string => {
  const range = COLOR_RANGES[index % COLOR_RANGES.length];

  // pick middle hue of range for consistency
  const hue = Math.floor((range.hMin + range.hMax) / 2);

  return `hsl(${hue}, ${range.s}%, ${range.l}%)`;
};

const LeaveTransactionsChart: React.FC<LeaveTransactionsChartProps> = ({
  data,
}) => {
  const [open, setOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const { isDesktop } = useScreenSize();

  const months = useMemo(
    () => [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    [],
  );

  const cleanedData = useMemo(
    () => data?.filter((item) => !item.dont_show_in_frontend) ?? [],
    [data],
  );

  // ✅ Series data
  const monthlySeries = useMemo(
    () =>
      cleanedData.map((item) => ({
        name: item.name || item.type,
        data: item.monthly,
      })),
    [cleanedData],
  );

  // ✅ One color per item.type (stable)
  const colors = useMemo(
    () => cleanedData.map((_, index) => getColorByIndex(index)),
    [cleanedData],
  );

  const maxValue = useMemo(() => {
    const allValues = cleanedData.flatMap((item) => item.monthly);
    const actualMax = Math.max(...allValues, 0);
    return actualMax < 6 ? 6 : actualMax;
  }, [cleanedData]);

  const MAX_TICKS = 6;
  const tickAmount = Math.min(maxValue, MAX_TICKS);

  const monthlyOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        type: "bar",
        toolbar: { show: false },

      },
      dataLabels: {
        enabled: false,
      },
      colors, // ✅ colors mapped to series order
      plotOptions: {
        bar: {
          columnWidth: "50%",
          borderRadius: 4,
        },
      },
      xaxis: {
        categories: months,
        labels: {
          style: { colors: "#6b7280", fontSize: "14px" },
          offsetY: 5,
        },
        title: {
          text: "Months",
          style: { color: "#6b7280", fontSize: "14px", fontWeight: 500 },
          offsetY: 5,
        },
      },
      yaxis: {
        min: 0,
        max: maxValue,
        tickAmount,
        labels: {
          style: { colors: "#6b7280", fontSize: "14px" },
          formatter: (val) => (Number.isInteger(val) ? `${val}` : ""),
          offsetX: -5,
        },
        title: {
          text: "Days",
          style: { color: "#6b7280", fontSize: "14px", fontWeight: 500 },
          offsetX: -5,
        },
      },
      legend: {
        position: "bottom",
      },
      grid: {
        borderColor: "#e5e7eb",
        padding: {
          bottom: 15,
          left: 15,
        },
      },
      tooltip: {
        y: {
          formatter: (val) => `${val} day(s)`,
        },
      },
    }),
    [colors, months, maxValue, tickAmount],
  );

  if (!isDesktop) return null;

  return (
    <div
      className="w-full"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => !isLocked && setOpen(false)}
    >
      <button
        onClick={() => {
          const nextLocked = !isLocked;
          setIsLocked(nextLocked);
          setOpen(nextLocked);
        }}
        className="w-full h-14 bg-white shadow-md rounded-b-xl flex items-center justify-between px-4 hover:bg-primary/10 transition"
      >
        <span className="text-lg font-semibold text-gray-800">
          Monthly Leave Transactions
        </span>
        <ChevronUp className={`${open ? "" : "rotate-180"} text-gray-600`} />
      </button>

      <div
        className={`overflow-hidden transition-all duration-500 ${open ? "max-h-[2000px] mt-4" : "max-h-0"
          }`}
      >
        <div className="bg-white rounded-2xl w-full p-4 md:p-8">
          <Chart
            options={monthlyOptions}
            series={monthlySeries}
            type="bar"
            height={380}
          />
        </div>
      </div>
    </div>
  );
};

export default LeaveTransactionsChart;
