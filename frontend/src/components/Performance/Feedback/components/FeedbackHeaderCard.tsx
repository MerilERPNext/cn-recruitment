import React from 'react';
import { Typography } from '../../../shared/atoms/Typography';
import Badge from '../../../shared/Badge';

interface FeedbackHeaderCardProps {
  activeReview: {
    id: string;
    name: string;
    role: string;
  };
}

export const FeedbackHeaderCard: React.FC<FeedbackHeaderCardProps> = ({ activeReview }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6 flex flex-col sm:flex-row justify-between items-start">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xl font-bold shrink-0">
          {activeReview.id}
        </div>
        <div className="flex flex-col justify-center">
          <Typography variant="caption" className="text-gray-500 mb-1">You are giving peer feedback on</Typography>
          <Typography variant="h3" className="text-gray-900 font-bold mb-2">{activeReview.name} · {activeReview.role}</Typography>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Badge label="Aggregated - Anonymous" variant="purple" size="sm" />
            <Typography variant="caption" className="text-gray-500">· Manager will see aggregated scores only</Typography>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-start sm:items-end text-left sm:text-right shrink-0 mt-4 sm:mt-0">
        <Typography variant="caption" className="text-gray-500 font-semibold tracking-wider mb-1">DUE IN</Typography>
        <Typography variant="h3" className="text-amber-600 font-bold">3 days</Typography>
      </div>
    </div>
  );
};
