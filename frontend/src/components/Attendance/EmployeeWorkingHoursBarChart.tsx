import React, { useMemo, useState, useEffect } from "react";
import Chart from "react-apexcharts";
import { format, parseISO } from "date-fns";
import { enIN } from "date-fns/locale";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import { Select } from "../shared/atoms/Select"; // Your custom Select

interface DayWiseData {
    date: string;
    day: string;
    status: string;
    working_hours: number;
    in_time: string | null;
    out_time: string | null;
}

interface EmployeeWorkingHoursResponse {
    day_wise_data?: DayWiseData[];
}

interface Props {
    isLoading: boolean;
    data?: EmployeeWorkingHoursResponse;
}

const EmployeeWorkingHoursBarChart: React.FC<Props> = ({ data, isLoading }) => {
    // Generate dynamic week ranges with proper dates
    const weekOptions = useMemo(() => {
        if (!data?.day_wise_data?.length) return [];

        // Sort the data to make sure dates are in order
        const sortedDates = [...data.day_wise_data].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const weeks: { label: string; value: string }[] = [];
        const totalDays = sortedDates.length;

        for (let i = 0; i < totalDays; i += 7) {
            const startDate = parseISO(sortedDates[i].date);
            const endIndex = Math.min(i + 6, totalDays - 1);
            const endDate = parseISO(sortedDates[endIndex].date);

            const label = `${format(startDate, "dd MMM", { locale: enIN })} - ${format(
                endDate,
                "dd MMM",
                { locale: enIN }
            )}`;
            const value = `${format(startDate, "yyyy-MM-dd")}_${format(endDate, "yyyy-MM-dd")}`;

            weeks.push({ label, value });
        }

        return weeks;
    }, [data]);

    // State for selected week
    const [selectedWeek, setSelectedWeek] = useState<{ label: string; value: string }>(
        weekOptions[0] || { label: "", value: "" }
    );

    // Sync selectedWeek when weekOptions change (i.e., month data changes)
    useEffect(() => {
        if (weekOptions.length) {
            setSelectedWeek(weekOptions[0]);
        }
    }, [weekOptions]);

    // Filter data based on selected week
    const chartData = useMemo(() => {
        if (!data?.day_wise_data?.length || !selectedWeek?.value) return null;

        const [startStr, endStr] = selectedWeek.value.split("_");
        const startDate = parseISO(startStr);
        const endDate = parseISO(endStr);

        const filteredData = data.day_wise_data.filter((d) => {
            const date = parseISO(d.date);
            return date >= startDate && date <= endDate;
        });

        if (!filteredData.length) return null;

        const sorted = [...filteredData].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        return {
            categories: sorted.map((item) =>
                format(parseISO(item.date), "dd MMM (EEE)", { locale: enIN })
            ),
            series: [
                {
                    name: "Working Hours",
                    data: sorted.map((item) => Number(item.working_hours) || 0),
                },
            ],
        };
    }, [data, selectedWeek]);

    const options: ApexCharts.ApexOptions = {
        chart: { type: "bar", toolbar: { show: false }, zoom: { enabled: false } },
        plotOptions: { bar: { borderRadius: 6, columnWidth: "55%" } },
        dataLabels: { enabled: false },
        xaxis: {
            type: "category",
            categories: chartData?.categories,
            labels: { rotate: -40, style: { fontSize: "11px" } },
            tooltip: { enabled: false },
        },
        yaxis: { title: { text: "Hours" }, min: 0, forceNiceScale: true },
        tooltip: { y: { formatter: (val) => `${val} hrs` } },
        grid: { strokeDashArray: 3 },
        colors: ["#6366F1"],
    };


    if (isLoading) {
        return <Card className="p-4 w-full min-w-[70%] rounded-xl">
            <div className="mb-3 flex justify-between items-center w-full">
                <div>
                    <Typography variant="subheading">Daily Working Hours</Typography>
                    <Typography variant="bodySmall" className="text-gray-500">
                        Attendance for selected month
                    </Typography>
                </div>

                <Select
                    className="w-fit"
                    options={weekOptions}
                    value={selectedWeek}
                    onChange={setSelectedWeek}
                />
            </div>

            <div className="flex justify-center items-center h-64">
                <div className="w-full h-64 bg-gray-200 rounded-lg animate-pulse">
                </div>
            </div>
        </Card>

    }
    if (!weekOptions.length) return <Card className="p-4 w-full min-w-[70%] rounded-xl">
        <div className="mb-3 flex justify-between items-center w-full">
            <div>
                <Typography variant="subheading">Daily Working Hours</Typography>
                <Typography variant="bodySmall" className="text-gray-500">
                    Attendance for selected month
                </Typography>
            </div>

            <Select
                className="w-fit"
                options={weekOptions}
                value={selectedWeek}
                onChange={setSelectedWeek}
            />
        </div>

        <Typography variant="bodySmall" className="text-gray-500">
            No working hours data available.
        </Typography>

    </Card>



    return (
        <Card radius="xl" className="p-4 w-[100%] md:w-[70%]">
            <div className="mb-3 flex justify-between items-center">
                <div>
                    <Typography variant="subheading">Daily Working Hours</Typography>
                    <Typography variant="bodySmall" className="text-gray-500">
                        Attendance for selected month
                    </Typography>
                </div>

                <Select
                    className="w-fit"
                    options={weekOptions}
                    value={selectedWeek}
                    onChange={setSelectedWeek}
                />
            </div>

            {chartData ? (
                <Chart options={options} series={chartData.series} type="bar" height={300} />
            ) : (
                <Typography variant="bodySmall" className="text-gray-500">
                    No working hours data available for this week.
                </Typography>
            )}
        </Card>
    );
};

export default EmployeeWorkingHoursBarChart;
