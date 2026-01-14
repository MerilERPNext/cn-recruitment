import React, { useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { Link } from "react-router-dom";
import {
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    TrendingUp,
    Briefcase,
    Plus,
    FileText,
    Users,
    ArrowRight,
} from "lucide-react";
import StatCard from "../shared/molecules/StatCard";
import ChartCard from "../shared/molecules/ChartCard";
import { Typography } from "../shared/atoms/Typography";
import DateFilter from "../shared/atoms/DateFilter";

const LeaveSummary: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    // Mock data for leave balance by type
    const leaveBalanceData = {
        series: [12, 5, 8, 3],
        labels: ["Casual Leave", "Sick Leave", "Earned Leave", "Other"],
    };

    // Mock data for leave usage trends over months
    const leaveUsageTrends = {
        series: [
            {
                name: "Leaves Taken",
                data: [2, 1, 3, 2, 1, 4, 2, 3, 1, 2, 0, 0],
            },
            {
                name: "Leaves Approved",
                data: [2, 1, 3, 2, 2, 4, 2, 3, 2, 2, 1, 0],
            },
        ],
        categories: [
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
    };

    // Mock data for leave type distribution
    const leaveTypeDistribution = {
        series: [
            {
                name: "Days",
                data: [8, 5, 6, 2],
            },
        ],
        categories: ["Casual", "Sick", "Earned", "Other"],
    };

    // Donut chart options for leave balance
    const donutOptions: ApexOptions = {
        chart: {
            type: "donut",
            toolbar: { show: false },
        },
        labels: leaveBalanceData.labels,
        colors: ["#6ee7b7", "#fcd34d", "#a5b4fc", "#c4b5fd"],
        legend: {
            position: "bottom",
            fontSize: "14px",
        },
        states: {
            hover: {
                filter: {
                    type: "darken",
                    value: 0.9,
                } as any,
            },
            active: {
                allowMultipleDataPointsSelection: false,
                filter: {
                    type: "darken",
                    value: 0.9,
                } as any,
            },
        },
        plotOptions: {
            pie: {
                donut: {
                    size: "70%",
                    labels: {
                        show: true,
                        name: {
                            show: true,
                            fontSize: "16px",
                            fontWeight: 600,
                        },
                        value: {
                            show: true,
                            fontSize: "24px",
                            fontWeight: 700,
                            color: "#111827",
                        },
                        total: {
                            show: true,
                            label: "Total Available",
                            fontSize: "14px",
                            color: "#6b7280",
                            formatter: function (w) {
                                const total = w.globals.seriesTotals.reduce(
                                    (a: number, b: number) => a + b,
                                    0
                                );
                                return `${total} days`;
                            },
                        },
                    },
                },
            },
        },
        dataLabels: {
            enabled: false,
        },
        tooltip: {
            y: {
                formatter: (val) => `${val} days`,
            },
        },
    };

    // Line chart options for leave usage trends
    const lineOptions: ApexOptions = {
        chart: {
            type: "line",
            toolbar: { show: false },
            zoom: { enabled: false },
        },
        colors: ["#6366f1", "#10b981"],
        states: {
            hover: {
                filter: {
                    type: "darken",
                    value: 0.9,
                } as any,
            },
            active: {
                allowMultipleDataPointsSelection: false,
                filter: {
                    type: "darken",
                    value: 0.9,
                } as any,
            },
        },
        stroke: {
            curve: "smooth",
            width: 3,
        },
        markers: {
            size: 5,
            hover: {
                size: 7,
            },
        },
        xaxis: {
            categories: leaveUsageTrends.categories,
            labels: {
                style: { colors: "#6b7280", fontSize: "12px" },
            },
        },
        yaxis: {
            title: {
                text: "Days",
                style: { color: "#6b7280", fontSize: "14px" },
            },
            labels: {
                style: { colors: "#6b7280", fontSize: "12px" },
                formatter: (val) => (Number.isInteger(val) ? `${val}` : ""),
            },
        },
        legend: {
            position: "top",
            horizontalAlign: "right",
        },
        grid: {
            borderColor: "#e5e7eb",
        },
        tooltip: {
            y: {
                formatter: (val) => `${val} day(s)`,
            },
        },
    };

    // Bar chart options for leave type distribution
    const barOptions: ApexOptions = {
        chart: {
            type: "bar",
            toolbar: { show: false },
        },
        colors: ["#818cf8"],
        states: {
            hover: {
                filter: {
                    type: "darken",
                    value: 0.9,
                } as any,
            },
            active: {
                allowMultipleDataPointsSelection: false,
                filter: {
                    type: "darken",
                    value: 0.9,
                } as any,
            },
        },
        plotOptions: {
            bar: {
                borderRadius: 8,
                columnWidth: "60%",
                distributed: true,
            },
        },
        dataLabels: {
            enabled: false,
        },
        xaxis: {
            categories: leaveTypeDistribution.categories,
            labels: {
                style: { colors: "#6b7280", fontSize: "12px" },
            },
        },
        yaxis: {
            title: {
                text: "Days Used",
                style: { color: "#6b7280", fontSize: "14px" },
            },
            labels: {
                style: { colors: "#6b7280", fontSize: "12px" },
                formatter: (val) => (Number.isInteger(val) ? `${val}` : ""),
            },
        },
        legend: {
            show: false,
        },
        grid: {
            borderColor: "#e5e7eb",
        },
        tooltip: {
            y: {
                formatter: (val) => `${val} days`,
            },
        },
    };

    return (
        <div className="space-y-6 p-4">
            {/* Page Header */}
            <div className="mb-6">
                <Typography variant="h2" className="text-gray-900 font-bold text-2xl mb-2">
                    Leave Summary
                </Typography>
                <Typography variant="bodyMedium" className="text-gray-600">
                    Overview of your leave balance, usage, and trends
                </Typography>
            </div>

            {/* Date Filter */}
            <DateFilter
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                label="Leave Overview"
            />

            {/* Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <Link
                    to="/webapp/leave-app/leaves/leave-requests/my"
                    className="group flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all duration-200 no-underline"
                >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                        <Plus className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <Typography variant="bodySmall" className="text-gray-900 font-semibold">
                            Apply Leave
                        </Typography>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </Link>

                <Link
                    to="/webapp/leave-app/leaves/leave-balance"
                    className="group flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all duration-200 no-underline"
                >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-50 text-green-600 group-hover:bg-green-100 transition-colors">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <Typography variant="bodySmall" className="text-gray-900 font-semibold">
                            Leave Balance
                        </Typography>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </Link>

                <Link
                    to="/webapp/leave-app/leaves/holidays"
                    className="group flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all duration-200 no-underline"
                >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <Typography variant="bodySmall" className="text-gray-900 font-semibold">
                            Holidays
                        </Typography>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </Link>

                <Link
                    to="/webapp/leave-app/leaves/leave-requests/team"
                    className="group flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all duration-200 no-underline"
                >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
                        <Users className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <Typography variant="bodySmall" className="text-gray-900 font-semibold">
                            Team Requests
                        </Typography>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </Link>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={Calendar}
                    iconColor="text-blue-600"
                    iconBgColor="bg-blue-50"
                    title="Total Leaves Available"
                    value="28 days"
                    trend={{ value: 5, isPositive: true }}
                />
                <StatCard
                    icon={CheckCircle}
                    iconColor="text-green-600"
                    iconBgColor="bg-green-50"
                    title="Leaves Taken"
                    value="21 days"
                />
                <StatCard
                    icon={Clock}
                    iconColor="text-amber-600"
                    iconBgColor="bg-amber-50"
                    title="Pending Requests"
                    value="2"
                />
                <StatCard
                    icon={Briefcase}
                    iconColor="text-purple-600"
                    iconBgColor="bg-purple-50"
                    title="Upcoming Leaves"
                    value="3 days"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Leave Balance Overview */}
                <ChartCard
                    title="Leave Balance by Type"
                    subtitle="Current available leaves breakdown"
                >
                    <Chart
                        options={donutOptions}
                        series={leaveBalanceData.series}
                        type="donut"
                        height={350}
                    />
                </ChartCard>

                {/* Leave Type Distribution */}
                <ChartCard
                    title="Leave Usage by Type"
                    subtitle="Days used per leave category"
                >
                    <Chart
                        options={barOptions}
                        series={leaveTypeDistribution.series}
                        type="bar"
                        height={350}
                    />
                </ChartCard>
            </div>

            {/* Leave Usage Trends - Full Width */}
            <ChartCard
                title="Leave Usage Trends"
                subtitle="Monthly leave consumption pattern"
            >
                <Chart
                    options={lineOptions}
                    series={leaveUsageTrends.series}
                    type="line"
                    height={350}
                />
            </ChartCard>

            {/* Additional Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <Typography variant="label" className="text-blue-900 font-semibold">
                            Most Used Leave Type
                        </Typography>
                    </div>
                    <Typography variant="h3" className="text-blue-900 font-bold text-xl">
                        Casual Leave
                    </Typography>
                    <Typography variant="bodySmall" className="text-blue-700 mt-1">
                        8 days this year
                    </Typography>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <Typography variant="label" className="text-green-900 font-semibold">
                            Approval Rate
                        </Typography>
                    </div>
                    <Typography variant="h3" className="text-green-900 font-bold text-xl">
                        95%
                    </Typography>
                    <Typography variant="bodySmall" className="text-green-700 mt-1">
                        19 of 20 requests approved
                    </Typography>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                            <XCircle className="w-5 h-5 text-white" />
                        </div>
                        <Typography variant="label" className="text-purple-900 font-semibold">
                            Average Leave Duration
                        </Typography>
                    </div>
                    <Typography variant="h3" className="text-purple-900 font-bold text-xl">
                        2.1 days
                    </Typography>
                    <Typography variant="bodySmall" className="text-purple-700 mt-1">
                        Per leave request
                    </Typography>
                </div>
            </div>
        </div>
    );
};

export default LeaveSummary;
