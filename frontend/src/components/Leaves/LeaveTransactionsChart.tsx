import React, { useState } from "react";
import Chart from "react-apexcharts";
import { LeaveTransaction } from "../../types/leaves";
import { ChevronUp } from "lucide-react";
import { ApexOptions } from "apexcharts";

interface LeaveTransactionsChartProps {
    data?: LeaveTransaction[];
}

// 🎨 Dynamic color generator (HSL hue cycling)
const generateColors = (count: number): string[] => {
    return Array.from({ length: count }).map((_, i) => {
        const hue = Math.floor((360 / count) * i);
        return `hsl(${hue}, 70%, 50%)`;
    });
};

const LeaveTransactionsChart: React.FC<LeaveTransactionsChartProps> = ({ data }) => {
    const [open, setOpen] = useState(false);

    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    const cleanedData = data?.filter(item => !item.dont_show_in_frontend) ?? [];
    const colors = generateColors(cleanedData.length);

    const monthlySeries = cleanedData.map(item => ({
        name: item.type,
        data: item.monthly,
    }));

    const monthlyOptions: ApexOptions = {
        chart: {
            type: "bar",            // now valid
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
            labels: {
                style: { colors: "#6b7280", fontSize: "14px" },
            },
            title: {
                text: "Days",
                style: { color: "#6b7280", fontSize: "14px" },
            },
        },
        legend: {
            position: "bottom",
        },
        grid: {
            borderColor: "#e5e7eb",
        },
        tooltip: {
            theme: "light",
        },
    };

    return (
        <div className="w-full">
            {/* 🔽 Toggle Bar */}
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

            {/* 🔽 Collapsible Chart */}
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
