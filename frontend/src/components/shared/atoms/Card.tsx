import React from "react";

/* ======================================================
   Types
====================================================== */

type CardShadow = "none" | "sm" | "md" | "lg";
type CardRadius = "none" | "sm" | "md" | "lg" | "xl";
type CardPadding = "none" | "sm" | "md" | "lg";
type CardColor = "default" | "surface" | "primary" | "secondary" | "success" | "warning" | "error" | "info";

type CardProps = {
    children: React.ReactNode;
    shadow?: CardShadow;
    radius?: CardRadius;
    padding?: CardPadding;
    color?: CardColor;
    className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

/* ======================================================
   Variant Maps
====================================================== */

const SHADOW_CLASSES: Record<CardShadow, string> = {
    none: "shadow-none",
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-lg",
};

const RADIUS_CLASSES: Record<CardRadius, string> = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
};

const PADDING_CLASSES: Record<CardPadding, string> = {
    none: "p-0",
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
};

/* ======================================================
   Theme-aware colors
====================================================== */

const COLOR_CLASSES: Record<CardColor, string> = {
    default: "bg-white text-text-base",
    surface: "bg-surface text-text-base", // light grayish background if your theme has a surface token
    primary: "bg-primary-light text-primary-dark",
    secondary: "bg-secondary-light text-secondary-dark",
    success: "bg-success-light text-success-dark",
    warning: "bg-warning-light text-warning-dark",
    error: "bg-error-light text-error-dark",
    info: "bg-info-light text-info-dark",
};

/* ======================================================
   Component
====================================================== */

export function Card({
    children,
    shadow = "sm",
    radius = "lg",
    padding = "md",
    color = "default",
    className = "",
    ...rest
}: CardProps) {
    const classes = [
        COLOR_CLASSES[color],
        SHADOW_CLASSES[shadow],
        RADIUS_CLASSES[radius],
        PADDING_CLASSES[padding],
        "transition-colors duration-150", // smooth color changes if theme changes
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={classes} {...rest}>
            {children}
        </div>
    );
}
