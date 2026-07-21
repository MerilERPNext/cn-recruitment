import { Check, X, Clock } from "lucide-react";
import React from "react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<
  string,
  {
    badgeClass: string;
    icon: React.ReactNode;
  }
> = {
  Approved: {
    badgeClass: "bg-success-100 text-success-600",
    icon: <Check className="w-3 h-3 md:w-4 md:h-4" />,
  },
  Rejected: {
    badgeClass: "bg-error-50 text-error-600",
    icon: <X className="w-3 h-3 md:w-4 md:h-4" />,
  },
  Pending: {
    badgeClass: "bg-warning-100 text-warning-800",
    icon: <Clock className="w-3 h-3 md:w-4 md:h-4" />,
  },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = "",
}) => {
  const config = statusConfig[status] || {
    badgeClass: "bg-gray-50 text-gray-600",
    icon: null,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold ${config.badgeClass} ${className}`}
    >
      {config.icon}
      {status}
    </span>
  );
};

export default StatusBadge;