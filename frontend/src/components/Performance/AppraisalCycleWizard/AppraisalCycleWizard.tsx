import {
  ChevronDown,
  X,
} from "lucide-react";
import { useState } from "react";
import Badge from "../../shared/Badge";
import { Select } from "../../shared/atoms/Select";
import { Typography } from "../../shared/atoms/Typography";
import WizardShell from "./WizardShell";
import type { AppraisalCycleWizardData } from "./WizardShell";

type AppraisalCycleWizardProps = {
  data?: AppraisalCycleWizardData;
};

export const mockWizardData: AppraisalCycleWizardData = {
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
    cycleTypes: [
      { label: "Annual", value: "Annual" },
      { label: "Half-yearly", value: "Half-yearly" },
      { label: "Quarterly", value: "Quarterly" },
      { label: "Monthly", value: "Monthly" },
      { label: "Project-based", value: "Project-based" },
      { label: "Probation", value: "Probation" },
      { label: "Trigger", value: "Trigger" },
    ],
    fiscalYears: [{ label: "FY26 (Apr 26 – Mar 27)", value: "FY26 (Apr 26 – Mar 27)" }],
    owners: [
      {
        label: "Anjali Verma — HR Admin · India Tech",
        value: "Anjali Verma",
        initials: "AV",
        meta: "HR Admin · India Tech",
      },
      {
        label: "Rohit Sharma — People Partner · India Tech",
        value: "Rohit Sharma",
        initials: "RS",
        meta: "People Partner · India Tech",
      },
      {
        label: "Meera Iyer — HR Lead · Product",
        value: "Meera Iyer",
        initials: "MI",
        meta: "HR Lead · Product",
      },
    ],
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
  const [ownership, setOwnership] = useState(data.ownership);
  const [ownerDropdownOpen, setOwnerDropdownOpen] = useState(false);
  const cycleTypeOptions = data.options?.cycleTypes?.length
    ? data.options.cycleTypes
    : [{ label: basics.cycleType || "--", value: basics.cycleType || "" }];
  const fiscalYearOptions = data.options?.fiscalYears?.length
    ? data.options.fiscalYears
    : [{ label: basics.fiscalYear || "--", value: basics.fiscalYear || "" }];
  const ownerOptions = data.options?.owners?.length
    ? data.options.owners
    : [
        {
          label: `${ownership.ownerName}${ownership.ownerMeta ? ` — ${ownership.ownerMeta}` : ""}`,
          value: ownership.ownerName,
          initials: ownership.ownerInitials,
          meta: ownership.ownerMeta,
        },
      ];
  const linkedGoalCycleOptions = data.options?.linkedGoalCycles?.length
    ? data.options.linkedGoalCycles
    : [
        {
          label: ownership.linkedGoalCycle || "--",
          value: ownership.linkedGoalCycle || "",
        },
      ];
  const currencyOptions = data.options?.currencies?.length
    ? data.options.currencies
    : [
        {
          label: ownership.currencyForLetters || "--",
          value: ownership.currencyForLetters || "",
        },
      ];
  const selectedCycleType =
    cycleTypeOptions.find((option) => option.value === basics.cycleType) ??
    cycleTypeOptions[0];
  const selectedFiscalYear =
    fiscalYearOptions.find((option) => option.value === basics.fiscalYear) ??
    fiscalYearOptions[0];
  const selectedOwner =
    ownerOptions.find((option) => option.value === ownership.ownerName) ?? ownerOptions[0];
  const selectedLinkedGoalCycle =
    linkedGoalCycleOptions.find((option) => option.value === ownership.linkedGoalCycle) ??
    linkedGoalCycleOptions[0];
  const selectedCurrency =
    currencyOptions.find((option) => option.value === ownership.currencyForLetters) ??
    currencyOptions[0];
  const cycleTitle = basics.cycleName || data.title;

  return (
    <WizardShell
      data={{ ...data, title: cycleTitle }}
      title={cycleTitle}
      contentClassName="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"
    >
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
                            type="date"
                            value={field.value}
                            onChange={(event) =>
                              setBasics((current) => ({
                                ...current,
                                [field.field]: event.target.value,
                              }))
                            }
                            className="min-w-0 flex-1 bg-transparent text-sm font-normal text-gray-700 outline-none"
                          />
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
                    <div
                      className="relative"
                      onBlur={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget)) {
                          setOwnerDropdownOpen(false);
                        }
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setOwnerDropdownOpen((open) => !open)}
                        className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-gray-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                            {selectedOwner.initials || "--"}
                          </span>
                          <span className="min-w-0 truncate text-sm font-normal text-gray-700">
                            {selectedOwner.value}
                            {selectedOwner.meta ? ` — ${selectedOwner.meta}` : ""}
                          </span>
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${
                            ownerDropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {ownerDropdownOpen && (
                        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                          <ul className="max-h-60 overflow-auto p-1">
                            {ownerOptions.map((option) => {
                              const selected = option.value === selectedOwner.value;

                              return (
                                <li key={option.value}>
                                  <button
                                    type="button"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => {
                                      setOwnership((current) => ({
                                        ...current,
                                        ownerInitials: option.initials,
                                        ownerName: option.value,
                                        ownerMeta: option.meta,
                                      }));
                                      setOwnerDropdownOpen(false);
                                    }}
                                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition ${
                                      selected
                                        ? "bg-blue-50 text-blue-700"
                                        : "text-gray-700 hover:bg-gray-50"
                                    }`}
                                  >
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                                      {option.initials || "--"}
                                    </span>
                                    <span className="min-w-0 truncate">
                                      {option.value}
                                      {option.meta ? ` — ${option.meta}` : ""}
                                    </span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
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
                    <div className="flex min-h-[48px] flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                      {ownership.tags.map((tag, idx) => (
                        <Badge
                          key={tag}
                          label={tag}
                          variant="info"
                          size="sm"
                          pulse={{ show: false }}
                          icon={
                            <button
                              type="button"
                              onClick={() =>
                                setOwnership((curr) => ({
                                  ...curr,
                                  tags: curr.tags.filter((_, i) => i !== idx),
                                }))
                              }
                              className="text-blue-600 hover:text-blue-800 focus:outline-none"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          }
                        />
                      ))}
                      <input
                        type="text"
                        placeholder="Add tag..."
                        className="flex-1 min-w-[80px] bg-transparent text-sm font-normal text-gray-700 outline-none placeholder-gray-400"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            const val = e.currentTarget.value.trim();
                            if (val && !ownership.tags.includes(val)) {
                              setOwnership((curr) => ({
                                ...curr,
                                tags: [...curr.tags, val],
                              }));
                            }
                            e.currentTarget.value = "";
                          } else if (e.key === "Backspace" && !e.currentTarget.value && ownership.tags.length > 0) {
                            setOwnership((curr) => ({
                              ...curr,
                              tags: curr.tags.slice(0, -1),
                            }));
                          }
                        }}
                      />
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
    </WizardShell>
  );
};

export default AppraisalCycleWizard;
