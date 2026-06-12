import { ArrowLeft, ArrowRight, Plus, Sparkles } from "lucide-react";
import { Suspense, lazy, useState } from "react";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";

const SelfReviewSidebar = lazy(() =>
  import("./components/SelfReviewSidebar").then((m) => ({
    default: m.SelfReviewSidebar,
  })),
);
const AchievementCard = lazy(() =>
  import("./components/AchievementCard").then((m) => ({
    default: m.AchievementCard,
  })),
);
const SelfReviewRightSidebar = lazy(() =>
  import("./components/SelfReviewRightSidebar").then((m) => ({
    default: m.SelfReviewRightSidebar,
  })),
);

const Review = () => {
  const [achievements] = useState([
    {
      id: 1,
      title: "Led the Oxygen 2.0 dashboard rebuild",
      impact:
        "Drove design + research for the full redesign. Shipped 24 of 32 v2 components; WAU adoption reached 52% by end of cycle (target 80% by Q3).",
      chars: 139,
    },
    {
      id: 2,
      title: "Cut design → engineering handoff time",
      impact:
        "Built Figma→Storybook automation; introduced clickable prototypes as the new spec format. Median handoff time fell from 4.2 to 3.4 days.",
      chars: 136,
    },
    {
      id: 3,
      title: "Mentored two designers to mid-level",
      impact:
        "Weekly 1:1s + portfolio reviews with Riya and Shreya. Both shipped 4+ features and were promotion-eligible by end of cycle.",
      chars: 123,
    },
  ]);

  return (
    <div className="min-h-full bg-[#f8fafc] overflow-y-auto p-3 sm:p-6 font-sans">
      <Suspense
        fallback={
          <div className="p-6 text-center text-gray-500">Loading...</div>
        }
      >
        <div className="max-w-[1400px] mx-auto flex flex-col xl:flex-row gap-4 sm:gap-6">
          {/* Left Sidebar */}
          <SelfReviewSidebar />

          {/* Main Content */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {/* Header Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="min-w-0">
                <Typography
                  variant="caption"
                  className="text-gray-500 font-semibold tracking-wider mb-1 block"
                >
                  SECTION 2 OF 5
                </Typography>
                <Typography
                  variant="h3"
                  className="mb-2 text-xl leading-tight sm:text-2xl"
                >
                  Achievements
                </Typography>
                <Typography
                  variant="bodyMedium"
                  className="text-gray-600 max-w-xl"
                >
                  Capture 2-3 of your most impactful accomplishments this cycle.
                  Focus on outcome, not activity.
                </Typography>
              </div>
              <Button
                variant="outline"
                bgColor="primary"
                size="md"
                icon={<Sparkles className="w-4 h-4 text-purple-500" />}
                className="bg-purple-50 border-purple-100 text-purple-700 hover:bg-purple-100 whitespace-nowrap w-full sm:w-auto justify-center"
              >
                AI: Pre-fill from check-ins
              </Button>
            </div>

            {/* Form Cards */}
            {achievements.map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}

            <div className="flex flex-col gap-4">
              <Button
                variant="outline"
                bgColor="primary"
                size="md"
                icon={<Plus className="w-4 h-4" />}
                className="w-full justify-center border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-100 sm:w-fit"
              >
                Add another achievement (3 of 5)
              </Button>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  variant="outline"
                  bgColor="text"
                  size="md"
                  icon={<ArrowLeft className="w-4 h-4" />}
                  className="h-10 w-full justify-center border-gray-200 bg-white px-4 text-gray-700 hover:bg-gray-50 sm:w-auto"
                >
                  Back: Goals &amp; KRs
                </Button>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <Button
                    variant="outline"
                    bgColor="text"
                    size="md"
                    className="h-10 w-full justify-center border-gray-200 bg-white px-4 text-gray-700 hover:bg-gray-50 sm:w-auto"
                  >
                    Save Draft
                  </Button>
                  <Button
                    variant="contain"
                    bgColor="primary"
                    size="md"
                    className="h-10 w-full justify-center bg-blue-600 px-4 text-white hover:bg-blue-700 sm:w-auto"
                  >
                    Next: Development Plan <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <SelfReviewRightSidebar />
        </div>
      </Suspense>
    </div>
  );
};

export default Review;
