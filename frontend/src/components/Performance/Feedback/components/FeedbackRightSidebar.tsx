import React from 'react';
import { SquareCheck } from 'lucide-react';
import { Typography } from '../../../shared/atoms/Typography';
import type { PeerReviewItem } from '../../../../types/goal';

export interface FeedbackRightSidebarProps {
  openReviews: PeerReviewItem[];
  activeNominationId?: string;
  onSelectReview: (nominationId: string) => void;
}

const getInitials = (name?: string) => {
  if (!name) return "??";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export const FeedbackRightSidebar: React.FC<FeedbackRightSidebarProps> = ({ 
  openReviews = [], 
  activeNominationId, 
  onSelectReview,
}) => {
  return (
    <div className="w-full shrink-0 flex flex-col gap-6">
      {/* Open Reviews */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <Typography variant="caption" className="text-gray-500 font-semibold tracking-wider mb-4 block">YOUR OPEN PEER REVIEWS</Typography>
        
        <div className="flex flex-col gap-1">
          {openReviews.map((review) => {
            const isActive = activeNominationId === review.nomination;
            const initials = getInitials(review.subject_name);
            return (
              <button 
                key={review.nomination} 
                aria-label={`Open peer review for ${review.subject_name}`}
                onClick={() => onSelectReview(review.nomination)}
                className={`w-full flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-blue-50 text-blue-500'}`}>
                    {initials}
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <Typography variant="bodyMedium" className={`text-sm ${isActive ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>
                      {review.subject_name}
                    </Typography>
                    {review.designation && (
                      <Typography variant="caption" className="text-xs text-gray-400">
                        {review.designation}
                      </Typography>
                    )}
                  </div>
                </div>
                {isActive ? (
                  <Typography variant="caption" className="text-blue-600 font-semibold text-xs">NOW</Typography>
                ) : review.submitted || review.status?.toLowerCase() === 'submitted' || review.status?.toLowerCase() === 'done' ? (
                  <SquareCheck className="w-4 h-4 text-green-500" />
                ) : (
                  <Typography variant="caption" className="text-gray-300">—</Typography>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
