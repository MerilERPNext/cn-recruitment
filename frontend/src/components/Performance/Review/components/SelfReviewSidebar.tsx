import { CheckCircle, Clock } from "lucide-react";
import { Typography } from "../../../shared/atoms/Typography";
import mockData from "../mockData/selfReviewMockData.json";

interface ReviewStep {
  id: number;
  key: string;
  label: string;
  questions: string;
  sectionText: string;
  title: string;
  description: string;
}

interface SelfReviewSidebarProps {
  activeStepId: number;
  onSelectStep: (stepId: number) => void;
}

export const SelfReviewSidebar = ({
  activeStepId,
  onSelectStep,
}: SelfReviewSidebarProps) => {
  const steps: ReviewStep[] = mockData.steps;

  return (
    <div className="w-full shrink-0 xl:w-64">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5">
        <Typography
          variant="caption"
          className="text-gray-500 font-semibold tracking-wider mb-4 block"
        >
          SELF-REVIEW
        </Typography>

        <div className="flex gap-5 overflow-x-auto pb-1 xl:flex-col xl:gap-1 xl:overflow-visible xl:pb-0">
          {steps.map((step) => {
            const isActive = step.id === activeStepId;
            const isDone = step.id < activeStepId;

            return (
              <div
                key={step.id}
                onClick={() => onSelectStep(step.id)}
                className={`flex min-w-max cursor-pointer items-center gap-2 border-b-2 px-1 pb-2 text-left transition-all hover:text-blue-600 xl:min-w-0 xl:justify-between xl:gap-3 xl:rounded-lg xl:border-b-0 xl:p-2.5 ${
                  isActive
                    ? "border-blue-500 text-blue-600 xl:bg-blue-50/80 font-medium"
                    : "border-transparent text-gray-600 hover:border-gray-200 xl:hover:bg-gray-50"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2 xl:gap-3">
                  <div className="hidden xl:block">
                    {isDone ? (
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                    ) : (
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                          isActive
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {step.id}
                      </div>
                    )}
                  </div>
                  <Typography
                    variant="bodyMedium"
                    className={`whitespace-nowrap text-sm xl:whitespace-normal xl:text-base ${
                      isActive ? "font-semibold text-blue-700" : "text-inherit"
                    }`}
                  >
                    {step.label}
                  </Typography>
                </div>
                <Typography
                  variant="caption"
                  className={isActive ? "text-blue-500 font-semibold" : "text-gray-400"}
                >
                  {step.questions}
                </Typography>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 xl:mt-8">
          <div className="flex justify-between items-center mb-2">
            <Typography variant="caption" className="text-gray-600">
              Progress
            </Typography>
            <Typography
              variant="caption"
              className="text-gray-900 font-semibold"
            >
              {activeStepId} of {steps.length} in progress
            </Typography>
          </div>
          <div className="w-full bg-gray-100 rounded-md h-1.5 mb-3">
            <div
              className="bg-blue-500 h-1.5 rounded-md transition-all duration-300"
              style={{ width: `${(activeStepId / steps.length) * 100}%` }}
            ></div>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <Typography variant="caption">Autosaved 12s ago</Typography>
          </div>
        </div>
      </div>
    </div>
  );
};

