import { ArrowLeft, ArrowRight, Plus, CheckCircle } from "lucide-react";
import { lazy, useState } from "react";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";
import mockData from "./mockData/selfReviewMockData.json";
import { ReviewQuestionItem } from "./components/AchievementCard";


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
  const [activeStepId, setActiveStepId] = useState<number>(2); // Default to Section 2 (Achievements)
  const [itemsMap, setItemsMap] = useState<Record<string, ReviewQuestionItem[]>>({
    goals: mockData.goals,
    achievements: mockData.achievements,
    developmentPlan: mockData.developmentPlan,
    careerAspirations: mockData.careerAspirations,
    overallComments: mockData.overallComments,
  });

  const currentStepInfo = mockData.steps.find((s) => s.id === activeStepId) || mockData.steps[1];
  const prevStepInfo = mockData.steps.find((s) => s.id === activeStepId - 1);
  const nextStepInfo = mockData.steps.find((s) => s.id === activeStepId + 1);

  const currentItems = itemsMap[currentStepInfo.key] || [];

  const handleAddItem = () => {
    const newItem: ReviewQuestionItem = {
      id: Date.now(),
      title: "",
      impact: "",
      chars: 0,
    };
    setItemsMap((prev) => ({
      ...prev,
      [currentStepInfo.key]: [...(prev[currentStepInfo.key] || []), newItem],
    }));
  };

  const handleRemoveItem = (id: number) => {
    setItemsMap((prev) => ({
      ...prev,
      [currentStepInfo.key]: (prev[currentStepInfo.key] || []).filter((item) => item.id !== id),
    }));
  };

  return (
    <div className="min-h-full bg-app overflow-y-auto p-3 sm:p-6 font-sans">
      <div className="max-w-[1400px] mx-auto flex flex-col xl:flex-row gap-4 sm:gap-6">
        <SelfReviewSidebar
          activeStepId={activeStepId}
          onSelectStep={setActiveStepId}
        />

        <div className="flex-1 flex flex-col gap-4 min-w-0">
         
            <div className="bg-card rounded-xl shadow-sm border border-border p-4 sm:p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="min-w-0">
                <Typography
                  variant="caption"
                  color="body2"
                  className="font-semibold tracking-wider mb-1 block uppercase"
                >
                  {currentStepInfo.sectionText}
                </Typography>
                <Typography
                  variant="h3"
                  className="mb-2 text-xl leading-tight sm:text-2xl font-bold text-text-title"
                >
                  {currentStepInfo.title}
                </Typography>
                <Typography
                  variant="bodyMedium"
                  color="body2"
                  className="max-w-xl"
                >
                  {currentStepInfo.description}
                </Typography>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {currentItems.map((item) => (
                <AchievementCard
                  key={item.id}
                  achievement={item}
                  titleLabel={currentStepInfo.titleLabel}
                  impactLabel={currentStepInfo.impactLabel}
                  onRemove={handleRemoveItem}
                />
              ))}

              <Button
                variant="outline"
                bgColor="primary"
                size="md"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleAddItem}
                className="w-full justify-center border-border bg-card text-primary hover:bg-slate-500/10 sm:w-fit"
              >
                {currentStepInfo.addLabel} ({currentItems.length} of 5)
              </Button>
            </div>

            <div className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  variant="outline"
                  bgColor="text"
                  size="md"
                  disabled={activeStepId === 1}
                  onClick={() => activeStepId > 1 && setActiveStepId(activeStepId - 1)}
                  icon={<ArrowLeft className="w-4 h-4" />}
                  className="h-10 w-full justify-center sm:w-auto"
                >
                  Back{prevStepInfo ? `: ${prevStepInfo.label}` : ""}
                </Button>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <Button
                    variant="outline"
                    bgColor="text"
                    size="md"
                    className="h-10 w-full justify-center sm:w-auto"
                  >
                    Save Draft
                  </Button>

                  {activeStepId < 5 ? (
                    <Button
                      variant="contain"
                      bgColor="primary"
                      size="md"
                      onClick={() => setActiveStepId(activeStepId + 1)}
                      className="h-10 w-full justify-center sm:w-auto"
                    >
                      Next: {nextStepInfo?.label} <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      variant="contain"
                      bgColor="primary"
                      size="md"
                      icon={<CheckCircle className="w-4 h-4" />}
                      className="h-10 w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white sm:w-auto"
                    >
                      Submit Self-Review
                    </Button>
                  )}
                </div>
              </div>
            </div>
        </div>

        <SelfReviewRightSidebar />
      </div>
    </div>
  );
};

export default Review;
