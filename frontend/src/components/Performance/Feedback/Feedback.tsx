import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";
import type { FeedbackScaleOption, PeerReviewItem } from "../../../types/goal";
import { PERFORMANCE_QUERY_KEYS, useGetFeedBackForm, useGetMyPeerReviews, useSaveFeedback, useSubmitFeedback } from "../../../hooks/usePerformance";
import Badge from "../../shared/Badge";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { RatingCard } from "./components/RatingCard";
import { FeedbackRightSidebar } from "./components/FeedbackRightSidebar";
import { AnonymousInfoCard } from "./components/AnonymousInfoCard";
import { PeerReviewSidebarSkeleton } from "./components/PeerReviewSidebarSkeleton";
import { FeedbackErrorCard } from "./components/FeedbackErrorCard";
import { FeedbackFormSkeleton } from "./components/FeedbackFormSkeleton";

const EMPTY_SCALE: FeedbackScaleOption[] = []

export const getInitials = (name?: string) => {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return "??";
};


const Feedback = () => {
  const queryClient = useQueryClient()
  const { data: myPeerReviews, isLoading, error, refetch } = useGetMyPeerReviews();

  const apiReviews = myPeerReviews?.data?.reviews;
  const openReviews: PeerReviewItem[] = useMemo(
    () => (apiReviews && apiReviews.length > 0 ? apiReviews : []),
    [apiReviews]
  );

  const [activeNominationId, setActiveNominationId] = useState<string>(apiReviews?.[0]?.nomination ?? "");
  const activeReview = useMemo(
    () => openReviews.find((r) => r.nomination === activeNominationId) || openReviews[0],
    [openReviews, activeNominationId]
  );

  const { data: feedBackResponse, isLoading: feedbackLoading, error: feedbackErr, refetch: feedBackRefetch } = useGetFeedBackForm(activeNominationId)
  const { mutate: saveFeedback, isPending: saveFeedbackLoading, error: saveFeedbackErr } = useSaveFeedback()
  const { mutate: submitFeedback, isPending: submitfeedbackLoading, error: submitfeedbackErr } = useSubmitFeedback()
  const reviewFeedbackResponse = feedBackResponse?.data
  const [ratings, setRatings] = useState<
    Record<string, { value: number; comment: string }>
  >({});
  const handleSelectReview = useCallback((nominationId: string) => {
    setActiveNominationId(nominationId);
  }, []);

  useEffect(() => {
    if (!apiReviews?.length) {
      setActiveNominationId("");
      return;
    }

    const activeStillExists = apiReviews.some(
      (review) => review.nomination === activeNominationId
    );

    if (!activeStillExists) {
      setActiveNominationId(apiReviews[0].nomination);
    }
  }, [apiReviews, activeNominationId]);

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
  const headerDueDays = reviewFeedbackResponse?.due_in_days ?? activeReview?.due_in_days;
  const hasItems = Boolean(reviewFeedbackResponse?.items && reviewFeedbackResponse.items.length > 0);
  const isSubmitted = Boolean(reviewFeedbackResponse?.locked || reviewFeedbackResponse?.status?.toLowerCase() === "submitted");

  const isAnyLoading = saveFeedbackLoading || submitfeedbackLoading;

  const handelRatingDraft = useCallback(() => {
    const formattAns = Object.entries(ratings).map(([id, item]) => ({
      id,
      rating: item.value,
      comment: item.comment,
    }));
    saveFeedback(
      {
        payload: {
          nomination: activeNominationId,
          answers: formattAns,
        },
      },
      {
        onSuccess: (res) => {
          toast.success(res?.message || "Draft saved successfully!");
          queryClient.invalidateQueries({ queryKey: PERFORMANCE_QUERY_KEYS.feedbackForm(activeNominationId) });
          queryClient.invalidateQueries({ queryKey: PERFORMANCE_QUERY_KEYS.myPeerReviews });
        },
        onError: (err) => {
          toast.error(err?.message || "Failed to save draft.");
        },
      }
    );
  }, [ratings, activeNominationId, saveFeedback, queryClient]);
  const handelSubmitFeedback = useCallback(() => {
    const formattAns = Object.entries(ratings).map(([id, item]) => ({
      id,
      rating: item.value,
      comment: item.comment,
    }));
    submitFeedback(
      {
        payload: {
          nomination: activeNominationId,
          answers: formattAns,
        },
      },
      {
        onSuccess: (res) => {
          toast.success(res?.message || "Feedback submitted successfully!");
          queryClient.invalidateQueries({ queryKey: PERFORMANCE_QUERY_KEYS.feedbackForm(activeNominationId) });
          queryClient.invalidateQueries({ queryKey: PERFORMANCE_QUERY_KEYS.myPeerReviews });
        },
        onError: (err) => {
          toast.error(err?.message || "Failed to submit feedback.");
        },
      }
    );
  }, [ratings, activeNominationId, submitFeedback, queryClient]);
  const handleRatingChange = useCallback((id: string, val: number) => {
    setRatings((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || { comment: "" }), value: val },
    }));
  }, []);
  const handleCommentChange = useCallback((id: string, val: string) => {
    setRatings((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || { value: 0 }), comment: val },
    }));
  }, []);
  return (
    <div className="min-h-full bg-[#f8fafc]  p-4 sm:p-1 font-sans">
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
                        {headerSubjectName ?? "-"} {headerDesignation ? `· ${headerDesignation}` : ''}
                      </Typography>
                      {reviewFeedbackResponse?.status && (
                        <Badge
                          label={reviewFeedbackResponse.status ?? "-"}
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
                  <Typography variant="h3" className="text-amber-600 font-bold">{headerDueDays != null ? `${headerDueDays} days` : "—"}</Typography>
                </div>
              </div>

              <div className="flex flex-col">
                {!reviewFeedbackResponse?.items || reviewFeedbackResponse.items.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-100 p-8 flex flex-col items-center justify-center text-center shadow-sm mb-6">
                    <Typography variant="bodyMedium" className="text-gray-500 font-medium text-sm">
                      No evaluation objectives or goals are configured for this employee.
                    </Typography>
                  </div>
                ) : (
                  reviewFeedbackResponse.items.map((item) => (
                    <RatingCard
                      key={item.id}
                      title={item.title}
                      description={item.description}
                      value={ratings?.[item.id]?.value ?? item.rating ?? 0}
                      onChange={(val) => handleRatingChange(item.id, val)}
                      comment={ratings?.[item.id]?.comment ?? item.comment ?? ""}
                      onCommentChange={(val) => handleCommentChange(item.id, val)}
                      weightage={item.weightage}
                      scale={reviewFeedbackResponse?.scale ?? EMPTY_SCALE}
                      disabled={isSubmitted}
                    />
                  ))
                )}
              </div>

              {(saveFeedbackErr || submitfeedbackErr) && (
                <div className="mt-4">
                  <FeedbackErrorCard
                    title={submitfeedbackErr ? "Failed to submit feedback" : "Failed to save feedback draft"}
                    error={submitfeedbackErr || saveFeedbackErr}
                    onRetry={() => (submitfeedbackErr ? handelSubmitFeedback() : handelRatingDraft())}
                  />
                </div>
              )}

              <div className="mt-5 flex flex-col gap-5">
                <div className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    onClick={() => handelRatingDraft()}
                    variant="outline"
                    bgColor="text"
                    size="md"
                    loading={saveFeedbackLoading}
                    disabled={isAnyLoading || !hasItems || isSubmitted}
                    className="h-11 w-full justify-center border-gray-200 bg-white px-5 text-gray-700 hover:bg-gray-50 sm:w-auto"
                  >
                    Save Draft
                  </Button>
                  <Button
                    onClick={() => handelSubmitFeedback()}
                    variant="contain"
                    bgColor="primary"
                    size="md"
                    loading={submitfeedbackLoading}
                    disabled={isAnyLoading || !hasItems || isSubmitted}
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
