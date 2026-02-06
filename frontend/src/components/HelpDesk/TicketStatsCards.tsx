import React from "react";
import { Typography } from "../shared/atoms/Typography";
import { TicketStats } from "../../hooks/useHelpDeskTickets";

// SVG Icons from Figma design
const TotalIssuesIcon = () => (
  <svg width="54" height="54" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 10C0 4.47715 4.47715 0 10 0H44C49.5228 0 54 4.47715 54 10V44C54 49.5228 49.5228 54 44 54H10C4.47715 54 0 49.5228 0 44V10Z" fill="#FBF5FF" />
    <path fillRule="evenodd" clipRule="evenodd" d="M27 15.6C33.28 15.6 38.4 20.72 38.4 27C38.4 33.28 33.28 38.4 27 38.4C23.9782 38.3947 21.0816 37.1919 18.9448 35.0552C16.8081 32.9184 15.6053 30.0218 15.6 27C15.6 20.72 20.72 15.6 27 15.6ZM27 13C19.28 13 13 19.28 13 27C13 34.72 19.28 41 27 41C34.72 41 41 34.72 41 27C41 19.28 34.72 13 27 13ZM29 19H25V29H29V19ZM29 31H25V35H29V31Z" fill="#9333EA" />
  </svg>
);

const InProgressIcon = () => (
  <svg width="54" height="54" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 10C0 4.47715 4.47715 0 10 0H44C49.5228 0 54 4.47715 54 10V44C54 49.5228 49.5228 54 44 54H10C4.47715 54 0 49.5228 0 44V10Z" fill="#FFF6E7" />
    <path fillRule="evenodd" clipRule="evenodd" d="M29 29H25V19H29V29ZM25 35H29V31H25V35ZM37.66 31H33L36 34C33.9 36.66 30.66 38.4 27 38.4C23.9782 38.3947 21.0816 37.1919 18.9448 35.0552C16.8081 32.9184 15.6053 30.0218 15.6 27C15.6 26.32 15.66 25.66 15.78 25H13.16C13.06 25.66 13 26.32 13 27C13 34.72 19.28 41 27 41C31.38 41 35.26 38.96 37.82 35.82L41 39V31H37.66ZM16.34 23H21L18 20C20.1 17.34 23.34 15.6 27 15.6C33.28 15.6 38.4 20.72 38.4 27C38.4 27.68 38.34 28.34 38.22 29H40.84C40.94 28.34 41 27.68 41 27C41 19.28 34.72 13 27 13C22.62 13 18.74 15.04 16.18 18.18L13 15V23H16.34Z" fill="#9F741F" />
  </svg>
);

const ClosedIcon = () => (
  <svg width="54" height="54" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 10C0 4.47715 4.47715 0 10 0H44C49.5228 0 54 4.47715 54 10V44C54 49.5228 49.5228 54 44 54H10C4.47715 54 0 49.5228 0 44V10Z" fill="#E0FBE7" />
    <path fillRule="evenodd" clipRule="evenodd" d="M24.2 30.7331H27.9333V34.4665H24.2V30.7331ZM27.9333 19.5331H24.2V28.8665H27.9333V19.5331ZM30.7333 22.3331L28.8667 24.1998L33.5333 28.8665L41 20.4665L39.1333 18.5998L33.5333 25.1331L30.7333 22.3331ZM26.0667 37.6398C23.2463 37.6349 20.5428 36.5123 18.5485 34.518C16.5542 32.5237 15.4316 29.8202 15.4267 26.9998C15.4267 21.1385 20.2053 16.3598 26.0667 16.3598C29.4827 16.3598 32.5067 18.0025 34.4667 20.4665L36.184 18.7491C34.965 17.241 33.4233 16.0255 31.6724 15.192C29.9214 14.3585 28.0058 13.9283 26.0667 13.9331C18.8613 13.9331 13 19.7945 13 26.9998C13 34.2051 18.8613 40.0665 26.0667 40.0665C33.272 40.0665 39.1333 34.2051 39.1333 26.9998L36.296 29.8371C35.064 34.3358 30.9573 37.6585 26.0667 37.6585V37.6398Z" fill="#00A63E" />
  </svg>
);

const ResolvedIcon = () => (
  <svg width="54" height="54" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 10C0 4.47715 4.47715 0 10 0H44C49.5228 0 54 4.47715 54 10V44C54 49.5228 49.5228 54 44 54H10C4.47715 54 0 49.5228 0 44V10Z" fill="#EDF4FF" />
    <circle cx="27" cy="27" r="12.8" stroke="#4D7AC2" strokeWidth="2.4" />
    <path d="M27.6582 21.3084V31.0303" stroke="#4D7AC2" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M31.543 27.4198L27.6543 31.3086L23.7656 27.4198" stroke="#4D7AC2" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label }) => (
  <div className="flex items-center gap-4 px-6 py-4 bg-white border-r border-gray-200 last:border-r-0">
    <div className="flex-shrink-0">{icon}</div>
    <div>
      <Typography variant="h2" color="primary" className="text-2xl font-semibold">
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

const TicketStatsCards: React.FC<TicketStatsCardsProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white rounded-lg border border-gray-200">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-r border-gray-200 last:border-r-0">
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
    <div className="grid grid-cols-2 lg:grid-cols-4 bg-white overflow-hidden py-4 rounded-lg border border-gray-200">
      <StatCard icon={<TotalIssuesIcon />} value={stats.total} label="Total issues" />
      <StatCard icon={<InProgressIcon />} value={stats.inProgress} label="In Progress" />
      <StatCard icon={<ClosedIcon />} value={stats.closed} label="Closed" />
      <StatCard icon={<ResolvedIcon />} value={stats.resolved} label="Resolved" />
    </div>
  );
};

export default TicketStatsCards;
