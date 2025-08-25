import React from "react";
import { LucideIcon } from "lucide-react";

interface SummaryCardProps {
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  value: string | number;
  label: string;
  isDesktop: boolean;
  isMetric: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  icon: Icon,
  iconColor,
  bgColor,
  borderColor,
  value,
  label,
  isDesktop,
}) => {
  if (isDesktop) {
    return (
      <div
        className={`flex items-center gap-3 p-3 rounded-lg hover:shadow-sm transition-shadow ${bgColor} ${borderColor}`}
      >
        <div className="flex-shrink-0">
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-lg font-bold leading-none ${iconColor.replace('-600', '-800')}`}>{value}</p>
          <p className={`text-xs font-medium mt-1 ${iconColor.replace('-600', '-700')}`}>{label}</p>
        </div>
      </div>
    );
  }

  // Mobile layout
  return (
    <div
      className={`text-center p-3 rounded-lg ${bgColor} border-2 ${borderColor}`}
    >
      <Icon className={`w-6 h-6 mx-auto mb-1 ${iconColor}`} />
      <p className={`text-lg font-bold ${iconColor.replace('-600', '-800')}`}>{value}</p>
      <p className={`text-xs font-medium ${iconColor.replace('-600', '-700')}`}>{label}</p>
    </div>
  );
};

export default SummaryCard;