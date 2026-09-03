import { memo } from 'react';
import { SquareCheck } from 'lucide-react';
import { Typography } from '../../../shared/atoms/Typography';
import type { PeerReviewItem } from '../../../../types/goal';
import { getInitials } from '../../../../utils/helperUtils';

export interface PeerReviewItemCardProps {
  review: PeerReviewItem;
  isActive: boolean;
  onSelectReview: (nominationId: string) => void;
}

export const PeerReviewItemCard = memo<PeerReviewItemCardProps>(({
  review,
  isActive,
  onSelectReview,
}) => {
  const initials = getInitials(review.subject_name);

  return (
    <button 
      aria-label={`Open peer review for ${review.subject_name}`}
      onClick={() => onSelectReview(review.nomination)}
      className={`w-full flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${isActive ? 'bg-primary/20' : 'hover:bg-slate-500/10'}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isActive ? 'bg-primary text-white' : 'bg-primary/20 text-primary'}`}>
          {initials}
        </div>
        <div className="flex flex-col items-start text-left">
          <Typography variant="bodyMedium" className={`text-sm ${isActive ? 'text-text-title font-semibold' : 'text-text-body2'}`}>
            {review.subject_name}
          </Typography>
          {review.designation && (
            <Typography variant="caption" color="body2" className="text-xs">
              {review.designation}
            </Typography>
          )}
        </div>
      </div>
      {isActive ? (
        <Typography variant="caption" className="text-primary font-semibold text-xs">NOW</Typography>
      ) : review.submitted || review.status?.toLowerCase() === 'submitted' || review.status?.toLowerCase() === 'done' ? (
        <SquareCheck className="w-4 h-4 text-emerald-500" />
      ) : (
        <Typography variant="caption" color="body2">—</Typography>
      )}
    </button>
  );
});

PeerReviewItemCard.displayName = "PeerReviewItemCard";

export default PeerReviewItemCard;
