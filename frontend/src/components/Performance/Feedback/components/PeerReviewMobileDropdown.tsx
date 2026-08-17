import { memo, useState } from "react";
import { ChevronDown, Users, CheckCircle2 } from "lucide-react";
import { Typography } from "../../../shared/atoms/Typography";
import type { PeerReviewItem } from "../../../../types/goal";
import { PeerReviewItemCard } from "./PeerReviewItemCard";
import { getInitials } from "../../../../utils/helperUtils";

export interface PeerReviewMobileDropdownProps {
  openReviews: PeerReviewItem[];
  activeNominationId?: string;
  onSelectReview: (nominationId: string) => void;
}

export const PeerReviewMobileDropdown = memo<PeerReviewMobileDropdownProps>(({
  openReviews = [],
  activeNominationId,
  onSelectReview,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeReview = openReviews.find((r) => r.nomination === activeNominationId) || openReviews[0];
  const initials = getInitials(activeReview?.subject_name);

  if (!openReviews || openReviews.length === 0) {
    return null;
  }

  const handleSelect = (nominationId: string) => {
    onSelectReview(nominationId);
    setIsOpen(false);
  };

  return (
    <div className="w-full lg:hidden mb-4">
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-3.5 sm:p-4">
        <div className="flex items-center justify-between mb-2 px-0.5">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-600 shrink-0" />
            <Typography variant="caption" className="text-gray-500 font-semibold tracking-wider">
              YOUR OPEN PEER REVIEWS ({openReviews.length})
            </Typography>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
            isOpen
              ? "border-blue-300 bg-blue-50/90 ring-2 ring-blue-100"
              : "border-blue-100 bg-blue-50/60 hover:bg-blue-50"
          }`}
          aria-expanded={isOpen}
          aria-label="Select open peer review"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
              {initials}
            </div>
            <div className="flex flex-col items-start text-left min-w-0 flex-1">
              <Typography variant="bodyMedium" className="text-sm font-semibold text-gray-900 truncate w-full">
                {activeReview?.subject_name || "Select Peer"}
              </Typography>
              {activeReview?.designation && (
                <Typography variant="caption" className="text-xs text-gray-500 truncate w-full">
                  {activeReview.designation}
                </Typography>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            {activeReview?.submitted || activeReview?.status?.toLowerCase() === "submitted" || activeReview?.status?.toLowerCase() === "done" ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                Done
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                NOW
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                isOpen ? "rotate-180 text-blue-600" : ""
              }`}
            />
          </div>
        </button>

        {isOpen && (
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex flex-col gap-1 max-h-[280px] overflow-y-auto pr-0.5">
            {openReviews.map((review) => (
              <PeerReviewItemCard
                key={review.nomination}
                review={review}
                isActive={activeNominationId === review.nomination}
                onSelectReview={handleSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

PeerReviewMobileDropdown.displayName = "PeerReviewMobileDropdown";

export default PeerReviewMobileDropdown;
