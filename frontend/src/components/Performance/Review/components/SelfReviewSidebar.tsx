import { CheckCircle, Clock } from "lucide-react";
import { Typography } from "../../../shared/atoms/Typography";

const reviewSteps = [
  { id: 1, label: "Goals & KRs", questions: "5Q", status: "done" },
  { id: 2, label: "Achievements", questions: "3Q", status: "active" },
  { id: 3, label: "Development Plan", questions: "4Q", status: "upcoming" },
  { id: 4, label: "Career Aspirations", questions: "2Q", status: "upcoming" },
  { id: 5, label: "Overall Comments", questions: "1Q", status: "upcoming" },
] as const;

type ReviewStep = (typeof reviewSteps)[number];

interface ReviewStepItemProps {
  step: ReviewStep;
}

const ReviewStepItem = ({ step }: ReviewStepItemProps) => {
  const isActive = step.status === "active";
  const isDone = step.status === "done";

  return (
    <div
      className={`flex min-w-max cursor-pointer items-center gap-2 border-b-2 px-1 pb-2 text-left transition-colors hover:text-blue-600 xl:min-w-0 xl:justify-between xl:gap-3 xl:rounded-lg xl:border-b-0 xl:p-2 ${
        isActive
          ? "border-blue-500 text-blue-600 xl:bg-blue-50"
          : "border-transparent text-gray-600 hover:border-gray-200 xl:hover:bg-gray-50"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2 xl:gap-3">
        <div className="hidden xl:block">
          {isDone ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                isActive ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"
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
      <Typography variant="caption" className={isActive ? "text-blue-500" : "text-gray-400"}>
        {step.questions}
      </Typography>
    </div>
  );
};

export const SelfReviewSidebar = () => {
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
          {reviewSteps.map((step) => (
            <ReviewStepItem key={step.id} step={step} />
          ))}
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
              1 of 5 done
            </Typography>
          </div>
          <div className="w-full bg-gray-100 rounded-md h-1.5 mb-3">
            <div
              className="bg-blue-500 h-1.5 rounded-md"
              style={{ width: "20%" }}
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
