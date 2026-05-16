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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {statsData.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.id} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <Typography variant="label" className="text-gray-500 font-semibold tracking-wider uppercase">{stat.title}</Typography>
              <div className={`w-8 h-8 rounded-lg ${stat.iconBgColor} flex items-center justify-center ${stat.iconTextColor}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div>
              <Typography variant="h3">{stat.value}</Typography>
              <Typography variant="bodySmall" className="text-gray-500">{stat.subtitle}</Typography>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(OverviewStats);
