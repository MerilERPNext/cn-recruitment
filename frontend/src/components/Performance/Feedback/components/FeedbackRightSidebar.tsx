import React from 'react';
import { Sparkles, FileText } from 'lucide-react';
import { Typography } from '../../../shared/atoms/Typography';

export interface ReviewParticipant {
  id: string;
  name: string;
  role: string;
  status: string;
}

interface FeedbackRightSidebarProps {
  openReviews: ReviewParticipant[];
  activeReviewId: string;
  onSelectReview: (id: string) => void;
}

export const FeedbackRightSidebar: React.FC<FeedbackRightSidebarProps> = ({ 
  openReviews, 
  activeReviewId, 
  onSelectReview 
}) => {
  return (
    <div className="w-full xl:w-[420px] shrink-0 flex flex-col gap-6">
      
      {/* Anonymous Info Alert */}
      <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
        <div className="flex items-center gap-2 mb-3 text-blue-700 font-semibold text-sm tracking-wide">
          <FileText className="w-4 h-4" /> YOUR FEEDBACK IS ANONYMOUS
        </div>
        <Typography variant="bodyMedium" className="text-gray-600 leading-relaxed text-sm">
          Karthik will see aggregated peer scores only if at least 2 peers submit (Leapsome floor). Comments are shared verbatim without attribution.
        </Typography>
      </div>

      {/* Open Reviews */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <Typography variant="caption" className="text-gray-500 font-semibold tracking-wider mb-4 block">YOUR OPEN PEER REVIEWS</Typography>
        
        <div className="flex flex-col gap-1">
          {openReviews.map((review) => {
            const isActive = activeReviewId === review.id;
            return (
            <button 
              key={review.id} 
              aria-label={`Open peer review ${review.id}`}
              onClick={() => onSelectReview(review.id)}
              className={`w-full flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isActive ? 'bg-blue-100 text-blue-500' : 'bg-blue-100 text-blue-500'}`}>
                  {review.id}
                </div>
                <Typography variant="bodyMedium" className={`text-sm ${isActive ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>
                  {review.name}
                </Typography>
              </div>
              {isActive ? (
                <Typography variant="caption" className="text-blue-600 font-semibold text-xs">NOW</Typography>
              ) : review.status === 'done' ? (
                <Sparkles className="w-4 h-4 text-green-500" />
              ) : (
                <Typography variant="caption" className="text-gray-300">—</Typography>
              )}
            </button>
          )})}
        </div>
      </div>

    </div>
  );
};
