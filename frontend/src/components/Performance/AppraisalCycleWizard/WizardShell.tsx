import { ArrowRight, Check, Info } from "lucide-react";
import type { ReactNode } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Typography } from "../../shared/atoms/Typography";

export type WizardStep = {
  id: string;
  label: string;
};

export type SelectOption = {
  label: string;
  value: string;
};

export type OwnerOption = SelectOption & {
  initials: string;
  meta: string;
};

export type AppraisalCycleWizardData = {
  title: string;
  eyebrow: string;
  activeStepId: string;
  lastSavedLabel: string;
  header: {
    title: string;
    description: string;
  };
  steps: WizardStep[];
  basics: {
    cycleName: string;
    description: string;
    cycleType: string;
    fiscalYear: string;
    periodStart: string;
    periodEnd: string;
  };
  ownership: {
    ownerInitials: string;
    ownerName: string;
    ownerMeta: string;
    linkedGoalCycle: string;
    currencyForLetters: string;
    tags: string[];
  };
  options?: {
    cycleTypes?: SelectOption[];
    fiscalYears?: SelectOption[];
    owners?: OwnerOption[];
    linkedGoalCycles?: SelectOption[];
    currencies?: SelectOption[];
  };
  preview: {
    title: string;
    metaLines: string[];
    launchNote: string;
    infoTitle: string;
    infoDescription: string;
  };
  validationStatus: string;
  nextStepLabel: string;
};

type WizardShellProps = {
  children?: ReactNode;
  contentClassName?: string;
  data: AppraisalCycleWizardData;
  title?: string;
  onNext?: () => void;
};

const WizardShell = ({
  children,
  contentClassName = "",
  data,
  title,
  onNext,
}: WizardShellProps) => {
  const navigate = useNavigate();
  const activeStepIndex = Math.max(
    data.steps.findIndex((step) => step.id === data.activeStepId),
    0,
  );
  const totalSteps = data.steps.length;
  const progress = totalSteps
    ? `${((activeStepIndex + 1) / totalSteps) * 100}%`
    : "0%";
  const stepLabel = `Step ${activeStepIndex + 1} of ${totalSteps}`;
  const cycleTitle = title || data.title;

  const hasNextStep = activeStepIndex < totalSteps - 1;
  const computedNextLabel = hasNextStep
    ? data.steps[activeStepIndex + 1].label
    : "Complete";

  const handleNavigateStep = (stepId: string) => {
    navigate(`/webapp/performance-app/appraisal-cycle-wizard/${stepId}`);
  };

  const handleNext = () => {
    if (onNext) {
      onNext();
    } else if (activeStepIndex < totalSteps - 1) {
      handleNavigateStep(data.steps[activeStepIndex + 1].id);
    }
  };

  const handleBack = () => {
    if (activeStepIndex > 0) {
      handleNavigateStep(data.steps[activeStepIndex - 1].id);
    } else {
      navigate("/webapp/performance-app");
    }
  };

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#f3f7ff] font-sans text-gray-900 lg:h-full lg:min-h-0 lg:overflow-hidden">
      <div className="grid min-h-dvh grid-cols-1 lg:h-full lg:min-h-0 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)] 2xl:grid-cols-[292px_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-gray-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden lg:border-b-0 lg:border-r">
          <div className="p-3 lg:px-4 lg:pb-4 lg:pt-3">
            <Typography
              variant="caption"
              className="mb-0.5 block font-bold uppercase tracking-wider text-gray-500"
            >
              {data.eyebrow}
            </Typography>
            <Typography
              variant="h3"
              className="break-words text-sm font-bold leading-snug text-gray-900"
            >
              {cycleTitle}zxz
            </Typography>
            <div className="mt-3 h-1.5 overflow-hidden rounded-lg bg-gray-200">
              <div
                className="h-full rounded-lg bg-blue-500"
                style={{ width: progress }}
              />
            </div>
            <Typography
              variant="caption"
              className="mt-1.5 block font-semibold text-gray-600"
            >
              {stepLabel}
            </Typography>
          </div>

          <div className="flex snap-x gap-2 overflow-x-scroll scrollbar-visible lg:scrollbar-hide px-3 pb-3 [-webkit-overflow-scrolling:touch] lg:block lg:min-h-0 lg:flex-1 lg:space-y-2 lg:overflow-y-auto lg:px-3 lg:pt-2">
            {data.steps.map((step, index) => {
              const active = step.id === data.activeStepId;
              const complete = index < activeStepIndex;

              return (
                <button
                  key={step.id}
                  onClick={() => handleNavigateStep(step.id)}
                  className={`flex min-w-[9.5rem] max-w-[13rem] snap-start items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors sm:min-w-[11rem] lg:w-full lg:min-w-0 lg:max-w-none lg:gap-3 ${
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold lg:h-5 lg:w-5 lg:text-[11px] ${
                      active
                        ? "bg-blue-500 text-white"
                        : complete
                          ? "bg-emerald-500 text-white"
                          : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {complete ? <Check className="h-3 w-3" /> : index + 1}
                  </span>
                  <Typography
                    variant="bodyMedium"
                    className={`min-w-0 truncate text-sm ${
                      active
                        ? "font-bold text-blue-700"
                        : "font-semibold text-gray-600"
                    }`}
                  >
                    {step.label}
                  </Typography>
                </button>
              );
            })}
          </div>

          <div className="border-t border-gray-200 p-3 lg:p-4">
            <Typography variant="caption" className="block text-gray-500">
              {data.lastSavedLabel}
            </Typography>
            <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-purple-50 px-4 py-2.5 text-sm font-bold text-purple-600">
              <Info className="h-4 w-4" />
              Show me an example
            </button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-col lg:h-full lg:min-h-0 lg:overflow-hidden">
          <header className="flex shrink-0 min-w-0 flex-col gap-4 border-b border-gray-200 bg-white px-3 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <Typography
                variant="caption"
                className="mb-1 block font-bold uppercase tracking-wider text-gray-500"
              >
                {stepLabel}
              </Typography>
              <Typography
                variant="h1"
                className="break-words text-xl font-bold leading-tight text-gray-900 sm:text-2xl"
              >
                {data.header.title}
              </Typography>
              <Typography
                variant="bodyMedium"
                className="mt-1 max-w-3xl text-sm font-normal leading-relaxed text-gray-500"
              >
                {data.header.description}
              </Typography>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
              <button className="min-h-[44px] whitespace-nowrap rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm">
                Save Draft
              </button>
              <button className="min-h-[44px] whitespace-nowrap rounded-lg bg-purple-50 px-4 py-2.5 text-sm font-bold text-purple-600">
                Dry-run
              </button>
            </div>
          </header>

          <div className="relative flex-1 overflow-y-auto p-3 sm:p-6 lg:min-h-0 lg:overscroll-contain">
            <div className={`mx-auto w-full max-w-5xl ${contentClassName}`}>
              {children ?? <Outlet />}
            </div>
          </div>

          <footer className="shrink-0 flex flex-col gap-3 border-t border-gray-200 bg-white px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <button
              onClick={handleBack}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 sm:w-auto hover:bg-gray-50 transition-colors"
            >
              <span className="text-lg leading-none">←</span>
              Back
            </button>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-600 sm:justify-start">
                <Check className="h-4 w-4 text-emerald-500" />
                {data.validationStatus}
              </div>
              <button
                onClick={handleNext}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-600 sm:w-auto"
              >
                {hasNextStep ? `Next: ${computedNextLabel}` : "Complete"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default WizardShell;
