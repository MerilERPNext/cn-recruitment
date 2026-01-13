import React, { ReactNode, forwardRef } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "contain" | "outline" | "subtle" | "soft";
type ButtonSize = "sm" | "md" | "lg";
export type ButtonColor =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "disabled"
  | (string & {});

type ButtonContentAlign = "start" | "center" | "end" | "between";

interface ButtonProps {
  icon?: ReactNode;
  children: ReactNode;
  bgColor?: ButtonColor;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  contentAlign?: ButtonContentAlign;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      icon,
      bgColor = "primary",
      variant = "contain",
      size = "sm",
      disabled = false,
      loading = false,
      fullWidth = false,
      className = "",
      contentAlign = "center",
      onClick,
    },
    ref
  ) => {
    /* ===============================
       Size styles
    =============================== */

    const sizeClasses: Record<ButtonSize, string> = {
      sm: "text-label px-3 py-1.5",
      md: "text-body-sm px-4 py-2 font-normal",
      lg: "text-body-medium px-6 py-3",
    };

    /* ===============================
       Content alignment styles
    =============================== */

    const contentAlignClasses: Record<ButtonContentAlign, string> = {
      start: "justify-start text-left",
      center: "justify-center text-center",
      end: "justify-end text-right",
      between: "justify-between",
    };

    /* ===============================
       Theme-safe color styles
    =============================== */

    const COLOR_STYLES: Record<string, Record<ButtonVariant, string>> = {
      primary: {
        contain:
          "bg-primary text-white hover:bg-primary-600 active:bg-primary-700",
        outline: "border border-primary text-primary hover:bg-primary-50",
        subtle: "text-primary hover:bg-primary/10",
        soft: "bg-primary-50 text-primary-600 hover:bg-primary-100",
      },
      secondary: {
        contain:
          "bg-secondary text-white hover:bg-secondary-600 active:bg-secondary-700",
        outline: "border border-secondary text-secondary hover:bg-secondary-50",
        subtle: "text-secondary hover:bg-secondary-50",
        soft: "bg-secondary-50 text-secondary-600 hover:bg-secondary-100",
      },
      success: {
        contain:
          "bg-success-100 text-success hover:bg-success/20 active:bg-success-800",
        outline: "border border-success text-success hover:bg-success-50",
        subtle: "text-success hover:bg-success-50",
        soft: "bg-success-50 text-success hover:bg-success-100",
      },
      warning: {
        contain:
          "bg-warning text-white hover:bg-warning-600 active:bg-warning-800",
        outline: "border border-warning text-warning hover:bg-warning-50",
        subtle: "text-warning hover:bg-warning-50",
        soft: "bg-warning-50 text-warning hover:bg-warning-100",
      },
      error: {
        contain: "bg-error text-white hover:bg-error-600 active:bg-error-800",
        outline: "border border-error text-error hover:bg-error-50",
        subtle: "text-error hover:bg-error-50",
        soft: "bg-error-50 text-error hover:bg-error-100",
      },
      info: {
        contain: "bg-info text-white hover:bg-info-600 active:bg-info-800",
        outline: "border border-info text-info hover:bg-info-50",
        subtle: "text-info hover:bg-info-50",
        soft: "bg-info-50 text-info hover:bg-info-100",
      },
      disabled: {
        contain:
          "bg-gray-200 text-gray-600 hover:bg-gray-200 active:bg-gray-200",
        outline:
          "border border-gray-200 text-gray-600 hover:bg-gray-200",
        subtle: "text-gray-600 hover:bg-gray-200",
        soft: "bg-gray-50 text-gray-600 hover:bg-gray-100",
      },
    };

    /* ===============================
       Runtime-safe resolution
    =============================== */

    const resolvedVariant: ButtonVariant =
      variant && ["contain", "outline", "subtle", "soft"].includes(variant)
        ? variant
        : "contain";

    // Determine color classes: use predefined styles or fallback to raw className
    const colorClasses =
      bgColor in COLOR_STYLES
        ? COLOR_STYLES[bgColor][resolvedVariant]
        : `bg-${bgColor}`;

    const widthClass = fullWidth ? "w-full" : "w-fit";

    const isDisabled = disabled || loading;

    const loaderSizeClasses: Record<ButtonSize, string> = {
      sm: "h-3 w-3",
      md: "h-4 w-4",
      lg: "h-5 w-5",
    };

    return (
      <button
        ref={ref}
        onClick={onClick}
        disabled={isDisabled}
        className={`
          ${widthClass}
          inline-flex items-center gap-2
          ${contentAlignClasses[contentAlign]}
          rounded-lg
          font-brand
          transition-colors duration-150
          disabled:opacity-50 disabled:cursor-not-allowed
          ${sizeClasses[size]}
          ${colorClasses}
          ${className}
        `}
      >
        {loading ? (
          <Loader2 className={`${loaderSizeClasses[size]} animate-spin`} />
        ) : (
          icon && <span className="flex items-center">{icon}</span>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
