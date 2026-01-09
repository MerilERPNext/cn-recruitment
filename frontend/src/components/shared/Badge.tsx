import { Typography } from "./atoms/Typography";

interface BadgeProps {
  label: string;
  backgroundColor?: string;
  textColor?: string;
  pulse?: {
    show: boolean,
    color: string
  }
  size?: "sm" | "md" | "lg"; // Added size variant
}

const Badge = ({
  label,
  backgroundColor = "bg-gray-200",
  textColor = "text-black",
  pulse,
  size = "md", // Default size is 'md'
}: BadgeProps) => {
  // Define size classes based on the `size` prop
  const sizeClasses = {
    sm: "py-0.5 px-2 text-xs", // Small size: smaller padding and font
    md: "py-1 px-3 text-sm", // Medium size (default)
    lg: "py-2 px-4 text-base", // Large size: larger padding and font
  };

  return (
    <div className={`w-fit rounded-xl ${backgroundColor} ${textColor} ${sizeClasses[size]} flex justify-center items-center gap-2`}>
      {pulse?.show && <span
        className={`w-2 h-2 rounded-full animate-pulse ${pulse?.color}`}
      />}
      <Typography variant="label" className={textColor}>
        {label}
      </Typography>
    </div>
  );
};

export default Badge;
