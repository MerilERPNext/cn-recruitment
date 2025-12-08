import React, { ReactNode } from "react";

type ButtonVariant = "contain" | "outline" | "subtle";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  icon?: ReactNode;
  children: ReactNode;
  bgColor?: string; // e.g., 'blue-500'
  textColor?: string; // only used for 'contain' & 'subtle'
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const Button: React.FC<ButtonProps> = ({
  children,
  icon,
  bgColor = "blue-600",
  textColor = "white",
  variant = "contain",
  size = "sm",
  disabled = false,
  fullWidth = false,
  className = "",
  onClick,
}) => {
  const sizeClasses = {
    sm: "text-xs py-1 px-2",
    md: "text-sm py-2 px-4",
    lg: "text-lg py-3 px-6",
  };

  const getSubtleClasses = (bg: string) => {
    const [color] = bg.split("-"); // e.g., 'blue-500' → 'blue'
    return `bg-transparent text-${bg} hover:bg-${color}-200`;
  };

  const variantClasses = {
    contain: `bg-${bgColor} text-${textColor} border-none`,
    outline: `bg-transparent text-${bgColor} border-2 border-${bgColor}`,
    subtle: getSubtleClasses(bgColor),
  };

  const widthClass = fullWidth ? "w-full" : "w-fit";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${widthClass}
        rounded-lg
        flex gap-1 items-center
        justify-center
        disabled:opacity-50
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${disabled ? "cursor-not-allowed" : ""}
        transition-colors duration-150
        ${className}
      `}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
