import { LucideIcon } from "lucide-react";
import { Typography } from "../shared/atoms/Typography";

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
  bgColor: bgClass,
  borderColor: borderClass,
  value,
  label,
  isDesktop,
}) => {
  if (isDesktop) {
    return (
      <div
        className={`flex flex-1 items-center gap-3 p-3 rounded-2xl hover:shadow-md transition-all duration-300 border ${bgClass} ${borderClass} group/summary`}
      >
        <div className={`flex-shrink-0 p-2 rounded-xl bg-white shadow-sm group-hover/summary:scale-105 transition-transform`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <Typography variant="bodyMedium" className={`font-bold leading-tight ${iconColor.replace("-600", "-800")}`}>
            {value}
          </Typography>
          <Typography variant="label" className={`font-semibold mt-0.5 uppercase tracking-wider text-[10px] ${iconColor.replace("-600", "-700")}`}>
            {label}
          </Typography>
        </div>
      </div>
    );
  }

  // Mobile layout
  return (
    <div
      className={`w-full text-center p-3 rounded-2xl ${bgClass} border-2 ${borderClass} shadow-sm group/summary-mobile active:scale-95 transition-all`}
    >
      <div className="bg-white/50 w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-sm">
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <Typography variant="bodyMedium" className={`font-bold ${iconColor.replace("-600", "-800")}`}>
        {value}
      </Typography>
      <Typography variant="label" className={`font-bold mt-0.5 uppercase tracking-widest text-[9px] ${iconColor.replace("-600", "-700")}`}>
        {label}
      </Typography>
    </div>
  );
};

export default SummaryCard;
