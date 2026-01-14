import React, { useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { Link } from "react-router-dom";
import {
    Heart,
    Shield,
    Activity,
    FileText,
    CheckCircle,
    Clock,
    XCircle,
    Gift,
    ArrowRight,
    ListChecks,
} from "lucide-react";
import StatCard from "../shared/molecules/StatCard";
import ChartCard from "../shared/molecules/ChartCard";
import { Typography } from "../shared/atoms/Typography";
import DateFilter from "../shared/atoms/DateFilter";

const BenefitsSummary: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    // Mock data for benefits utilization
    const benefitsUtilization = {
        series: [85, 60, 45, 90],
        labels: ["Health Insurance", "Life Insurance", "Wellness Program", "Gym Membership"],
    };

    // Mock data for benefits by category
    const benefitsByCategory = {
        series: [40, 25, 20, 15],
        labels: ["Health", "Insurance", "Wellness", "Other"],
    };

    // Mock data for claim status
    const claimStatus = {
        series: [12, 3, 2],
        labels: ["Approved", "Pending", "Rejected"],
    };

    // Mock data for monthly benefits usage
    const monthlyUsage = {
        series: [
            {
                name: "Benefits Utilized",
                data: [2, 1, 3, 2, 4, 3, 2, 3, 1, 2, 3, 0],
            },
        ],
        categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    };

    // Radial bar chart for utilization
    const radialBarOptions: ApexOptions = {
        chart: {
            type: "radialBar",
            toolbar: { show: false },
        },
        plotOptions: {
            radialBar: {
                offsetY: 0,
                startAngle: 0,
                endAngle: 270,
                hollow: {
                    margin: 5,
                    size: "30%",
                    background: "transparent",
                },
                dataLabels: {
                    name: {
                        show: true,
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#6b7280",
                    },
                    value: {
                        show: true,
                        fontSize: "20px",
                        fontWeight: 700,
                        color: "#111827",
                        formatter: (val) => `${val}% `,
                    },
                },
                track: {
                    background: "#e5e7eb",
                    strokeWidth: "97%",
                    margin: 5,
                },
            },
        },
        colors: ["#6ee7b7", "#a5b4fc", "#fcd34d", "#c4b5fd"],
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
        labels: benefitsUtilization.labels,
        legend: {
            show: true,
            position: "bottom",
            fontSize: "14px",
        },
    };

    // Donut chart for benefits by category
    const categoryDonutOptions: ApexOptions = {
        chart: {
            type: "donut",
            toolbar: { show: false },
        },
        labels: benefitsByCategory.labels,
        colors: ["#6ee7b7", "#a5b4fc", "#fcd34d", "#c4b5fd"],
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
        plotOptions: {
            pie: {
                donut: {
                    size: "70%",
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: "Total Value",
                            fontSize: "14px",
                            color: "#6b7280",
                            formatter: () => "₹1,20,000",
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
                formatter: (val) => `${val}% `,
            },
        },
    };

    // Pie chart for claim status
    const claimPieOptions: ApexOptions = {
        chart: {
            type: "pie",
            toolbar: { show: false },
        },
        labels: claimStatus.labels,
        colors: ["#6ee7b7", "#fcd34d", "#fca5a5"],
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
            formatter: (val: number) => `${val.toFixed(1)}% `,
        },
    };

    // Area chart for monthly usage
    const areaOptions: ApexOptions = {
        chart: {
            type: "area",
            toolbar: { show: false },
            zoom: { enabled: false },
        },
        colors: ["#6366f1"],
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
            width: 2,
        },
        fill: {
            type: "gradient",
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.7,
                opacityTo: 0.3,
                stops: [0, 90, 100],
            },
        },
        dataLabels: {
            enabled: false,
        },
        xaxis: {
            categories: monthlyUsage.categories,
            labels: {
                style: { colors: "#6b7280", fontSize: "12px" },
            },
        },
        yaxis: {
            title: {
                text: "Claims Filed",
                style: { color: "#6b7280", fontSize: "14px" },
            },
            labels: {
                style: { colors: "#6b7280", fontSize: "12px" },
                formatter: (val) => (Number.isInteger(val) ? `${val} ` : ""),
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
                formatter: (val) => `${val} claim(s)`,
            },
        },
    };

    return (
        <div className="space-y-6 p-4">
            {/* Page Header */}
            <div className="mb-6">
                <Typography variant="h2" className="text-gray-900 font-bold text-2xl mb-2">
                    Benefits Summary
                </Typography>
                <Typography variant="bodyMedium" className="text-gray-600">
                    Overview of your benefits, claims, and utilization
                </Typography>
            </div>

            {/* Date Filter */}
            <DateFilter
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                label="Benefits Overview"
            />

            {/* Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <Link
                    to="/webapp/benefits-app/my-benefits"
                    className="group flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all duration-200 no-underline"
                >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                        <Gift className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <Typography variant="bodySmall" className="text-gray-900 font-semibold">
                            My Benefits
                        </Typography>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </Link>

                <Link
                    to="/webapp/benefits-app/my-requests"
                    className="group flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all duration-200 no-underline"
                >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-50 text-green-600 group-hover:bg-green-100 transition-colors">
                        <ListChecks className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <Typography variant="bodySmall" className="text-gray-900 font-semibold">
                            My Requests
                        </Typography>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </Link>

                <Link
                    to="/webapp/benefits-app/benefits-slips"
                    className="group flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all duration-200 no-underline"
                >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <Typography variant="bodySmall" className="text-gray-900 font-semibold">
                            Benefit Slips
                        </Typography>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </Link>

                <Link
                    to="/webapp/benefits-app/my-team-requests"
                    className="group flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all duration-200 no-underline"
                >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
                        <CheckCircle className="w-5 h-5" />
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
                    icon={Heart}
                    iconColor="text-blue-600"
                    iconBgColor="bg-blue-50"
                    title="Total Benefits Value"
                    value="₹1,20,000"
                />
                <StatCard
                    icon={Shield}
                    iconColor="text-green-600"
                    iconBgColor="bg-green-50"
                    title="Active Benefits"
                    value="8"
                />
                <StatCard
                    icon={Clock}
                    iconColor="text-amber-600"
                    iconBgColor="bg-amber-50"
                    title="Pending Claims"
                    value="3"
                />
                <StatCard
                    icon={FileText}
                    iconColor="text-purple-600"
                    iconBgColor="bg-purple-50"
                    title="Total Claims Filed"
                    value="27"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Benefits Utilization */}
                <ChartCard
                    title="Benefits Utilization"
                    subtitle="Usage percentage by benefit type"
                >
                    <Chart
                        options={radialBarOptions}
                        series={benefitsUtilization.series}
                        type="radialBar"
                        height={380}
                    />
                </ChartCard>

                {/* Benefits by Category */}
                <ChartCard
                    title="Benefits by Category"
                    subtitle="Value distribution across categories"
                >
                    <Chart
                        options={categoryDonutOptions}
                        series={benefitsByCategory.series}
                        type="donut"
                        height={380}
                    />
                </ChartCard>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Claim Status */}
                <ChartCard title="Claim Status Overview" subtitle="Current status of all claims">
                    <Chart
                        options={claimPieOptions}
                        series={claimStatus.series}
                        type="pie"
                        height={350}
                    />
                </ChartCard>

                {/* Monthly Usage */}
                <ChartCard
                    title="Monthly Benefits Usage"
                    subtitle="Claims filed per month"
                >
                    <Chart
                        options={areaOptions}
                        series={monthlyUsage.series}
                        type="area"
                        height={350}
                    />
                </ChartCard>
            </div>

            {/* Benefits List Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center">
                            <Heart className="w-6 h-6 text-white" />
                        </div>
                        <Typography variant="h4" className="text-green-900 font-semibold">
                            Health Insurance
                        </Typography>
                    </div>
                    <Typography variant="bodySmall" className="text-green-700 mb-2">
                        Coverage: ₹5,00,000
                    </Typography>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <Typography variant="bodySmall" className="text-green-700">
                            Active • Expires: Dec 2026
                        </Typography>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <Typography variant="h4" className="text-blue-900 font-semibold">
                            Life Insurance
                        </Typography>
                    </div>
                    <Typography variant="bodySmall" className="text-blue-700 mb-2">
                        Coverage: ₹10,00,000
                    </Typography>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                        <Typography variant="bodySmall" className="text-blue-700">
                            Active • Expires: Dec 2026
                        </Typography>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <Typography variant="h4" className="text-purple-900 font-semibold">
                            Wellness Program
                        </Typography>
                    </div>
                    <Typography variant="bodySmall" className="text-purple-700 mb-2">
                        Allowance: ₹20,000/year
                    </Typography>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-purple-600" />
                        <Typography variant="bodySmall" className="text-purple-700">
                            Active • Used: ₹9,000
                        </Typography>
                    </div>
                </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <Typography variant="label" className="text-amber-900 font-semibold">
                            Claim Approval Rate
                        </Typography>
                    </div>
                    <Typography variant="h3" className="text-amber-900 font-bold text-xl">
                        92%
                    </Typography>
                    <Typography variant="bodySmall" className="text-amber-700 mt-1">
                        12 of 13 claims approved
                    </Typography>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center">
                            <XCircle className="w-5 h-5 text-white" />
                        </div>
                        <Typography variant="label" className="text-red-900 font-semibold">
                            Expiring Soon
                        </Typography>
                    </div>
                    <Typography variant="h3" className="text-red-900 font-bold text-xl">
                        2 Benefits
                    </Typography>
                    <Typography variant="bodySmall" className="text-red-700 mt-1">
                        Renewal required in 30 days
                    </Typography>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-6 border border-indigo-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                        <Typography variant="label" className="text-indigo-900 font-semibold">
                            Avg. Claim Amount
                        </Typography>
                    </div>
                    <Typography variant="h3" className="text-indigo-900 font-bold text-xl">
                        ₹8,500
                    </Typography>
                    <Typography variant="bodySmall" className="text-indigo-700 mt-1">
                        Per claim this year
                    </Typography>
                </div>
            </div>
        </div>
    );
};

export default BenefitsSummary;
