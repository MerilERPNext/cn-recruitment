import React from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Typography } from "../atoms/Typography";
import { Card } from "../atoms/Card";

interface StatCardProps {
    icon: LucideIcon;
    iconColor?: string;
    iconBgColor?: string;
    title: string;
    value: string | number;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    loading?: boolean;
    className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
    icon: Icon,
    iconColor = "text-primary-600",
    iconBgColor = "bg-primary-50",
    title,
    value,
    trend,
    loading = false,
    className = "",
}) => {
    if (loading) {
        return (
            <Card className={`animate-pulse ${className}`}>
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                        <div className="h-8 bg-gray-200 rounded w-32"></div>
                    </div>
                    <div className={`w-12 h-12 rounded-lg ${iconBgColor}`}></div>
                </div>
            </Card>
        );
    }

    return (
        <Card className={`group hover:shadow-lg transition-all duration-300 ${className}`}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <Typography
                        variant="label"
                        className="text-gray-600 text-sm font-medium mb-1"
                    >
                        {title}
                    </Typography>
                    <Typography
                        variant="h3"
                        className="text-gray-900 font-bold text-2xl mb-1"
                    >
                        {value}
                    </Typography>
                    {trend && (
                        <div
                            className={`flex items-center gap-1 text-sm font-medium ${trend.isPositive ? "text-success" : "text-error"
                                }`}
                        >
                            {trend.isPositive ? (
                                <TrendingUp className="w-4 h-4" />
                            ) : (
                                <TrendingDown className="w-4 h-4" />
                            )}
                            <span>{Math.abs(trend.value)}%</span>
                        </div>
                    )}
                </div>
                <div
                    className={`flex items-center justify-center w-12 h-12 rounded-lg ${iconBgColor} ${iconColor} group-hover:scale-110 transition-transform duration-300`}
                >
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </Card>
    );
};

export default StatCard;
