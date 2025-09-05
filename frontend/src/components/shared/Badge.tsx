// Badge.jsx

interface BadgeProps {
  label: string;
  backgroundColor?: string;
  textColor?: string;
}

const Badge = ({
  label,
  backgroundColor = "bg-gray-200",
  textColor = "text-black",
}: BadgeProps) => {
  return (
    <span
      className={`w-fit flex items-center justify-center py-1 px-3 rounded-xl text-sm font-medium ${backgroundColor} ${textColor}`}
    >
      {label}
    </span>
  );
};

export default Badge;
