import React, { ReactNode, forwardRef } from "react";

type ButtonVariant = "contain" | "outline" | "subtle";
type ButtonSize = "sm" | "md" | "lg";
type ButtonColor =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info";

type ButtonContentAlign = "start" | "center" | "end" | "between";

interface ButtonProps {
  icon?: ReactNode;
  children: ReactNode;
  bgColor?: ButtonColor;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
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
      md: "text-body-sm-medium px-4 py-2",
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

    const COLOR_STYLES: Record<ButtonColor, Record<ButtonVariant, string>> = {
      primary: {
        contain:
          "bg-primary text-white hover:bg-primary-600 active:bg-primary-700",
        outline:
          "border border-primary text-primary hover:bg-primary-50",
        subtle: "text-primary hover:bg-primary/10",
      },
      secondary: {
        contain:
          "bg-secondary text-white hover:bg-secondary-600 active:bg-secondary-700",
        outline:
          "border border-secondary text-secondary hover:bg-secondary-50",
        subtle: "text-secondary hover:bg-secondary-50",
      },
      success: {
        contain:
          "bg-success-50 text-success hover:bg-success/20 active:bg-success-800",
        outline:
          "border border-success text-success hover:bg-success-50",
        subtle: "text-success hover:bg-success-50",
      },
      warning: {
        contain:
          "bg-warning text-white hover:bg-warning-600 active:bg-warning-800",
        outline:
          "border border-warning text-warning hover:bg-warning-50",
        subtle: "text-warning hover:bg-warning-50",
      },
      error: {
        contain:
          "bg-error text-white hover:bg-error-600 active:bg-error-800",
        outline:
          "border border-error text-error hover:bg-error-50",
        subtle: "text-error hover:bg-error-50",
      },
      info: {
        contain:
          "bg-info text-white hover:bg-info-600 active:bg-info-800",
        outline:
          "border border-info text-info hover:bg-info-50",
        subtle: "text-info hover:bg-info-50",
      },
    };

    /* ===============================
       Runtime-safe resolution
    =============================== */

    const resolvedColor: ButtonColor =
      bgColor && COLOR_STYLES[bgColor] ? bgColor : "primary";

    const resolvedVariant: ButtonVariant =
      variant && ["contain", "outline", "subtle"].includes(variant)
        ? variant
        : "contain";

    const widthClass = fullWidth ? "w-full" : "w-fit";

    return (
      <button
        ref={ref}
        onClick={onClick}
        disabled={disabled}
        className={`
          ${widthClass}
          inline-flex items-center gap-2
          ${contentAlignClasses[contentAlign]}
          rounded-lg
          font-brand
          transition-colors duration-150
          disabled:opacity-50 disabled:cursor-not-allowed
          ${sizeClasses[size]}
          ${COLOR_STYLES[resolvedColor][resolvedVariant]}
          ${className}
        `}
      >
        {icon && <span className="flex items-center">{icon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
