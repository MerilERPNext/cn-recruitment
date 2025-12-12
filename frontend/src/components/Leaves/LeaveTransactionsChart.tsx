import React, { useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { LeaveTransaction } from "../../types/leaves";
import { ChevronUp } from "lucide-react";
import { ApexOptions } from "apexcharts";

interface LeaveTransactionsChartProps {
    data?: LeaveTransaction[];
}

// 🎨 Tailwind-400-like color ranges
const COLOR_RANGES = [
    { hMin: 120, hMax: 150, s: 65, l: 50 },
    { hMin: 0, hMax: 10, s: 75, l: 55 },
    { hMin: 45, hMax: 60, s: 80, l: 55 },
    { hMin: 25, hMax: 35, s: 85, l: 55 },
    { hMin: 260, hMax: 280, s: 60, l: 55 },
    { hMin: 200, hMax: 220, s: 70, l: 55 },
];

// Generate n random colors in the above ranges
const generateColors = (count: number): string[] => {
    return Array.from({ length: count }).map(() => {
        const range = COLOR_RANGES[Math.floor(Math.random() * COLOR_RANGES.length)];
        const hue = Math.floor(Math.random() * (range.hMax - range.hMin + 1)) + range.hMin;
        const sat = range.s;
        const light = range.l;
        return `hsl(${hue}, ${sat}%, ${light}%)`;
    });
};
const LeaveTransactionsChart: React.FC<LeaveTransactionsChartProps> = ({ data }) => {
    const [open, setOpen] = useState(false);

    const months = useMemo(() => [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ], []);

    const cleanedData = useMemo(
        () => data?.filter(item => !item.dont_show_in_frontend) ?? [],
        [data]
    );

    const colors = useMemo(() => generateColors(cleanedData.length), [cleanedData]);

    const monthlySeries = useMemo(
        () => cleanedData.map(item => ({
            name: item.type,
            data: item.monthly,
        })),
        [cleanedData]
    );

    const maxValue = useMemo(() => {
        const allValues = cleanedData.flatMap(item => item.monthly);
        const actualMax = Math.max(...allValues, 0);
        return actualMax < 4 ? 4 : actualMax;
    }, [cleanedData]);

    const monthlyOptions: ApexOptions = useMemo(() => ({
        chart: {
            type: "bar",
            stacked: false,
            toolbar: { show: false },
        },
        colors,
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: "50%",
                borderRadius: 4,
            },
        },
        xaxis: {
            categories: months,
            labels: {
                style: { colors: "#6b7280", fontSize: "14px" },
            },
        },

        yaxis: {
            min: 0,               // always start at 0
            max: maxValue,        // at least 7
            tickAmount: maxValue, // ⭐ every value becomes a tick (0,1,2,3,...)
            labels: {
                style: { colors: "#6b7280", fontSize: "14px" },
                formatter: (val: number) => Number.isInteger(val) ? `${val}` : "", // ⭐ show only whole numbers
            },
            title: {
                text: "Days",
                style: { color: "#6b7280", fontSize: "14px" },
            }
        }
        ,
        legend: {
            position: "bottom",
        },

        grid: {
            borderColor: "#e5e7eb",
        },

        tooltip: {
            theme: "light",
            y: {
                formatter: (val: number) =>
                    val % 1 === 0 ? `${val} day(s)` : `${val.toFixed(1)} day(s)`
            }
        },
    }), [colors, months]);

    return (
        <div className="w-full">
            {/* Toggle */}
            <button
                onClick={() => setOpen(!open)}
                className="w-full h-14 bg-white shadow-md rounded-xl flex items-center justify-between px-4 cursor-pointer hover:bg-gray-50 transition"
            >
                <span className="text-lg font-semibold text-gray-800">
                    Monthly Leave Transactions
                </span>

                <span className="text-gray-600">
                    <ChevronUp className={`${open ? "" : "rotate-180"}`} />
                </span>
            </button>

            {/* Collapsible */}
            <div
                className={`overflow-hidden transition-all duration-500 ${open ? "max-h-[2000px] mt-4" : "max-h-0"
                    }`}
            >
                <div className="bg-white rounded-2xl shadow-xl w-full p-4 md:p-8">
                    <Chart
                        options={monthlyOptions}
                        series={monthlySeries}
                        type="bar"
                        height={350}
                    />
                </div>
            </div>
        </div>
    );
};

export default LeaveTransactionsChart;
