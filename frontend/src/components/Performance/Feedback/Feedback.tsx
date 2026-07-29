import { Suspense, lazy, useState } from "react";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";

const RatingCard = lazy(() =>
  import("./components/RatingCard").then((m) => ({ default: m.RatingCard })),
);
const FeedbackHeaderCard = lazy(() =>
  import("./components/FeedbackHeaderCard").then((m) => ({
    default: m.FeedbackHeaderCard,
  })),
);
const FeedbackRightSidebar = lazy(() =>
  import("./components/FeedbackRightSidebar").then((m) => ({
    default: m.FeedbackRightSidebar,
  })),
);

const Feedback = () => {
  const [ratings, setRatings] = useState({
    tech: { value: 5, comment: "" },
    cross: { value: 4, comment: "" },
    leadership: { value: 0, comment: "" },
  });

  const [activeReviewId, setActiveReviewId] = useState("KI");

  const openReviews = [
    {
      id: "KI",
      name: "Karthik Iyer",
      role: "Eng Lead · Oxygen Platform",
      status: "NOW",
    },
    {
      id: "NP",
      name: "Neha Patel",
      role: "Product Manager · Oxygen",
      status: "—",
    },
    {
      id: "MS",
      name: "Mohit Sinha",
      role: "Sr. Designer · Recruitment",
      status: "done",
    },
    { id: "RB", name: "Riya Banerjee", role: "Research Lead", status: "—" },
  ];

  const activeReview =
    openReviews.find((r) => r.id === activeReviewId) || openReviews[0];

  return (
    <div className="min-h-full bg-[#f8fafc] overflow-y-scroll p-4 sm:p-1 font-sans">
      <Suspense
        fallback={
          <div className="p-6 text-center text-gray-500">Loading...</div>
        }
      >
        <div className="max-w-[1300px] mx-auto flex flex-col xl:flex-row gap-6">
          {/* Main Content (Left) */}
          <div className="flex-1 flex flex-col min-w-0">
            <FeedbackHeaderCard activeReview={activeReview} />

            {/* Feedback Form */}
            <div className="flex flex-col">
              <RatingCard
                title="Technical Excellence"
                description="Designs & delivers complex systems with quality, scale and craft."
                value={ratings.tech.value}
                onChange={(val) =>
                  setRatings((prev) => ({
                    ...prev,
                    tech: { ...prev.tech, value: val },
                  }))
                }
                comment={ratings.tech.comment}
                onCommentChange={(val) =>
                  setRatings((prev) => ({
                    ...prev,
                    tech: { ...prev.tech, comment: val },
                  }))
                }
              />

              <RatingCard
                title="Cross-functional Partnership"
                description="Collaborates effectively with Design, Product and QA."
                value={ratings.cross.value}
                onChange={(val) =>
                  setRatings((prev) => ({
                    ...prev,
                    cross: { ...prev.cross, value: val },
                  }))
                }
                comment={ratings.cross.comment}
                onCommentChange={(val) =>
                  setRatings((prev) => ({
                    ...prev,
                    cross: { ...prev.cross, comment: val },
                  }))
                }
              />

              <RatingCard
                title="Leadership & Influence"
                description="Sets technical direction; coaches engineers; communicates trade-offs."
                value={ratings.leadership.value}
                onChange={(val) =>
                  setRatings((prev) => ({
                    ...prev,
                    leadership: { ...prev.leadership, value: val },
                  }))
                }
                comment={ratings.leadership.comment}
                onCommentChange={(val) =>
                  setRatings((prev) => ({
                    ...prev,
                    leadership: { ...prev.leadership, comment: val },
                  }))
                }
              />
            </div>

            <div className="mt-5 flex flex-col gap-5">
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
                <Typography variant="subheading" className="mb-4 text-gray-900">
                  One thing Karthik should keep doing
                </Typography>
                <textarea
                  rows={4}
                  placeholder="A behaviour you'd want to see more of..."
                  className="min-h-[112px] w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm leading-5 text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  aria-label="One thing Karthik should keep doing"
                />
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
                <Typography variant="subheading" className="mb-4 text-gray-900">
                  One thing Karthik could improve
                </Typography>
                <textarea
                  rows={4}
                  placeholder="Constructive — focus on impact, not blame..."
                  className="min-h-[112px] w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm leading-5 text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  aria-label="One thing Karthik could improve"
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

          <FeedbackRightSidebar
            openReviews={openReviews}
            activeReviewId={activeReviewId}
            onSelectReview={setActiveReviewId}
          />
        </div>
      </Suspense>
    </div>
  );
};

export default Feedback;
