import React from "react";
import { Typography } from "../shared/atoms/Typography";
import { TicketStats } from "../../hooks/useHelpDeskTickets";
import TotalIssuesIcon from "../../assets/icons/help-desk/TotalIssuesIcon.svg";
import InProgressIcon from "../../assets/icons/help-desk/InProgressIcon.svg";
import ClosedIcon from "../../assets/icons/help-desk/ClosedIcon.svg";
import ResolvedIcon from "../../assets/icons/help-desk/ResolvedIcon.svg";

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label }) => (
  <div className="flex max-sm:flex-col max-sm:justify-center  max-sm:border items-center sm:gap-4 gap-2 sm:px-6 py-4 max-sm:rounded-lg bg-white sm:border-r sm:border-gray-200 sm:last:border-r-0">
    <div className="flex-shrink-0">{icon}</div>
    <div className="flex flex-col max-sm:items-center">
      <Typography
        variant="h2"
        color="primary"
        className="sm:text-3xl text-md font-semibold "
      >
        {value}
      </Typography>
      <Typography variant="bodySmall" color="body2">
        {label}
      </Typography>
    </div>
  </div>
);

interface TicketStatsCardsProps {
  stats: TicketStats;
  isLoading?: boolean;
}

const TicketStatsCards: React.FC<TicketStatsCardsProps> = ({
  stats,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white rounded-lg sm:py-2 border border-gray-200">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-6 py-4 border-r border-gray-200 last:border-r-0"
          >
            <div className="w-14 h-14 bg-gray-100 rounded-lg animate-pulse" />
            <div>
              <div className="w-12 h-6 bg-gray-100 rounded animate-pulse mb-1" />
              <div className="w-20 h-4 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 max-sm:mb-6 sm:bg-white overflow-hidden sm:py-6 gap-2 rounded-lg sm:border-gray-200">
      <StatCard
        icon={<img src={TotalIssuesIcon} className="max-sm:w-10 max-sm:h-10" />}
        value={stats.total}
        label="Total issues"
      />
      <StatCard
        icon={<img src={InProgressIcon} className="max-sm:w-10 max-sm:h-10" />}
        value={stats.inProgress}
        label="In Progress"
      />
      <StatCard
        icon={<img src={ClosedIcon} className="max-sm:w-10 max-sm:h-10" />}
        value={stats.closed}
        label="Closed"
      />
      <StatCard
        icon={<img src={ResolvedIcon} className="max-sm:w-10 max-sm:h-10" />}
        value={stats.resolved}
        label="Resolved"
      />
    </div>
  );
};

export default TicketStatsCards;
