import React from 'react';
import { BarChart2, Calendar, Sparkles, MessageSquare } from 'lucide-react';
import { Typography } from '../../../shared/atoms/Typography';

interface StatItem {
  id: string;
  title: string;
  icon: React.ElementType;
  iconBgColor: string;
  iconTextColor: string;
  value: string;
  subtitle: string;
}

const statsData: StatItem[] = [
  {
    id: 'overall-goal-progress',
    title: 'Overall Goal Progress',
    icon: BarChart2,
    iconBgColor: 'bg-blue-50',
    iconTextColor: 'text-blue-500',
    value: '61%',
    subtitle: 'weighted avg \u00b7 5 goals',
  },
  {
    id: 'cycle-days-remaining',
    title: 'Cycle Days Remaining',
    icon: Calendar,
    iconBgColor: 'bg-blue-50',
    iconTextColor: 'text-blue-500',
    value: '42d',
    subtitle: 'self-review locks 21 May',
  },
  {
    id: 'check-ins-this-quarter',
    title: 'Check-ins This Quarter',
    icon: Sparkles,
    iconBgColor: 'bg-green-50',
    iconTextColor: 'text-green-500',
    value: '11 / 12',
    subtitle: '1 week missed \u00b7 streak 7',
  },
  {
    id: 'last-manager-1-on-1',
    title: 'Last Manager 1:1',
    icon: MessageSquare,
    iconBgColor: 'bg-purple-50',
    iconTextColor: 'text-purple-500',
    value: '3 days ago',
    subtitle: 'Rohit Khanna \u00b7 30 min',
  },
];

const OverviewStats: React.FC = () => {
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
