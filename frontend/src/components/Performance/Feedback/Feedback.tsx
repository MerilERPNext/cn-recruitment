import { lazy, useCallback, useEffect, useState } from "react";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";
import type { PeerReviewItem, FeedbackFormData } from "../../../types/goal";
import { useGetFeedBackForm, useGetMyPeerReviews } from "../../../hooks/usePerformance";
import Badge from "../../shared/Badge";

const RatingCard = lazy(() =>
  import("./components/RatingCard").then((m) => ({ default: m.RatingCard })),
);
const FeedbackRightSidebar = lazy(() =>
  import("./components/FeedbackRightSidebar").then((m) => ({
    default: m.FeedbackRightSidebar,
  })),
);
const AnonymousInfoCard = lazy(() =>
  import("./components/AnonymousInfoCard").then((m) => ({
    default: m.AnonymousInfoCard,
  })),
);
const PeerReviewSidebarSkeleton = lazy(() =>
  import("./components/PeerReviewSidebarSkeleton").then((m) => ({
    default: m.PeerReviewSidebarSkeleton,
  })),
);
const FeedbackErrorCard = lazy(() =>
  import("./components/FeedbackErrorCard").then((m) => ({
    default: m.FeedbackErrorCard,
  })),
);
const FeedbackFormSkeleton = lazy(() =>
  import("./components/FeedbackFormSkeleton").then((m) => ({
    default: m.FeedbackFormSkeleton,
  })),
);


