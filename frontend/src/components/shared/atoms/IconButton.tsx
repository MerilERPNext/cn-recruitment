import React, { forwardRef } from "react";

/* ======================================================
   Types
====================================================== */

type IconButtonVariant = "contain" | "outline" | "subtle";
type IconButtonColor =
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "error"
    | "info";

export type IconButtonProps = {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    color?: IconButtonColor;
    variant?: IconButtonVariant;
    className?: string;
};

/* ======================================================
   Theme styles
====================================================== */

const COLOR_STYLES: Record<
    IconButtonColor,
    Record<IconButtonVariant, string>
> = {
    primary: {
        contain: "bg-primary border-primary text-white hover:bg-primary-600",
        outline:
            "bg-primary-50 border-primary text-primary hover:bg-primary-100",
        subtle:
            "bg-primary-50 border-gray-100/50 text-primary hover:bg-primary-100",
    },
    secondary: {
        contain:
            "bg-secondary border-secondary text-white hover:bg-secondary-600",
        outline:
            "bg-secondary-50 border-secondary text-secondary hover:bg-secondary-100",
        subtle:
            "bg-secondary-50 border-gray-100/50 text-secondary hover:bg-secondary-100",
    },
    success: {
        contain:
            "bg-success border-success text-white hover:bg-success-600",
        outline:
            "bg-success-50 border-success text-success hover:bg-success-100",
        subtle:
            "bg-success-50 border-gray-100/50 text-success hover:bg-success-100",
    },
    warning: {
        contain:
            "bg-warning border-warning text-white hover:bg-warning-600",
        outline:
            "bg-warning-50 border-warning text-warning hover:bg-warning-100",
        subtle:
            "bg-warning-50 border-gray-100/50 text-warning hover:bg-warning-100",
    },
    error: {
        contain: "bg-error border-error text-white hover:bg-error-600",
        outline:
            "bg-error-50 border-error text-error hover:bg-error-100",
        subtle:
            "bg-error-50 border-gray-100/50 text-error hover:bg-error-100",
    },
    info: {
        contain: "bg-info border-info text-white hover:bg-info-600",
        outline:
            "bg-info-50 border-info text-info hover:bg-info-100",
        subtle:
            "bg-info-50 border-gray-100/50 text-info hover:bg-info-100",
    },
};

/* ======================================================
   Component
====================================================== */

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
    (
        {
            icon,
            label,
            onClick,
            disabled = false,
            color = "primary",
            variant = "subtle",
            className = "",
        },
        ref
    ) => {
        const resolvedColor: IconButtonColor =
            COLOR_STYLES[color] ? color : "primary";

        const resolvedVariant: IconButtonVariant =
            ["contain", "outline", "subtle"].includes(variant)
                ? variant
                : "subtle";

        return (
            <button
                ref={ref}
                type="button"
                onClick={onClick}
                disabled={disabled}
                className={[
                    // relative is required for badges
                    "relative group flex flex-col items-center focus:outline-none",
                    disabled && "opacity-50 cursor-not-allowed",
                    className,
                ]
                    .filter(Boolean)
                    .join(" ")}
            >
                <div
                    className={[
                        "w-12 h-12 rounded-xl border flex items-center justify-center mb-2 transition-all duration-200 shadow-sm group-hover:shadow-md",
                        COLOR_STYLES[resolvedColor][resolvedVariant],
                    ]
                        .filter(Boolean)
                        .join(" ")}
                >
                    <span className="w-6 h-6 flex items-center justify-center">
                        {icon}
                    </span>
                </div>

                <span className="text-xs font-medium text-center text-text-body2">
                    {label}
                </span>
            </button>
        );
    }
);

IconButton.displayName = "IconButton";

export default IconButton;
