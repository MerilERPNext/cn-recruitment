import React, { useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { Link } from "react-router-dom";
import {
    DollarSign,
    TrendingDown,
    Clock,
    CheckCircle,
    Receipt,
    CreditCard,
    Wallet,
    XCircle,
    Plus,
    Users,
    ArrowRight,
    ArrowUpDown,
} from "lucide-react";
import StatCard from "../shared/molecules/StatCard";
import ChartCard from "../shared/molecules/ChartCard";
import { Typography } from "../shared/atoms/Typography";
import DateFilter from "../shared/atoms/DateFilter";

const ExpenseSummary: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    // Mock data for expense breakdown by category
    const expenseBreakdown = {
        series: [25000, 15000, 12000, 8000, 10000, 5000],
        labels: ["Travel", "Food", "Accommodation", "Communication", "Office Supplies", "Other"],
    };

    // Mock data for monthly expense trends
    const monthlyTrends = {
        series: [
            {
                name: "Total Expenses",
                data: [8500, 7200, 9500, 8000, 7500, 10200, 8800, 9200, 7800, 8500, 9000, 0],
            },
            {
                name: "Reimbursed",
                data: [8500, 7200, 9500, 8000, 7500, 10200, 8800, 9200, 7800, 8500, 0, 0],
            },
        ],
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    };

    // Mock data for expense status
    const expenseStatus = {
        series: [15, 5, 3, 2],
        labels: ["Paid", "Approved", "Pending", "Rejected"],
    };

    // Mock data for top categories
    const topCategories = {
        series: [
            {
                name: "Amount Spent",
                data: [25, 15, 12, 8, 10],
            },
        ],
        categories: ["Travel", "Food", "Accommodation", "Communication", "Supplies"],
    };

    // Donut chart for expense breakdown
    const donutOptions: ApexOptions = {
        chart: {
            type: "donut",
            toolbar: { show: false },
        },
        labels: expenseBreakdown.labels,
        colors: ["#818cf8", "#34d399", "#fbbf24", "#f472b6", "#a78bfa", "#22d3ee"],

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
                            fontSize: "14px",
                            fontWeight: 600,
                        },
                        value: {
                            show: true,
                            fontSize: "20px",
                            fontWeight: 700,
                            color: "#111827",
                            formatter: (val) => `₹${Number(val).toLocaleString()}`,
                        },
                        total: {
                            show: true,
                            label: "Total Expenses",
                            fontSize: "14px",
                            color: "#6b7280",
                            formatter: function (w) {
                                const total = w.globals.seriesTotals.reduce(
                                    (a: number, b: number) => a + b,
                                    0
                                );
                                return `₹${total.toLocaleString()}`;
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
                formatter: (val) => `₹${val.toLocaleString()}`,
            },
        },
    };

    // Area chart for monthly trends
    const areaOptions: ApexOptions = {
        chart: {
            type: "area",
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
        fill: {
            type: "gradient",
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.4,
                opacityTo: 0.1,
                stops: [0, 90, 100],
            },
        },
        dataLabels: {
            enabled: false,
        },
        xaxis: {
            categories: monthlyTrends.categories,
            labels: {
                style: { colors: "#6b7280", fontSize: "12px" },
            },
        },
        yaxis: {
            title: {
                text: "Amount (₹)",
                style: { color: "#6b7280", fontSize: "14px" },
            },
            labels: {
                style: { colors: "#6b7280", fontSize: "12px" },
                formatter: (val) => `₹${(val / 1000).toFixed(0)}k`,
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
                formatter: (val) => `₹${val.toLocaleString()}`,
            },
        },
    };

    // Pie chart for expense status
    const pieOptions: ApexOptions = {
        chart: {
            type: "pie",
            toolbar: { show: false },
        },
        labels: expenseStatus.labels,
        colors: ["#6ee7b7", "#a5b4fc", "#fcd34d", "#fca5a5"],
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
        legend: {
            position: "bottom",
            fontSize: "14px",
        },
        dataLabels: {
            enabled: true,
            formatter: (val: number) => `${val.toFixed(1)}%`,
        },
    };

    // Bar chart for top categories
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
                columnWidth: "70%",
                distributed: true,
            },
        },
        dataLabels: {
            enabled: false,
        },
        xaxis: {
            categories: topCategories.categories,
            labels: {
                style: { colors: "#6b7280", fontSize: "12px" },
            },
        },
        yaxis: {
            title: {
                text: "Amount (₹ thousands)",
                style: { color: "#6b7280", fontSize: "14px" },
            },
            labels: {
                style: { colors: "#6b7280", fontSize: "12px" },
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
                formatter: (val) => `₹${val}k`,
            },
        },
    };

    return (
        <div className="space-y-6 p-4">
            {/* Page Header */}
            <div className="mb-6">
                <Typography variant="h2" className="text-gray-900 font-bold text-2xl mb-2">
                    Expense Summary
                </Typography>
                <Typography variant="bodyMedium" className="text-gray-600">
                    Overview of your expenses, claims, and reimbursements
                </Typography>
            </div>

            {/* Date Filter */}
            <DateFilter
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                label="Expense Overview"
            />

            {/* Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <Link
                    to="/webapp/expenses-app/add-expense"
                    className="group flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all duration-200 no-underline"
                >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                        <Plus className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <Typography variant="bodySmall" className="text-gray-900 font-semibold">
                            Add Expense
                        </Typography>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </Link>

                <Link
                    to="/webapp/expenses-app/expenses-list"
                    className="group flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all duration-200 no-underline"
                >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-50 text-green-600 group-hover:bg-green-100 transition-colors">
                        <Receipt className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <Typography variant="bodySmall" className="text-gray-900 font-semibold">
                            My Expenses
                        </Typography>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </Link>

                <Link
                    to="/webapp/expenses-app/my-advance-expense"
                    className="group flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all duration-200 no-underline"
                >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
                        <ArrowUpDown className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <Typography variant="bodySmall" className="text-gray-900 font-semibold">
                            My Advances
                        </Typography>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </Link>

                <Link
                    to="/webapp/expenses-app/team-requests"
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
                    icon={DollarSign}
                    iconColor="text-blue-600"
                    iconBgColor="bg-blue-50"
                    title="Total Expenses"
                    value="₹75,000"
                />
                <StatCard
                    icon={Clock}
                    iconColor="text-amber-600"
                    iconBgColor="bg-amber-50"
                    title="Pending Reimbursement"
                    value="₹9,000"
                />
                <StatCard
                    icon={CheckCircle}
                    iconColor="text-green-600"
                    iconBgColor="bg-green-50"
                    title="Approved This Month"
                    value="₹8,500"
                />
                <StatCard
                    icon={Receipt}
                    iconColor="text-purple-600"
                    iconBgColor="bg-purple-50"
                    title="Average Expense"
                    value="₹3,000"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expense Breakdown */}
                <ChartCard
                    title="Expense Breakdown"
                    subtitle="Distribution by category"
                >
                    <Chart
                        options={donutOptions}
                        series={expenseBreakdown.series}
                        type="donut"
                        height={350}
                    />
                </ChartCard>

                {/* Expense Status */}
                <ChartCard title="Expense Status" subtitle="Current status of all claims">
                    <Chart
                        options={pieOptions}
                        series={expenseStatus.series}
                        type="pie"
                        height={350}
                    />
                </ChartCard>
            </div>

            {/* Monthly Trends - Full Width */}
            <ChartCard
                title="Monthly Expense Trends"
                subtitle="Submitted vs reimbursed expenses"
            >
                <Chart
                    options={areaOptions}
                    series={monthlyTrends.series}
                    type="area"
                    height={350}
                />
            </ChartCard>

            {/* Top Categories */}
            <ChartCard
                title="Top Expense Categories"
                subtitle="Highest spending categories"
            >
                <Chart
                    options={barOptions}
                    series={topCategories.series}
                    type="bar"
                    height={350}
                />
            </ChartCard>

            {/* Expense Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-white" />
                        </div>
                        <Typography variant="bodyMedium" className="text-blue-900 font-semibold">
                            Highest Category
                        </Typography>
                    </div>
                    <Typography variant="h3" className="text-blue-900 font-bold text-xl">
                        Travel
                    </Typography>
                    <Typography variant="bodySmall" className="text-blue-700 mt-1">
                        ₹25,000 this year
                    </Typography>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-white" />
                        </div>
                        <Typography variant="bodyMedium" className="text-green-900 font-semibold">
                            Reimbursement Rate
                        </Typography>
                    </div>
                    <Typography variant="h3" className="text-green-900 font-bold text-xl">
                        88%
                    </Typography>
                    <Typography variant="bodySmall" className="text-green-700 mt-1">
                        ₹66,000 of ₹75,000
                    </Typography>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                            <TrendingDown className="w-5 h-5 text-white" />
                        </div>
                        <Typography variant="bodyMedium" className="text-purple-900 font-semibold">
                            Avg. Processing Time
                        </Typography>
                    </div>
                    <Typography variant="h3" className="text-purple-900 font-bold text-xl">
                        5 days
                    </Typography>
                    <Typography variant="bodySmall" className="text-purple-700 mt-1">
                        From submission to approval
                    </Typography>
                </div>
            </div>

            {/* Recent Expenses Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <Typography variant="h4" className="text-gray-900 font-semibold">
                            This Month's Summary
                        </Typography>
                        <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                            On Track
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <Typography variant="bodySmall" className="text-gray-600">
                                    Approved Claims
                                </Typography>
                            </div>
                            <Typography variant="bodySmall" className="text-gray-900 font-semibold">
                                5
                            </Typography>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-600" />
                                <Typography variant="bodySmall" className="text-gray-600">
                                    Pending Review
                                </Typography>
                            </div>
                            <Typography variant="bodySmall" className="text-gray-900 font-semibold">
                                3
                            </Typography>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-red-600" />
                                <Typography variant="bodySmall" className="text-gray-600">
                                    Rejected
                                </Typography>
                            </div>
                            <Typography variant="bodySmall" className="text-gray-900 font-semibold">
                                1
                            </Typography>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <Typography variant="h4" className="text-gray-900 font-semibold">
                            Quick Stats
                        </Typography>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Typography variant="bodySmall" className="text-gray-600">
                                Total Claims Filed
                            </Typography>
                            <Typography variant="bodySmall" className="text-gray-900 font-semibold">
                                25
                            </Typography>
                        </div>
                        <div className="flex items-center justify-between">
                            <Typography variant="bodySmall" className="text-gray-600">
                                Claims This Month
                            </Typography>
                            <Typography variant="bodySmall" className="text-gray-900 font-semibold">
                                9
                            </Typography>
                        </div>
                        <div className="flex items-center justify-between">
                            <Typography variant="bodySmall" className="text-gray-600">
                                Largest Claim
                            </Typography>
                            <Typography variant="bodySmall" className="text-gray-900 font-semibold">
                                ₹12,500
                            </Typography>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpenseSummary;
