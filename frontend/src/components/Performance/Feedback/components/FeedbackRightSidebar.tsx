import { memo } from 'react';
import { Typography } from '../../../shared/atoms/Typography';
import type { PeerReviewItem } from '../../../../types/goal';
import { PeerReviewItemCard } from './PeerReviewItemCard';

export interface FeedbackRightSidebarProps {
  openReviews: PeerReviewItem[];
  activeNominationId?: string;
  onSelectReview: (nominationId: string) => void;
}

export const FeedbackRightSidebar = memo<FeedbackRightSidebarProps>(({ 
  openReviews = [], 
  activeNominationId, 
  onSelectReview,
}) => {
  return (
    <div className="w-full shrink-0 flex flex-col gap-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <Typography variant="caption" className="text-gray-500 font-semibold tracking-wider mb-4 block">YOUR OPEN PEER REVIEWS</Typography>
        
        <div className="flex flex-col gap-1">
          {openReviews.length === 0 ? (
            <Typography variant="caption" className="text-gray-400 text-xs py-4 block text-center italic">
              No open peer reviews assigned to you.
            </Typography>
          ) : (
            openReviews.map((review) => (
              <PeerReviewItemCard
                key={review.nomination}
                review={review}
                isActive={activeNominationId === review.nomination}
                onSelectReview={onSelectReview}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
});

FeedbackRightSidebar.displayName = "FeedbackRightSidebar";

export default FeedbackRightSidebar;
