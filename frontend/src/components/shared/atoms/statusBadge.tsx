import { Check, Clock, X } from "lucide-react";
import type { ReactNode } from "react";

export type StatusBadgeConfig = {
  label: string;
  bgClass: string;
  textClass: string;
  icon: ReactNode;
};

export function getStatusBadge(rawStatus?: string): StatusBadgeConfig {
  const status = rawStatus?.toLowerCase().trim();

  switch (status) {
    case "open":
    case "pending":
    case "draft":
      return {
        label: "Pending",
        bgClass: "bg-[#FFB90033]",
        textClass: "text-[#9F741F]",
        icon: <Clock className="w-4 h-4" />,
      };

    case "approved":
      return {
        label: "Approved",
        bgClass: "bg-[#00C95033]",
        textClass: "text-[#199638]",
        icon: <Check className="w-4 h-4" />,
      };

    case "rejected":
    case "cancelled":
      return {
        label: status === "cancelled" ? "Cancelled" : "Rejected",
        bgClass: "bg-[#E7000B33]",
        textClass: "text-[#E7000B]",
        icon: <X className="w-4 h-4" />,
      };

    default:
      return {
        label: rawStatus || "Unknown",
        bgClass: "bg-gray-100",
        textClass: "text-gray-600",
        icon: null,
      };
  }
}

type StatusBadgeProps = {
  status?: string;
};

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const badge = getStatusBadge(status);

  return (
    <div
      className={`
        inline-flex items-center
        gap-[6px]
        px-3 py-[6px]
        rounded-lg
        ${badge.bgClass}
        ${badge.textClass}
        text-sm
        font-brand
        font-medium
        leading-4
        capitalize
      `}
      style={{ fontFamily: "Reddit Sans" }}
    >
      {badge.icon}
      <span>{badge.label}</span>
    </div>
  );
};

export default StatusBadge;
