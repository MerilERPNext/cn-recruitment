import React from "react";
import { Card } from "../atoms/Card";
import { Typography } from "../atoms/Typography";
import { AlertCircle } from "lucide-react";

interface ChartCardProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    loading?: boolean;
    error?: string;
    className?: string;
    actions?: React.ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({
    title,
    subtitle,
    children,
    loading = false,
    error,
    className = "",
    actions,
}) => {
    return (
        <Card className={`${className}`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div>
                    <Typography variant="h3" className="text-gray-900 font-semibold text-lg">
                        {title}
                    </Typography>
                    {subtitle && (
                        <Typography variant="bodySmall" className="text-gray-500 mt-1">
                            {subtitle}
                        </Typography>
                    )}
                </div>
                {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertCircle className="w-12 h-12 text-error mb-3" />
                    <Typography variant="bodyMedium" className="text-gray-600">
                        {error}
                    </Typography>
                </div>
            ) : (
                <div className="w-full">{children}</div>
            )}
        </Card>
    );
};

export default ChartCard;
