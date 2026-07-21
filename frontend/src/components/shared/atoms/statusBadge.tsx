import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Ban,
  Calendar,
  CalendarCheck,
  Check,
  Clock,
  Eye,
  RotateCcw,
  Vote,
  X,
} from "lucide-react";
import type { ReactNode } from "react";

export type StatusBadgeConfig = {
  label: string;
  bgClass: string;
  textClass: string;
  icon: ReactNode;
};

function getStatusBadge(rawStatus?: string): StatusBadgeConfig {
  const status = rawStatus?.toLowerCase().trim();

  switch (status) {
    case "draft":
      return {
        label: "Draft",
        bgClass: "bg-yellow-100",
        textClass: "text-yellow-800",
        icon: <Clock className="w-3 h-3 md:w-4 md:h-4" />,
      };
    case "in progress":
      return {
        label: "In Progress",
        bgClass: "bg-yellow-100",
        textClass: "text-yellow-800",
        icon: <Clock className="w-3 h-3 md:w-4 md:h-4" />,
      };
    case "open":
    case "pending":
      return {
        label: "Pending",
        bgClass: "bg-yellow-100",
        textClass: "text-yellow-800",
        icon: <Clock className="w-3 h-3 md:w-4 md:h-4" />,
      };

    case "approved":
      return {
        label: "Approved",
        bgClass: "bg-emerald-100",
        textClass: "text-emerald-700",
        icon: <Check className="w-3 h-3 md:w-4 md:h-4" />,
      };

    case "rejected":
      return {
        label: "Rejected",
        bgClass: "bg-red-100",
        textClass: "text-red-700",
        icon: <X className="w-3 h-3 md:w-4 md:h-4" />,
      };

    case "cancelled":
      return {
        label: "Cancelled",
        bgClass: "bg-red-50",
        textClass: "text-red-600",
        icon: <Ban className="w-3 h-3 md:w-4 md:h-4" />,
      };
    case "revoked":
      return {
        label: "Revoked",
        bgClass: "bg-slate-100",
        textClass: "text-slate-500",
        icon: <RotateCcw className="w-3 h-3 md:w-4 md:h-4" />,
      };

    case "completed":
      return {
        label: "Completed",
        bgClass: "bg-blue-100",
        textClass: "text-blue-700",
        icon: <Check className="w-3 h-3 md:w-4 md:h-4" />,
      };

    case "submitted":
      return {
        label: "Submitted",
        bgClass: "bg-emerald-100",
        textClass: "text-emerald-700",
        icon: <Check className="w-3 h-3 md:w-4 md:h-4" />,
      };

    /* ---------- Import statuses ---------- */
    case "processing":
      return {
        label: "Processing",
        bgClass: "bg-blue-100",
        textClass: "text-blue-700",
        icon: <RotateCcw className="w-3 h-3 md:w-4 md:h-4 animate-spin-slow" />,
      };

    case "scheduled":
      return {
        label: "Scheduled",
        bgClass: "bg-purple-100",
        textClass: "text-purple-700",
        icon: <Calendar className="w-3 h-3 md:w-4 md:h-4" />,
      };

    case "failed":
      return {
        label: "Failed",
        bgClass: "bg-red-100",
        textClass: "text-red-700",
        icon: <AlertCircle className="w-3 h-3 md:w-4 md:h-4" />,
      };

    case "processed":
      return {
        label: "Processed",
        bgClass: "bg-green-100",
        textClass: "text-green-700",
        icon: <Check className="w-3 h-3 md:w-4 md:h-4" />,
      };

    /* ---------- Timeline statuses ---------- */
    case "current":
      return {
        label: "Current",
        bgClass: "bg-emerald-50",
        textClass: "text-emerald-700",
        icon: <Clock className="w-3 h-3 md:w-4 md:h-4" />,
      };

    case "upcoming":
      return {
        label: "Upcoming",
        bgClass: "bg-blue-50",
        textClass: "text-blue-700",
        icon: <ArrowUpRight className="w-3 h-3 md:w-4 md:h-4" />,
      };

    case "previous":
      return {
        label: "Previous",
        bgClass: "bg-slate-100",
        textClass: "text-slate-600",
        icon: <ArrowDownRight className="w-3 h-3 md:w-4 md:h-4" />,
      };

    /* ---------- State statuses ---------- */
    case "active":
      return {
        label: "Active",
        bgClass: "bg-emerald-50",
        textClass: "text-emerald-700",
        icon: <Check className="w-3 h-3 md:w-4 md:h-4" />,
      };

    case "inactive":
      return {
        label: "Inactive",
        bgClass: "bg-red-100",
        textClass: "text-red-700",
        icon: <X className="w-3 h-3 md:w-4 md:h-4" />,
      };

    // `status` is already lower-cased above, so the previous
    // `case "Pending Approval"` never matched — use lower-cased keys.
    case "pending approval":
      return {
        label: "Pending Approval",
        bgClass: "bg-yellow-100",
        textClass: "text-yellow-800",
        icon: <Clock className="w-3 h-3 md:w-4 md:h-4" />,
      };

    // The Scheduled Data Import "Pending for approval" status.
    case "pending for approval":
      return {
        label: "Pending for approval",
        bgClass: "bg-orange-100",
        textClass: "text-orange-700",
        icon: <Clock className="w-3 h-3 md:w-4 md:h-4" />,
      };

    /* ---------- Payment statuses ---------- */
    case "paid":
      return {
        label: "Paid",
        bgClass: "bg-emerald-100",
        textClass: "text-emerald-700",
        icon: <Check className="w-3 h-3 md:w-4 md:h-4" />,
      };

    case "unpaid":
      return {
        label: "Unpaid",
        bgClass: "bg-amber-100",
        textClass: "text-amber-800",
        icon: <AlertTriangle className="w-3 h-3 md:w-4 md:h-4" />,
      };

    case "overdue":
      return {
        label: "Overdue",
        bgClass: "bg-red-100",
        textClass: "text-red-700",
        icon: <AlertCircle className="w-3 h-3 md:w-4 md:h-4" />,
      };

    case "issued":
      return {
        label: "Issued",
        bgClass: "bg-green-100",
        textClass: "text-green-800",
        icon: <Clock className="w-3 h-3 md:w-4 md:h-4" />,
      };

    case "allocated":
      return {
        label: "Allocated",
        bgClass: "bg-emerald-100",
        textClass: "text-emerald-700",
        icon: <Check className="w-3 h-3 md:w-4 md:h-4" />,
      };

    case "expired":
      return {
        label: "Expired",
        bgClass: "bg-red-100",
        textClass: "text-red-700",
        icon: <X className="w-3 h-3 md:w-4 md:h-4" />,
      };

    case "triggered":
      return {
        label: "Triggered",
        bgClass: "bg-blue-100",
        textClass: "text-blue-700",
        icon: <AlertCircle className="w-3 h-3 md:w-4 md:h-4" />,
      };

    /* ---------- Recognition phase statuses ---------- */
    case "nomination open":
      return {
        label: "Nominations Open",
        bgClass: "bg-emerald-100",
        textClass: "text-emerald-700",
        icon: <CalendarCheck className="w-3 h-3 md:w-4 md:h-4" />,
      };

    case "voting open":
      return {
        label: "Voting Open",
        bgClass: "bg-blue-100",
        textClass: "text-blue-700",
        icon: <Vote className="w-3 h-3 md:w-4 md:h-4" />,
      };

    case "reviewing":
    case "under review":
      return {
        label: "Under Review",
        bgClass: "bg-amber-100",
        textClass: "text-amber-700",
        icon: <Eye className="w-3 h-3 md:w-4 md:h-4" />,
      };

    case "upcoming nominations":
    case "upcoming voting":
      return {
        label: rawStatus || "Upcoming",
        bgClass: "bg-purple-100",
        textClass: "text-purple-700",
        icon: <Calendar className="w-3 h-3 md:w-4 md:h-4" />,
      };

    case "nomination closed":
    case "voting closed":
      return {
        label: rawStatus || "Closed",
        bgClass: "bg-slate-100",
        textClass: "text-slate-600",
        icon: <X className="w-3 h-3 md:w-4 md:h-4" />,
      };

    case "ongoing":
      return {
        label: "Ongoing",
        bgClass: "bg-blue-50",
        textClass: "text-blue-700",
        icon: <Clock className="w-3 h-3 md:w-4 md:h-4" />,
      };

    default:
      return {
        label: rawStatus || "NA",
        bgClass: "bg-gray-100",
        textClass: "text-gray-600",
        icon: null,
      };
  }
}

type StatusBadgeProps = {
  status?: string;
  size?: "sm" | "md";
};

const StatusBadge = ({ status, size = "md" }: StatusBadgeProps) => {
  const badge = getStatusBadge(status);

  const sizeClasses = {
    sm: "px-2 py-[7px] rounded-md gap-1 text-[12px] leading-3 [&_svg]:!w-3 [&_svg]:!h-3",
    md: "px-3 py-[5px] md:py-[6px] rounded-lg gap-[6px] text-xs md:text-sm leading-4",
  };

  return (
    <div
      className={`
        inline-flex items-center
        font-brand
        font-medium
        capitalize
        ${badge.bgClass}
        ${badge.textClass}
        ${sizeClasses[size]}
      `}
    >
      {badge.icon}
      <span>{badge.label}</span>
    </div>
  );
};

export default StatusBadge;
