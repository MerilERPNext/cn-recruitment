import React from "react";
import {
    FileText,
    Users,
    Clock,
    Timer,
    Calendar
} from "lucide-react";
import { useNavigate } from "react-router-dom";

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
        <div
            className={`
        relative overflow-hidden rounded-2xl border border-slate-200
        p-5 transition-all duration-200
        hover:-translate-y-0.5 hover:shadow-lg
        ${background}
      `}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                        {title}
                    </h3>

                    {subtitle && (
                        <p className="mt-1 text-sm text-slate-600">
                            {value != null ? (
                                <>
                                    <span className="font-semibold text-xl text-blue-500">
                                        {value}
                                    </span>{" "}
                                    {subtitle}
                                </>
                            ) : (
                                subtitle
                            )}
                        </p>
                    )}
                </div>

                {/* Icon */}
                {Icon && (
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm">
                        <Icon className="h-5 w-5 text-slate-700" />
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center justify-between gap-3">
                {actions.map((action, idx) => {
                    if (action.type === "link") {
                        return (
                            <button
                                key={idx}
                                onClick={() => navigate(action.href || "#")}
                                className="text-sm font-medium text-blue-600 hover:underline"
                            >
                                {action.label}
                            </button>
                        );
                    }

                    return (
                        <button
                            key={idx}
                            onClick={action.onClick}
                            className={`
                inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium
                transition-colors
                ${action.type === "primary"
                                    ? "bg-blue-600 text-white hover:bg-blue-700 hover:text-white"
                                    : "bg-white text-slate-700 border border-slate-200"
                                }
              `}
                        >
                            {action.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default QuickActionCard;
