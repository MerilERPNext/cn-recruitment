import React from "react";
import {
    FileText,
    Users,
    Clock,
    Timer,
    Calendar
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import Button from "../shared/atoms/Button";

const iconMap: Record<string, React.ElementType> = {
    FileText,
    Users,
    Clock,
    Timer,
    Calendar
};

export type ActionType = "link" | "primary" | "secondary";

export interface Action {
    label: string;
    type: ActionType;
    href?: string;
    onClick?: () => void;
}

export interface QuickActionCardData {
    id: string;
    title: string;
    subtitle?: string;
    value?: string | number | null;
    icon: string;
    color: string;
    background?: string;
    actions: Action[];
}


interface QuickActionCardProps {
    title: string;
    subtitle?: string;
    value?: string | number | null;
    icon: string;
    background?: string;
    actions: Action[];
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({
    title,
    subtitle,
    value,
    icon,
    background = "bg-slate-50",
    actions
}) => {
    const Icon = iconMap[icon];
    const navigate = useNavigate();

    return (
        <Card
            padding="sm"
            radius="xl"
            shadow="sm"
            className={`
                relative overflow-hidden border border-slate-100/50
                p-4.5 transition-all duration-300
                hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50
                ${background} group/qcard
            `}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <Typography variant="bodySmall" className="font-bold tracking-tight">
                        {title}
                    </Typography>

                    {subtitle && (
                        <div className="mt-1 flex items-baseline gap-2">
                            {value != null && (
                                <Typography variant="h4" color="body2" className="font-bold">
                                    {value}
                                </Typography>
                            )}
                            <Typography variant="bodySmall" color="body2" className="font-medium lowercase first-letter:uppercase">
                                {subtitle}
                            </Typography>
                        </div>
                    )}
                </div>

                {/* Icon */}
                {Icon && (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-50 group-hover/qcard:rotate-6 transition-transform">
                        <Icon className="h-5 w-5 text-slate-700" />
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100/50">
                {actions.map((action, idx) => {
                    if (action.type === "link") {
                        return (
                            <Button
                                key={idx}
                                onClick={() => navigate(action.href || "#")}
                                size="sm"
                                variant="subtle"
                                className="font-bold text-[9px] uppercase tracking-widest px-3 py-1 h-auto"
                            >
                                {action.label}
                            </Button>
                        );
                    }

                    return (
                        <Button
                            key={idx}
                            onClick={action.onClick}
                            size="sm"
                            variant={action.type === "primary" ? "soft" : "subtle"}
                            className="font-bold text-[9px] uppercase tracking-widest px-3 py-1 h-auto"
                        >
                            {action.label}
                        </Button>
                    );
                })}
            </div>
        </Card>
    );
};

export default QuickActionCard;
