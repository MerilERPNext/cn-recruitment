import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Info,
  X,
} from "lucide-react";
import { useState } from "react";
import Badge from "../../shared/Badge";
import { Select } from "../../shared/atoms/Select";
import { Typography } from "../../shared/atoms/Typography";

type WizardStep = {
  id: string;
  label: string;
};

type SelectOption = {
  label: string;
  value: string;
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

type AppraisalCycleWizardProps = {
  data?: AppraisalCycleWizardData;
};

const mockWizardData: AppraisalCycleWizardData = {
  title: "FY26 Annual Performance Cycle",
  eyebrow: "New Cycle Wizard",
  activeStepId: "cycle-details",
  lastSavedLabel: "Last saved 12s ago",
  header: {
    title: "Cycle Details",
    description: "Name your cycle, define the period, and link to its goal cycle.",
  },
  steps: [
    { id: "cycle-details", label: "Cycle Details" },
    { id: "eligibility", label: "Eligibility" },
    { id: "stages", label: "Stages" },
    { id: "form-builder", label: "Form Builder" },
    { id: "goal-pull-in", label: "Goal Pull-in" },
    { id: "competencies", label: "Competencies" },
    { id: "workflow", label: "Workflow" },
    { id: "notifications", label: "Notifications" },
    { id: "normalisation-calibration", label: "Normalisation & Calibration" },
    { id: "letters-release", label: "Letters & Release" },
    { id: "review-launch", label: "Review & Launch" },
  ],
  basics: {
    cycleName: "FY26 Annual Performance Cycle",
    description:
      "Annual review for India Tech BU. Covers Apr 2026 – Mar 2027. Linked to FY26 Goal Cycle.",
    cycleType: "Annual",
    fiscalYear: "FY26 (Apr 26 – Mar 27)",
    periodStart: "04/01/2026",
    periodEnd: "03/31/2027",
  },
  ownership: {
    ownerInitials: "AV",
    ownerName: "Anjali Verma",
    ownerMeta: "HR Admin · India Tech",
    linkedGoalCycle: "FY26 Goal Cycle (Annual)",
    currencyForLetters: "INR ₹",
    tags: ["annual", "india", "tech", "fy26"],
  },
  options: {
    cycleTypes: [{ label: "Annual", value: "Annual" }],
    fiscalYears: [{ label: "FY26 (Apr 26 – Mar 27)", value: "FY26 (Apr 26 – Mar 27)" }],
    linkedGoalCycles: [
      { label: "FY26 Goal Cycle (Annual)", value: "FY26 Goal Cycle (Annual)" },
    ],
    currencies: [{ label: "INR ₹", value: "INR ₹" }],
  },
  preview: {
    title: "FY26 Annual Performance Cycle",
    metaLines: ["Annual · 1 Apr 26 → 31 Mar 27", "Linked goals · INR letters"],
    launchNote:
      "Once launched, the cycle will appear on every eligible employee's My Performance page.",
    infoTitle: "Probation cycles are different",
    infoDescription:
      "For probation reviews, choose Probation as cycle type and the wizard switches to a 30/60/90 day template with auto-confirmation triggers.",
  },
  validationStatus: "Validation passed",
  nextStepLabel: "Eligibility",
};

const AppraisalCycleWizard = ({ data = mockWizardData }: AppraisalCycleWizardProps) => {
  const [basics, setBasics] = useState(data.basics);
  const activeStepIndex = Math.max(
    data.steps.findIndex((step) => step.id === data.activeStepId),
    0,
  );
  const totalSteps = data.steps.length;
  const progress = totalSteps ? `${((activeStepIndex + 1) / totalSteps) * 100}%` : "0%";
  const stepLabel = `Step ${activeStepIndex + 1} of ${totalSteps}`;
  const cycleTypeOptions = data.options?.cycleTypes?.length
    ? data.options.cycleTypes
    : [{ label: basics.cycleType || "--", value: basics.cycleType || "" }];
  const fiscalYearOptions = data.options?.fiscalYears?.length
    ? data.options.fiscalYears
    : [{ label: basics.fiscalYear || "--", value: basics.fiscalYear || "" }];
  const linkedGoalCycleOptions = data.options?.linkedGoalCycles?.length
    ? data.options.linkedGoalCycles
    : [
        {
          label: data.ownership.linkedGoalCycle || "--",
          value: data.ownership.linkedGoalCycle || "",
        },
      ];
  const currencyOptions = data.options?.currencies?.length
    ? data.options.currencies
    : [
        {
          label: data.ownership.currencyForLetters || "--",
          value: data.ownership.currencyForLetters || "",
        },
      ];
  const selectedCycleType =
    cycleTypeOptions.find((option) => option.value === basics.cycleType) ??
    cycleTypeOptions[0];
  const selectedFiscalYear =
    fiscalYearOptions.find((option) => option.value === basics.fiscalYear) ??
    fiscalYearOptions[0];
  const selectedLinkedGoalCycle =
    linkedGoalCycleOptions.find((option) => option.value === data.ownership.linkedGoalCycle) ??
    linkedGoalCycleOptions[0];
  const selectedCurrency =
    currencyOptions.find((option) => option.value === data.ownership.currencyForLetters) ??
    currencyOptions[0];
  const cycleTitle = basics.cycleName || data.title;

  return (
    <div className="h-full min-h-0 overflow-x-hidden bg-[#f3f7ff] font-sans text-gray-900">
      <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[292px_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-gray-200 bg-white md:sticky md:top-0 md:flex md:h-full md:min-h-0 md:flex-col md:overflow-hidden md:border-b-0 md:border-r">
          <div className="p-3 md:px-4 md:pb-4 md:pt-3">
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
              {cycleTitle}
            </Typography>
            <div className="mt-3 h-1.5 overflow-hidden rounded-md bg-gray-200">
              <div className="h-full rounded-md bg-blue-500" style={{ width: progress }} />
            </div>
            <Typography variant="caption" className="mt-1.5 block font-semibold text-gray-600">
              {stepLabel}
            </Typography>
          </div>

          <div className="flex snap-x gap-2 overflow-x-auto px-3 pb-3 [-webkit-overflow-scrolling:touch] md:block md:min-h-0 md:flex-1 md:space-y-2 md:overflow-y-auto md:px-3 md:pt-2">
            {data.steps.map((step, index) => {
              const active = step.id === data.activeStepId;
              return (
                <button
                  key={step.id}
                  className={`flex min-w-[9.5rem] max-w-[13rem] snap-start items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors sm:min-w-[11rem] md:w-full md:min-w-0 md:max-w-none md:gap-3 md:py-2.5 ${
                    active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold md:h-5 md:w-5 md:text-[11px] ${
                      active ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <Typography
                    variant="bodyMedium"
                    className={`min-w-0 truncate text-sm ${
                      active ? "font-bold text-blue-700" : "font-semibold text-gray-600"
                    }`}
                  >
                    {step.label}
                  </Typography>
                </button>
              );
            })}
          </div>

          <div className="hidden border-t border-gray-200 p-4 lg:block">
            <Typography variant="caption" className="block text-gray-500">
              {data.lastSavedLabel}
            </Typography>
            <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-purple-50 px-4 py-2.5 text-sm font-bold text-purple-600">
              <Info className="h-4 w-4" />
              Show me an example
            </button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-col">
          <header className="flex min-w-0 flex-col gap-4 border-b border-gray-200 bg-white px-3 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
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
              <button className="min-h-[44px] rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm">
                Save Draft
              </button>
              <button className="min-h-[44px] rounded-lg bg-purple-50 px-4 py-2.5 text-sm font-bold text-purple-600">
                Dry-run
              </button>
            </div>
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-3 sm:gap-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-4 sm:space-y-5">
              <section className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
                <Typography variant="h3" className="mb-5 text-base font-bold text-gray-900">
                  Basics
                </Typography>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block">
                      <Typography variant="caption" className="font-semibold text-gray-700">
                        Cycle Name <span className="text-red-500">*</span>
                      </Typography>
                    </label>
                    <div className="flex min-h-[44px] items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-800 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                      <input
                        value={basics.cycleName}
                        onChange={(event) =>
                          setBasics((current) => ({
                            ...current,
                            cycleName: event.target.value,
                          }))
                        }
                        className="w-full bg-transparent text-sm font-normal text-gray-700 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block">
                      <Typography variant="caption" className="font-semibold text-gray-700">
                        Description
                      </Typography>
                    </label>
                    <div className="min-h-[70px] rounded-lg border border-gray-200 bg-white px-3 py-3 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                      <textarea
                        value={basics.description}
                        onChange={(event) =>
                          setBasics((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        rows={3}
                        className="min-h-[44px] w-full resize-none bg-transparent text-sm font-normal leading-relaxed text-gray-700 outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block">
                        <Typography variant="caption" className="font-semibold text-gray-700">
                          Cycle Type <span className="text-red-500">*</span>
                        </Typography>
                      </label>
                      <Select
                        options={cycleTypeOptions}
                        value={selectedCycleType}
                        onChange={(option) =>
                          setBasics((current) => ({ ...current, cycleType: option.value }))
                        }
                        className="relative w-full [&>button]:min-h-[48px] [&>button]:rounded-lg [&>button]:border-gray-200 [&>button]:px-3 [&>button]:text-left [&>button]:text-sm [&>button]:shadow-sm [&>div]:w-full sm:[&>button]:min-h-[54px] sm:[&>button]:px-4 sm:[&>button]:text-base"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block">
                        <Typography variant="caption" className="font-semibold text-gray-700">
                          Fiscal Year
                        </Typography>
                      </label>
                      <Select
                        options={fiscalYearOptions}
                        value={selectedFiscalYear}
                        onChange={(option) =>
                          setBasics((current) => ({ ...current, fiscalYear: option.value }))
                        }
                        className="relative w-full [&>button]:min-h-[48px] [&>button]:rounded-lg [&>button]:border-gray-200 [&>button]:px-3 [&>button]:text-left [&>button]:text-sm [&>button]:shadow-sm [&>div]:w-full sm:[&>button]:min-h-[54px] sm:[&>button]:px-4 sm:[&>button]:text-base"
                      />
                    </div>
                    {[
                      {
                        label: "Period Start",
                        value: basics.periodStart,
                        field: "periodStart" as const,
                        required: true,
                      },
                      {
                        label: "Period End",
                        value: basics.periodEnd,
                        field: "periodEnd" as const,
                        required: true,
                      },
                    ].map((field) => (
                      <div key={field.label}>
                        <label className="mb-2 block">
                          <Typography variant="caption" className="font-semibold text-gray-700">
                            {field.label}{" "}
                            {field.required && <span className="text-red-500">*</span>}
                          </Typography>
                        </label>
                        <div className="flex min-h-[44px] items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-800 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                          <input
                            value={field.value}
                            onChange={(event) =>
                              setBasics((current) => ({
                                ...current,
                                [field.field]: event.target.value,
                              }))
                            }
                            className="min-w-0 flex-1 bg-transparent text-sm font-normal text-gray-700 outline-none"
                          />
                          <CalendarDays className="h-4 w-4 text-gray-700" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
                <Typography variant="h3" className="mb-5 text-base font-bold text-gray-900">
                  Ownership & links
                </Typography>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block">
                      <Typography variant="caption" className="font-semibold text-gray-700">
                        Cycle Owner <span className="text-red-500">*</span>
                      </Typography>
                    </label>
                    <div className="flex min-h-[44px] items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                          {data.ownership.ownerInitials || "--"}
                        </span>
                        <Typography
                          variant="bodyMedium"
                          className="min-w-0 truncate text-sm font-normal text-gray-700"
                        >
                          {data.ownership.ownerName}
                          {data.ownership.ownerMeta ? ` — ${data.ownership.ownerMeta}` : ""}
                        </Typography>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block">
                        <Typography variant="caption" className="font-semibold text-gray-700">
                          Linked Goal Cycle
                        </Typography>
                      </label>
                      <Select
                        options={linkedGoalCycleOptions}
                        value={selectedLinkedGoalCycle}
                        onChange={() => undefined}
                        className="relative w-full [&>button]:min-h-[44px] [&>button]:rounded-lg [&>button]:border-gray-200 [&>button]:px-3 [&>button]:text-left [&>button]:text-sm [&>button]:shadow-sm [&>div]:w-full"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block">
                        <Typography variant="caption" className="font-semibold text-gray-700">
                          Currency for Letters
                        </Typography>
                      </label>
                      <Select
                        options={currencyOptions}
                        value={selectedCurrency}
                        onChange={() => undefined}
                        className="relative w-full [&>button]:min-h-[44px] [&>button]:rounded-lg [&>button]:border-gray-200 [&>button]:px-3 [&>button]:text-left [&>button]:text-sm [&>button]:shadow-sm [&>div]:w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block">
                      <Typography variant="caption" className="font-semibold text-gray-700">
                        Tags
                      </Typography>
                    </label>
                    <div className="flex min-h-[48px] flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
                      {data.ownership.tags.map((tag) => (
                        <Badge
                          key={tag}
                          label={tag}
                          variant="info"
                          size="sm"
                          pulse={{ show: false }}
                          icon={<X className="h-3 w-3 text-blue-600" />}
                        />
                      ))}
                      <Typography variant="bodyMedium" className="text-sm font-normal text-gray-400">
                        Add tag...
                      </Typography>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <aside className="min-w-0 space-y-4 xl:pt-0">
              <Typography
                variant="caption"
                className="hidden font-bold uppercase tracking-[0.2em] text-gray-500 xl:block"
              >
                Little Preview
              </Typography>
              <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <Typography variant="h3" className="break-words text-base font-bold text-gray-900">
                  {cycleTitle}
                </Typography>
                <Typography
                  variant="bodyMedium"
                  className="mt-1 text-sm font-normal leading-relaxed text-gray-600"
                >
                  {data.preview.metaLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </Typography>
              </section>
              <Typography
                variant="bodyMedium"
                className="break-words text-sm font-normal leading-relaxed text-gray-500"
              >
                {data.preview.launchNote}
              </Typography>
              <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <Typography variant="h3" className="text-sm font-bold text-blue-700">
                  {data.preview.infoTitle}
                </Typography>
                <Typography
                  variant="bodyMedium"
                  className="mt-2 break-words text-sm font-normal leading-relaxed text-gray-600"
                >
                  {data.preview.infoDescription}
                </Typography>
              </section>
            </aside>
          </div>

          <footer className="sticky bottom-0 flex flex-col gap-3 border-t border-gray-200 bg-white px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <button className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 sm:w-auto">
              <span className="text-lg leading-none">←</span>
              Cancel
            </button>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-600 sm:justify-start">
                <Check className="h-4 w-4" />
                {data.validationStatus}
              </div>
              <button className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-600 sm:w-auto">
                Next: {data.nextStepLabel}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default AppraisalCycleWizard;
