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

type Radius = "sm" | "md" | "lg" | "full";
type Size = "xs" | "sm" | "md" | "lg";

export type IconButtonProps = {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  color?: IconButtonColor;
  variant?: IconButtonVariant;
  className?: string;
  radius?: Radius;
  size?: Size;
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
    outline: "bg-primary-50 border-primary text-primary hover:bg-primary-100",
    subtle:
      "bg-primary-50 border-gray-100/50 text-primary hover:bg-primary-100",
  },
  secondary: {
    contain: "bg-secondary border-secondary text-white hover:bg-secondary-600",
    outline:
      "bg-secondary-50 border-secondary text-secondary hover:bg-secondary-100",
    subtle:
      "bg-secondary-50 border-gray-100/50 text-secondary hover:bg-secondary-100",
  },
  success: {
    contain: "bg-success border-success text-white hover:bg-success-600",
    outline: "bg-success-50 border-success text-success hover:bg-success-100",
    subtle:
      "bg-success-50 border-gray-100/50 text-success hover:bg-success-100",
  },
  warning: {
    contain: "bg-warning border-warning text-white hover:bg-warning-600",
    outline: "bg-warning-50 border-warning text-warning hover:bg-warning-100",
    subtle:
      "bg-warning-50 border-gray-100/50 text-warning hover:bg-warning-100",
  },
  error: {
    contain: "bg-error border-error text-white hover:bg-error-600",
    outline: "bg-error-50 border-error text-error hover:bg-error-100",
    subtle: "bg-error-50 border-gray-100/50 text-error hover:bg-error-100",
  },
  info: {
    contain: "bg-info border-info text-white hover:bg-info-600",
    outline: "bg-info-50 border-info text-info hover:bg-info-100",
    subtle: "bg-info-50 border-gray-100/50 text-info hover:bg-info-100",
  },
};

const SIZE_STYLES: Record<
  Size,
  { wrapper: string; icon: string; text: string }
> = {
  xs: {
    wrapper: "w-8 h-8",
    icon: "size-5",
    text: "",
  },
  sm: {
    wrapper: "w-12 h-12",
    icon: "w-5 h-5",
    text: "text-[11px]",
  },
  md: {
    wrapper: "w-16 h-16",
    icon: "w-8 h-8",
    text: "text-xs",
  },
  lg: {
    wrapper: "w-20 h-20",
    icon: "w-10 h-10",
    text: "text-sm",
  },
};

const RADIUS_STYLES: Record<Radius, string> = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
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
      radius = "lg",
      size = "md",
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={[
          "relative group flex flex-col items-center focus:outline-none",
          disabled && "opacity-50 cursor-not-allowed",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div
          className={[
            SIZE_STYLES[size].wrapper,
            RADIUS_STYLES[radius],
            "border-2 flex items-center justify-center mb-2 transition-colors duration-150",
            COLOR_STYLES[color][variant],
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span
            className={[
              SIZE_STYLES[size].icon,
              "flex items-center justify-center rounded-sm",
            ].join(" ")}
          >
            {icon}
          </span>
        </div>

        <span
          className={[
            SIZE_STYLES[size].text,
            "font-medium text-center text-text-body2",
          ].join(" ")}
        >
          {label}
        </span>
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
export default IconButton;
