import React from 'react';
import { Typography } from '../../../shared/atoms/Typography';
import Badge from '../../../shared/Badge';
import type { PeerReviewItem } from '../../../../types/goal';

interface FeedbackHeaderCardProps {
  activeReview?: PeerReviewItem | {
    id?: string;
    nomination?: string;
    name?: string;
    subject_name?: string;
    role?: string;
    designation?: string;
    due_in_days?: number;
  };
}

const getInitials = (name?: string) => {
  if (!name) return "??";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export const FeedbackHeaderCard: React.FC<FeedbackHeaderCardProps> = ({ activeReview }) => {
  const name = (activeReview as PeerReviewItem)?.subject_name || (activeReview as any)?.name || "Peer";
  const role = (activeReview as PeerReviewItem)?.designation || (activeReview as any)?.role || "";
  const initials = getInitials(name);
  const dueDays = (activeReview as PeerReviewItem)?.due_in_days ?? 3;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6 flex flex-col sm:flex-row justify-between items-start">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xl font-bold shrink-0">
          {initials}
        </div>
        <div className="flex flex-col justify-center">
          <Typography variant="caption" className="text-gray-500 mb-1">You are giving peer feedback on</Typography>
          <Typography variant="h3" className="text-gray-900 font-bold mb-2">{name} {role ? `· ${role}` : ''}</Typography>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Badge label="Aggregated - Anonymous" variant="purple" size="sm" />
            <Typography variant="caption" className="text-gray-500">· Manager will see aggregated scores only</Typography>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-start sm:items-end text-left sm:text-right shrink-0 mt-4 sm:mt-0">
        <Typography variant="caption" className="text-gray-500 font-semibold tracking-wider mb-1">DUE IN</Typography>
        <Typography variant="h3" className="text-amber-600 font-bold">{dueDays} days</Typography>
      </div>
    </div>
  );
};
