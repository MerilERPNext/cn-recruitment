import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  LayoutGrid,
  Loader2,
  XCircle,
} from "lucide-react";
import React from "react";
import { ImportStatusSummary } from "../../types/scheduledImports";
import { Typography } from "../shared/atoms/Typography";

interface SummaryCardProps {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  value: number;
  label: string;
  iconClass: string;
  bgClass: string;
  isActive?: boolean;
  onClick?: () => void;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  icon: Icon,
  value,
  label,
  iconClass,
  bgClass,
  isActive = false,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`
      flex items-center gap-2 xl:gap-3 p-3 xl:p-4 rounded-xl border transition-all duration-200 text-left w-full
      ${
        isActive
          ? "border-primary-300 bg-primary-50 shadow-md"
          : "border-gray-100 bg-white hover:shadow-md hover:border-gray-200"
      }
      ${onClick ? "cursor-pointer" : "cursor-default"}
    `}
  >
    <div
      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${bgClass}`}
    >
      <Icon className={`${iconClass}`} size={20} />
    </div>
    <div className="flex-1 min-w-0">
      <Typography
        variant="subheading"
        color={isActive ? "primary" : "title"}
        className="text-xl md:text-2xl font-bold leading-tight"
      >
        {value}
      </Typography>
      <Typography variant="label" color="body2" className="block break-words leading-tight text-xs mt-0.5">
        {label}
      </Typography>
    </div>
  </button>
);

interface ImportSummaryCardsProps {
  summary: ImportStatusSummary;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const ImportSummaryCards: React.FC<ImportSummaryCardsProps> = ({
  summary,
  activeFilter,
  onFilterChange,
}) => {
  const cards: SummaryCardProps[] = [
    {
      icon: LayoutGrid,
      value: summary.total,
      label: "All Imports",
      iconClass: "text-blue-600",
      bgClass: "bg-blue-50",
      isActive: activeFilter === "all",
      onClick: () => onFilterChange("all"),
    },
    {
      icon: Clock,
      value: summary.pendingApproval,
      label: "Pending for approval",
      iconClass: "text-orange-500",
      bgClass: "bg-orange-50",
      isActive: activeFilter === "pending-approval",
      onClick: () => onFilterChange("pending-approval"),
    },
    {
      icon: Database,
      value: summary.pendingScheduled,
      label: "Pending / Scheduled",
      iconClass: "text-purple-600",
      bgClass: "bg-purple-50",
      isActive: activeFilter === "pending-scheduled",
      onClick: () => onFilterChange("pending-scheduled"),
    },
    {
      icon: Loader2,
      value: summary.processing,
      label: "Processing",
      iconClass: "text-blue-500",
      bgClass: "bg-blue-50",
      isActive: activeFilter === "processing",
      onClick: () => onFilterChange("processing"),
    },
    {
      icon: CheckCircle2,
      value: summary.processed,
      label: "Processed",
      iconClass: "text-green-600",
      bgClass: "bg-green-50",
      isActive: activeFilter === "processed",
      onClick: () => onFilterChange("processed"),
    },
    {
      icon: AlertTriangle,
      value: summary.partiallySuccessful,
      label: "Partially Successful",
      iconClass: "text-amber-500",
      bgClass: "bg-amber-50",
      isActive: activeFilter === "partial",
      onClick: () => onFilterChange("partial"),
    },
    {
      icon: XCircle,
      value: summary.failedCancelled,
      label: "Failed / Cancelled",
      iconClass: "text-red-500",
      bgClass: "bg-red-50",
      isActive: activeFilter === "rejected-failed",
      onClick: () => onFilterChange("rejected-failed"),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      {cards.map((card) => (
        <SummaryCard key={card.label} {...card} />
      ))}
    </div>
  );
};

export default ImportSummaryCards;
