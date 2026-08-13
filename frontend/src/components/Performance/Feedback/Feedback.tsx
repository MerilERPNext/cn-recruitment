import { lazy, useCallback, useState } from "react";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";
import type { PeerReviewItem, FeedbackFormData } from "../../../types/goal";
import { useGetFeedBackForm, useGetMyPeerReviews } from "../../../hooks/usePerformance";

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

// Typed Mock Data matching get_feedback_form API
export const MOCK_FEEDBACK_FORM_DATA: Record<string, FeedbackFormData> = {
  "MSFN-00001": {
    nomination: "MSFN-00001",
    process: "FY26 Goal Peer Feedback",
    basis: "Goals",
    subject: "PW4872",
    subject_name: "Kamesh Isame",
    designation: "Test_Test",
    department: "DEP_1119",
    due_date: "2026-08-18",
    due_in_days: 5,
    comment_mandatory: false,
    anonymity: {
      threshold: 2,
      note: "Your feedback is anonymous. Aggregated peer scores are shared only if at least 2 peers submit. Comments are shared verbatim without attribution.",
    },
    scale: [
      { value: 1, label: "Unsatisfactory" },
      { value: 2, label: "Below" },
      { value: 3, label: "Meets" },
      { value: 4, label: "Exceeds" },
      { value: 5, label: "Outstanding" },
    ],
    items: [
      {
        id: "GOAL-26-00901",
        title: "Technical Excellence",
        description: "Designs & delivers complex systems with quality, scale and craft.",
        rating: 5,
        comment: "",
        weightage:3
      },
      {
        id: "GOAL-26-00902",
        title: "Cross-functional Partnership",
        description: "Collaborates effectively with Design, Product and QA.",
        rating: 4,
        comment: "",
        weightage: 3
      },
      {
        id: "GOAL-26-00903",
        title: "Leadership & Influence",
        description: "Sets technical direction; coaches engineers; communicates trade-offs.",
        rating: 0,
        comment: "",
        weightage: 3
      },
    ],
  },
};

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

  const [activeNominationId, setActiveNominationId] = useState<string>("MSFN-00001");
  const activeReview: PeerReviewItem =
    openReviews.find((r) => r.nomination === activeNominationId) || openReviews[0];
  const { data: feedBackResponse  } = useGetFeedBackForm(activeNominationId)
  const currentFormData: FeedbackFormData =
    MOCK_FEEDBACK_FORM_DATA[activeReview?.nomination] || MOCK_FEEDBACK_FORM_DATA["MSFN-00001"];
  const reviewFeedbackResponse = feedBackResponse?.data
  const [ratings, setRatings] = useState<Record<string, { value: number; comment: string }>>({
    "GOAL-26-00901": { value: 5, comment: "" },
    "GOAL-26-00902": { value: 4, comment: "" },
    "GOAL-26-00903": { value: 0, comment: "" },
  });
  const handleSelectReview = useCallback((nominationId: string) => {
    setActiveNominationId(nominationId);
  }, []);

  const headerSubjectName = reviewFeedbackResponse?.subject_name || activeReview?.subject_name || "Peer";
  const headerDesignation = reviewFeedbackResponse?.designation || activeReview?.designation || "";
  const headerInitials = getInitials(headerSubjectName);
  const headerDueDays = reviewFeedbackResponse?.due_in_days ?? activeReview?.due_in_days ?? 3;

  return (
    <div className="min-h-full bg-[#f8fafc] overflow-y-scroll p-4 sm:p-1 font-sans">
      <div className="max-w-[1300px] mx-auto flex flex-col xl:flex-row gap-6">
        {/* Main Content (Left) */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6 flex flex-col sm:flex-row justify-between items-start">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xl font-bold shrink-0">
                {headerInitials}
              </div>
              <div className="flex flex-col justify-center">
                <Typography variant="caption" className="text-gray-500 mb-1">You are giving peer feedback on</Typography>
                <Typography variant="h3" className="text-gray-900 font-bold mb-2">
                  {headerSubjectName} {headerDesignation ? `· ${headerDesignation}` : ''}
                </Typography>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="w-fit rounded-xl bg-purple-100 text-purple-700 py-0.5 px-2 text-xs flex justify-center items-center gap-1.5">
                    <Typography variant="label" className="text-purple-700 font-semibold">
                      Aggregated - Anonymous
                    </Typography>
                  </div>
                  <Typography variant="caption" className="text-gray-500">· Manager will see aggregated scores only</Typography>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start sm:items-end text-left sm:text-right shrink-0 mt-4 sm:mt-0">
              <Typography variant="caption" className="text-gray-500 font-semibold tracking-wider mb-1">DUE IN</Typography>
              <Typography variant="h3" className="text-amber-600 font-bold">{headerDueDays} days</Typography>
            </div>
          </div>

          {/* Feedback Form Rating Cards */}
          <div className="flex flex-col">
            {(reviewFeedbackResponse?.items || []).map((item) => (
              <RatingCard
                key={item.id}
                title={item.title}
                description={item.description}
                value={ratings[item.id]?.value ?? item.rating ?? 0}
                onChange={(val) =>
                  setRatings((prev) => ({
                    ...prev,
                    [item.id]: { ...(prev[item.id] || { comment: "" }), value: val },
                  }))
                }
                comment={ratings[item.id]?.comment ?? item.comment ?? ""}
                onCommentChange={(val) =>
                  setRatings((prev) => ({
                    ...prev,
                    [item.id]: { ...(prev[item.id] || { value: 0 }), comment: val },
                  }))
                }
                weightage={item.weightage}
              />
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-5">
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
              <Typography variant="subheading" className="mb-4 text-gray-900">
                One thing {activeReview?.subject_name || "they"} should keep doing
              </Typography>
              <textarea
                rows={4}
                placeholder="A behaviour you'd want to see more of..."
                className="min-h-[112px] w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm leading-5 text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                aria-label={`One thing ${activeReview?.subject_name || "they"} should keep doing`}
              />
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
              <Typography variant="subheading" className="mb-4 text-gray-900">
                One thing {activeReview?.subject_name || "they"} could improve
              </Typography>
              <textarea
                rows={4}
                placeholder="Constructive — focus on impact, not blame..."
                className="min-h-[112px] w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm leading-5 text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                aria-label={`One thing ${activeReview?.subject_name || "they"} could improve`}
              />
            </div>

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
        </div>

        <div className="w-full xl:w-[420px] shrink-0 flex flex-col gap-6">
          <AnonymousInfoCard note={currentFormData?.anonymity?.note} />
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
