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
      <div className="bg-card rounded-xl shadow-sm border border-border p-4 sm:p-5">
        <Typography
          variant="caption"
          color="body2"
          className="font-semibold tracking-wider mb-4 block"
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
                className={`flex min-w-max cursor-pointer items-center gap-2 border-b-2 px-1 pb-2 text-left transition-all xl:min-w-0 xl:justify-between xl:gap-3 xl:rounded-lg xl:border-b-0 xl:p-2.5 ${
                  isActive
                    ? "border-primary text-primary xl:bg-slate-500/10 font-medium"
                    : "border-transparent text-text-body2 hover:text-text-title xl:hover:bg-slate-500/10"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2 xl:gap-3">
                  <div className="hidden xl:block">
                    {isDone ? (
                      <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                    ) : (
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                          isActive
                            ? "bg-primary text-white"
                            : "bg-slate-500/20 text-text-body2"
                        }`}
                      >
                        {step.id}
                      </div>
                    )}
                  </div>
                  <Typography
                    variant="bodyMedium"
                    className={`whitespace-nowrap text-sm xl:whitespace-normal xl:text-base ${
                      isActive ? "font-semibold text-primary" : "text-text-title"
                    }`}
                  >
                    {step.label}
                  </Typography>
                </div>
                <Typography
                  variant="caption"
                  color="body2"
                  className={isActive ? "text-primary font-semibold" : ""}
                >
                  {step.questions}
                </Typography>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-border xl:mt-8">
          <div className="flex justify-between items-center mb-2">
            <Typography variant="caption" color="body2">
              Progress
            </Typography>
            <Typography
              variant="caption"
              className="font-semibold text-text-title"
            >
              {activeStepId} of {steps.length} in progress
            </Typography>
          </div>
          <div className="w-full bg-slate-500/20 rounded-md h-1.5 mb-3">
            <div
              className="bg-primary h-1.5 rounded-md transition-all duration-300"
              style={{ width: `${(activeStepId / steps.length) * 100}%` }}
            />
          </div>
          <div className="flex items-center gap-1.5 text-text-body2 text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>Autosaved 12s ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};