const getInitials = (name?: string) => {
  if (!name) return "??";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const Feedback = () => {
  const { data: myPeerReviews, isLoading, error, refetch } = useGetMyPeerReviews();

  const apiReviews = myPeerReviews?.data?.reviews;
  const openReviews: PeerReviewItem[] =
    apiReviews && apiReviews.length > 0 ? apiReviews : [];

  const [activeNominationId, setActiveNominationId] = useState<string>(apiReviews?.[0]?.nomination ?? "");
  const activeReview: PeerReviewItem =
    openReviews.find((r) => r.nomination === activeNominationId) || openReviews[0];
  const { data: feedBackResponse, isLoading: feedbackLoading, error: feedbackErr, refetch: feedBackRefetch } = useGetFeedBackForm(activeNominationId)
  
  const reviewFeedbackResponse = feedBackResponse?.data
  const [ratings, setRatings] = useState<Record<string, { value: number; comment: string }> | null>(null);
  const handleSelectReview = useCallback((nominationId: string) => {
    setActiveNominationId(nominationId);
  }, []);

  // 1. Select the first peer review by default when the reviews list loads
  useEffect(() => {
    if (apiReviews && apiReviews.length > 0 && !activeNominationId) {
      setActiveNominationId(apiReviews[0].nomination);
    }
  }, [apiReviews, activeNominationId]);

  // 2. Initialize and load ratings state whenever the active review's feedback form data changes
  useEffect(() => {
    if (reviewFeedbackResponse?.items) {
      const initialRatings: Record<string, { value: number; comment: string }> = {};
      reviewFeedbackResponse.items.forEach((item) => {
        initialRatings[item.id] = {
          value: item.rating ?? 0,
          comment: item.comment ?? "",
        };
      });
      setRatings(initialRatings);
    }
  }, [reviewFeedbackResponse]);

  const headerSubjectName = reviewFeedbackResponse?.subject_name || activeReview?.subject_name || "Peer";
  const headerDesignation = reviewFeedbackResponse?.designation || activeReview?.designation || "";
  const headerInitials = getInitials(headerSubjectName);
  const headerDueDays = reviewFeedbackResponse?.due_in_days ?? activeReview?.due_in_days ?? 1;

  return (
    <div className="min-h-full bg-[#f8fafc] overflow-y-scroll p-4 sm:p-1 font-sans">
      <div className="max-w-[1300px] mx-auto flex flex-col xl:flex-row gap-6">
        <div className="flex-1 flex flex-col min-w-0">
          {feedbackLoading ? (
            <FeedbackFormSkeleton />
          ) : feedbackErr ? (
            <FeedbackErrorCard
              title="Failed to load feedback form"
              error={feedbackErr}
              onRetry={() => feedBackRefetch()}
            />
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6 flex flex-col sm:flex-row justify-between items-start">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xl font-bold shrink-0">
                    {headerInitials}
                  </div>
                  <div className="flex flex-col justify-center">
                    <Typography variant="caption" className="text-gray-500 mb-1">You are giving peer feedback on</Typography>
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <Typography variant="h3" className="text-gray-900 font-bold">
                        {headerSubjectName} {headerDesignation ? `· ${headerDesignation}` : ''}
                      </Typography>
                      {reviewFeedbackResponse?.status && (
                        <Badge 
                          label={reviewFeedbackResponse.status} 
                          variant={reviewFeedbackResponse.status.toLowerCase() === "draft" ? "warning" : "success"}
                          size="sm"
                        />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Badge 
                        label="Aggregated - Anonymous" 
                        variant="purple" 
                        size="sm" 
                      />
                      {reviewFeedbackResponse?.due_date && (
                        <Badge 
                          label={`Due Date: ${reviewFeedbackResponse.due_date}`} 
                          variant="info" 
                          size="sm" 
                        />
                      )}
                      <Typography variant="caption" className="text-gray-500 text-xs">
                        • Manager will see aggregated scores only
                      </Typography>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-start sm:items-end text-left sm:text-right shrink-0 mt-4 sm:mt-0">
                  <Typography variant="caption" className="text-gray-500 font-semibold tracking-wider mb-1">DUE IN</Typography>
                  <Typography variant="h3" className="text-amber-600 font-bold">{headerDueDays} days</Typography>
                </div>
              </div>

              <div className="flex flex-col">
                {(reviewFeedbackResponse?.items || []).map((item) => (
                  <RatingCard
                    key={item.id}
                    title={item.title}
                    description={item.description}
                    value={ratings?.[item.id]?.value ?? item.rating ?? 0}
                    onChange={(val) =>
                      setRatings((prev) => ({
                        ...(prev || {}),
                        [item.id]: { ...((prev && prev[item.id]) || { comment: "" }), value: val },
                      }))
                    }
                    comment={ratings?.[item.id]?.comment ?? item.comment ?? ""}
                    onCommentChange={(val) =>
                      setRatings((prev) => ({
                        ...(prev || {}),
                        [item.id]: { ...((prev && prev[item.id]) || { value: 0 }), comment: val },
                      }))
                    }
                    weightage={item.weightage}
                    scale={reviewFeedbackResponse?.scale ?? []}
                  />
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-5">
                <div className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    variant="outline"
                    bgColor="text"
                    size="md"
                    className="h-11 w-full justify-center border-gray-200 bg-white px-5 text-gray-700 hover:bg-gray-50 sm:w-auto"
                  >
                    Save Draft
                  </Button>
                  <Button
                    variant="contain"
                    bgColor="primary"
                    size="md"
                    className="h-11 w-full justify-center bg-blue-600 px-6 text-white hover:bg-blue-700 sm:w-auto"
                  >
                    Submit Feedback
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="w-full xl:w-[420px] shrink-0 flex flex-col gap-6">
          <AnonymousInfoCard 
            title="YOUR FEEDBACK IS ANONYMOUS"
            note={reviewFeedbackResponse?.anonymity?.note} 
          />
          {isLoading ? (
            <PeerReviewSidebarSkeleton />
          ) : error ? (
            <FeedbackErrorCard error={error} onRetry={() => refetch()} />
          ) : (
            <FeedbackRightSidebar
              openReviews={openReviews}
              activeNominationId={activeNominationId}
              onSelectReview={handleSelectReview}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Feedback;
