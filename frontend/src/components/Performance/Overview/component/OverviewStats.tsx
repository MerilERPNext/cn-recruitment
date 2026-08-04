import React from 'react';
import { BarChart2, Calendar, CheckSquare, MessageSquare } from 'lucide-react';
import { Typography } from '../../../shared/atoms/Typography';
import type { StatItem } from '../types';

import { usePerformanceOverview } from '../../../../hooks/usePerformance';

const OverviewStats: React.FC = () => {
  const { data: overviewResponse } = usePerformanceOverview();
  const overview = overviewResponse?.data;

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date);
  };

  const checkins = overview?.checkins;
  const missedWeeks = checkins ? Math.max(0, checkins.expected - checkins.done) : 0;

  const statsData: StatItem[] = [
    {
      id: 'overall-goal-progress',
      title: 'Overall Goal Progress',
      icon: BarChart2,
      iconBgColor: 'bg-blue-50',
      iconTextColor: 'text-blue-500',
      value: overview?.overall_progress !== undefined ? `${overview.overall_progress}%` : '0%',
      subtitle: overview?.goal_count !== undefined ? `weighted avg \u00b7 ${overview.goal_count} goal${overview.goal_count !== 1 ? 's' : ''}` : 'No goals',
    },
    {
      id: 'cycle-days-remaining',
      title: 'Cycle Days Remaining',
      icon: Calendar,
      iconBgColor: 'bg-blue-50',
      iconTextColor: 'text-blue-500',
      value: overview?.days_remaining !== undefined ? `${overview.days_remaining}d` : '-',
      subtitle: overview?.locks_on ? `self-review locks ${formatDate(overview.locks_on)}` : 'No upcoming locks',
    },
    {
      id: 'check-ins-this-quarter',
      title: 'Check-ins This Quarter',
      icon: CheckSquare,
      iconBgColor: 'bg-green-50',
      iconTextColor: 'text-green-500',
      value: checkins ? `${checkins.done} / ${checkins.expected}` : '- / -',
      subtitle: checkins ? `${missedWeeks > 0 ? `${missedWeeks} week${missedWeeks > 1 ? 's' : ''} missed \u00b7 ` : ''}streak ${checkins.streak}` : 'No check-ins',
    },
    {
      id: 'last-manager-1-on-1',
      title: 'Last Manager 1:1',
      icon: MessageSquare,
      iconBgColor: 'bg-purple-50',
      iconTextColor: 'text-purple-500',
      value: overview?.last_manager_1on1 || 'None',
      subtitle: overview?.last_manager_1on1 ? '' : 'Not scheduled',
    },
  ];

  return (
    <div aria-label="Statistics Grid" className="grid min-w-0 grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      {statsData.map((stat) => {
        const Icon = stat.icon;
        return (
          <article key={stat.id} aria-label={`Statistic: ${stat.title}`} className="flex min-w-0 flex-col justify-between rounded-xl border border-gray-100 bg-white p-3 shadow-sm sm:p-6">
            <div className="mb-3 flex min-w-0 items-start justify-between gap-2 sm:mb-4">
              <Typography variant="label" className="min-w-0 break-words text-[10px] font-semibold uppercase leading-tight tracking-wider text-gray-500 sm:text-xs">{stat.title}</Typography>
              <div className={`w-7 h-7 shrink-0 rounded-lg ${stat.iconBgColor} flex items-center justify-center ${stat.iconTextColor} sm:h-8 sm:w-8`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="min-w-0">
              <Typography variant="h3" className="break-words text-xl leading-tight sm:text-2xl">{stat.value}</Typography>
              <Typography variant="bodySmall" className="block break-words text-xs leading-snug text-gray-500 sm:text-sm">{stat.subtitle}</Typography>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default React.memo(OverviewStats);
