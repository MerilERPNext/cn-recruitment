import React, { useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { Link } from "react-router-dom";
import {
    DollarSign,
    TrendingUp,
    PiggyBank,
    Receipt,
    Wallet,
    CreditCard,
    FileText,
    Calculator,
    ArrowRight,
} from "lucide-react";
import StatCard from "../shared/molecules/StatCard";
import ChartCard from "../shared/molecules/ChartCard";
import { Typography } from "../shared/atoms/Typography";
import DateFilter from "../shared/atoms/DateFilter";

const CompensationSummary: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    // Mock data for salary breakdown
    const salaryBreakdown = {
        series: [45000, 15000, 10000, 8000, 7000, 15000],
        labels: ["Basic Salary", "HRA", "Special Allowance", "Transport", "Medical", "Other Allowances"],
    };

    // Mock data for deductions
    const deductions = {
        series: [5000, 3000, 2000],
        labels: ["Income Tax", "PF", "Professional Tax"],
    };

    // Mock data for monthly compensation trend
    const compensationTrend = {
        series: [
            {
                name: "Gross Salary",
                data: [100000, 100000, 105000, 100000, 100000, 110000, 100000, 100000, 100000, 100000, 105000, 0],
            },
            {
                name: "Net Salary",
                data: [90000, 90000, 94500, 90000, 90000, 99000, 90000, 90000, 90000, 90000, 94500, 0],
            },
        ],
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    };

    // Mock data for component comparison
    const componentComparison = {
        series: [
            {
                name: "Earnings",
                data: [45, 15, 10, 8, 7, 15],
            },
            {
                name: "Deductions",
                data: [5, 3, 2, 0, 0, 0],
            },
        ],
        categories: ["Basic", "HRA", "Special", "Transport", "Medical", "Other"],
    };

    // Donut chart options for salary breakdown
    const salaryDonutOptions: ApexOptions = {
        chart: {
            type: "donut",
            toolbar: { show: false },
        },
        labels: salaryBreakdown.labels,
        colors: ["#a5b4fc", "#6ee7b7", "#fcd34d", "#c4b5fd", "#f9a8d4", "#67e8f9"],
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
                            label: "Total CTC",
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

    // Pie chart for deductions
    const deductionsOptions: ApexOptions = {
        chart: {
            type: "pie",
            toolbar: { show: false },
        },
        labels: deductions.labels,
        colors: ["#22d3ee", "#fbbf24", "#f472b6"],
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
        tooltip: {
            y: {
                formatter: (val) => `₹${val.toLocaleString()}`,
            },
        },
    };

    // Line chart for compensation trend
    const trendLineOptions: ApexOptions = {
        chart: {
            type: "line",
            toolbar: { show: false },
            zoom: { enabled: false },
        },
        colors: ["#818cf8", "#34d399"],
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
            categories: compensationTrend.categories,
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

    // Stacked bar chart for component comparison
    const stackedBarOptions: ApexOptions = {
        chart: {
            type: "bar",
            stacked: true,
            toolbar: { show: false },
        },
        colors: ["#34d399", "#22d3ee"],
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
                horizontal: false,
                borderRadius: 8,
                columnWidth: "60%",
            },
        },
        dataLabels: {
            enabled: false,
        },
        xaxis: {
            categories: componentComparison.categories,
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
            position: "top",
            horizontalAlign: "right",
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
                    Compensation Summary
                </Typography>
                <Typography variant="bodyMedium" className="text-gray-600">
                    Overview of your salary, benefits, and compensation trends
                </Typography>
            </div>

            {/* Date Filter */}
            <DateFilter
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                label="Compensation Overview"
            />

            {/* Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <Link
                    to="/webapp/salary-slip-app/ctc-salary-breakdown"
                    className="group flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all duration-200 no-underline"
                >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                        <Calculator className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <Typography variant="bodySmall" className="text-gray-900 font-semibold">
                            CTC Breakdown
                        </Typography>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </Link>

                <Link
                    to="/webapp/salary-slip-app/salary-slip-list"
                    className="group flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all duration-200 no-underline"
                >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-50 text-green-600 group-hover:bg-green-100 transition-colors">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <Typography variant="bodySmall" className="text-gray-900 font-semibold">
                            Salary Slips
                        </Typography>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </Link>

                <Link
                    to="/webapp/salary-slip-app/income-tax-sheet"
                    className="group flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all duration-200 no-underline"
                >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
                        <Receipt className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <Typography variant="bodySmall" className="text-gray-900 font-semibold">
                            Tax Sheet
                        </Typography>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </Link>

                <Link
                    to="/webapp/salary-slip-app/my-loan-requests"
                    className="group flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all duration-200 no-underline"
                >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
                        <Wallet className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <Typography variant="bodySmall" className="text-gray-900 font-semibold">
                            Loan Requests
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
                    title="Annual CTC"
                    value="₹12,00,000"
                />
                <StatCard
                    icon={Wallet}
                    iconColor="text-green-600"
                    iconBgColor="bg-green-50"
                    title="Monthly Gross"
                    value="₹1,00,000"
                />
                <StatCard
                    icon={CreditCard}
                    iconColor="text-purple-600"
                    iconBgColor="bg-purple-50"
                    title="Net Take-home"
                    value="₹90,000"
                />
                <StatCard
                    icon={Receipt}
                    iconColor="text-amber-600"
                    iconBgColor="bg-amber-50"
                    title="Total Deductions"
                    value="₹10,000"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Salary Breakdown */}
                <ChartCard
                    title="Salary Components Breakdown"
                    subtitle="Monthly CTC distribution"
                >
                    <Chart
                        options={salaryDonutOptions}
                        series={salaryBreakdown.series}
                        type="donut"
                        height={350}
                    />
                </ChartCard>

                {/* Deductions */}
                <ChartCard
                    title="Deductions Breakdown"
                    subtitle="Monthly deductions distribution"
                >
                    <Chart
                        options={deductionsOptions}
                        series={deductions.series}
                        type="pie"
                        height={350}
                    />
                </ChartCard>
            </div>

            {/* Compensation Trend - Full Width */}
            <ChartCard
                title="Compensation Trend"
                subtitle="Monthly gross vs net salary comparison"
            >
                <Chart
                    options={trendLineOptions}
                    series={compensationTrend.series}
                    type="line"
                    height={350}
                />
            </ChartCard>

            {/* Component Comparison */}
            <ChartCard
                title="Earnings vs Deductions"
                subtitle="Stacked comparison by component"
            >
                <Chart
                    options={stackedBarOptions}
                    series={componentComparison.series}
                    type="bar"
                    height={350}
                />
            </ChartCard>

            {/* Additional Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                            <PiggyBank className="w-5 h-5 text-white" />
                        </div>
                        <Typography variant="label" className="text-blue-900 font-semibold">
                            Tax Percentage
                        </Typography>
                    </div>
                    <Typography variant="h3" className="text-blue-900 font-bold text-xl">
                        10%
                    </Typography>
                    <Typography variant="bodySmall" className="text-blue-700 mt-1">
                        Of gross salary
                    </Typography>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <Typography variant="label" className="text-green-900 font-semibold">
                            YTD Earnings
                        </Typography>
                    </div>
                    <Typography variant="h3" className="text-green-900 font-bold text-xl">
                        ₹11,00,000
                    </Typography>
                    <Typography variant="bodySmall" className="text-green-700 mt-1">
                        Jan - Nov 2026
                    </Typography>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-white" />
                        </div>
                        <Typography variant="label" className="text-purple-900 font-semibold">
                            Next Appraisal
                        </Typography>
                    </div>
                    <Typography variant="h3" className="text-purple-900 font-bold text-xl">
                        Apr 2027
                    </Typography>
                    <Typography variant="bodySmall" className="text-purple-700 mt-1">
                        In 5 months
                    </Typography>
                </div>
            </div>
        </div>
    );
};

export default CompensationSummary;
