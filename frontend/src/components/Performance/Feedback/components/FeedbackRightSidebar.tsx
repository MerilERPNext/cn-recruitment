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
      <div className="bg-card rounded-xl shadow-sm border border-border p-5">
        <Typography variant="caption" color="body2" className="font-semibold tracking-wider mb-4 block uppercase">YOUR OPEN PEER REVIEWS</Typography>
        
        <div className="flex flex-col gap-1">
          {openReviews.length === 0 ? (
            <Typography variant="caption" color="body2" className="text-xs py-4 block text-center italic">
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
