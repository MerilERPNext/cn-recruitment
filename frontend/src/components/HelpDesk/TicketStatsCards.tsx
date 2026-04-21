import React from "react";
import { Typography } from "../shared/atoms/Typography";
import { TicketStatsV2 } from "../../types/helpdesk";
import {
  Ticket,
  Activity,
  CheckCircle2,
  Archive,
  Users,
  Timer,
  Zap,
  Target
} from "lucide-react";

interface StatCardProps {
  icon: React.ElementType;
  value: number | string;
  label: string;
  iconColor: string;
  bgColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, value, label, iconColor, bgColor }) => (
  <div className="flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_20px_-6px_rgba(6,81,237,0.15)] transition-all duration-300 hover:-translate-y-1">
    <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
      <div className={`p-2.5 sm:p-3 rounded-xl ${bgColor} shrink-0`}>
        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${iconColor}`} strokeWidth={2.5} />
      </div>
      <Typography
        variant="h2"
        className="max-w-[450px]:text-xl max-sm:text-2xl text-3xl font-bold text-gray-800 tracking-tight truncate"
      >
        {value}
      </Typography>
    </div>
    <Typography variant="bodySmall" className="text-gray-500 font-medium text-xs sm:text-sm whitespace-nowrap overflow-hidden text-ellipsis">
      {label}
    </Typography>
  </div>
);

interface TicketStatsCardsProps {
  stats: TicketStatsV2 | undefined;
  isLoading?: boolean;
}

const TicketStatsCards: React.FC<TicketStatsCardsProps> = ({
  stats = { all_issues: 0, in_progress: 0, closed: 0, archived: 0, team_size: 0, avg_tat_hrs: 0, avg_frt_hrs: 0, resolution_within_sla_pct: 0 },
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 w-full">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white border border-gray-100 shadow-sm"
          >
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-xl animate-pulse" />
              <div className="w-10 h-6 sm:w-12 sm:h-8 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="w-20 sm:w-24 h-3 sm:h-4 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  const statItems = [
    { label: "Total Issues", value: stats.all_issues, Icon: Ticket, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "In Progress", value: stats.in_progress, Icon: Activity, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Closed", value: stats.closed, Icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Archived", value: stats.archived, Icon: Archive, color: "text-slate-600", bg: "bg-slate-50" },
    { label: "Team Size", value: stats.team_size, Icon: Users, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Avg TAT (hrs)", value: stats.avg_tat_hrs, Icon: Timer, color: "text-fuchsia-600", bg: "bg-fuchsia-50" },
    { label: "Avg FRT (hrs)", value: stats.avg_frt_hrs, Icon: Zap, color: "text-rose-600", bg: "bg-rose-50" },
    { label: "Resolution within SLA (%)", value: stats.resolution_within_sla_pct + '%', Icon: Target, color: "text-cyan-600", bg: "bg-cyan-50" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 w-full">
      {statItems.map((item, index) => (
        <StatCard
          key={index}
          icon={item.Icon}
          value={item.value}
          label={item.label}
          iconColor={item.color}
          bgColor={item.bg}
        />
      ))}
    </div>
  );
};

export default TicketStatsCards;
