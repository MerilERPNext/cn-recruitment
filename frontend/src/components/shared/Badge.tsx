interface BadgeProps {
  label: string;
  backgroundColor?: string;
  textColor?: string;
  size?: "sm" | "md" | "lg"; // Added size variant
}

const Badge = ({
  label,
  backgroundColor = "bg-gray-200",
  textColor = "text-black",
  size = "md", // Default size is 'md'
}: BadgeProps) => {
  // Define size classes based on the `size` prop
  const sizeClasses = {
    sm: "py-0.5 px-2 text-xs", // Small size: smaller padding and font
    md: "py-1 px-3 text-sm", // Medium size (default)
    lg: "py-2 px-4 text-base", // Large size: larger padding and font
  };

  return (
    <span
      className={`w-fit flex items-center justify-center rounded-xl font-medium ${backgroundColor} ${textColor} ${sizeClasses[size]}`}
    >
      {label}
    </span>
  );
};

export default Badge;
