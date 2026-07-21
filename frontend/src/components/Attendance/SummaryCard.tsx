import React from "react";
import { LucideIcon } from "lucide-react";
import { Typography } from "../shared/atoms/Typography";

interface SummaryCardProps {
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  value: string | number;
  label: string;
  isDesktop?: boolean;
  isMetric?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  icon: Icon,
  iconColor,
  bgColor,
  value,
  label,
}) => {
  // Extract color base to generate standardized styles if raw tailwind classes aren't consistent
  // But trusting input props for now, just refining the layout.

  return (
    <div
      className={`
        relative overflow-hidden group
        flex flex-col items-start justify-start
        gap-2 p-4 rounded-xl
        bg-white shadow-sm
        hover-lift
        transition-all duration-300 ease-in-out
      `}
    >
      <div className="flex items-center justify-center gap-2">

        <div
          className={`
          flex items-center justify-center 
          w-10 h-10 rounded-xl 
          ${bgColor} ${iconColor} 
          group-hover:scale-110 transition-transform duration-300
        `}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="text-center z-10">
          <Typography
            variant="label"
            className="text-xs font-medium text-gray-500 uppercase tracking-wide"
          >
            {label}
          </Typography>
        </div>
      </div>

      <Typography
        variant="bodyMedium"
        className="font-semibold text-gray-900 leading-none mb-1 px-2"
      >
        {value}
      </Typography>
      {/* Decorative gradient blur in background for "premium" feel */}
      <div className={`
        absolute -top-6 -right-6 w-12 h-12 
        ${bgColor} opacity-20 blur-xl rounded-full 
        group-hover:opacity-30 transition-opacity
      `} />
    </div>
  );
};

export default SummaryCard;
