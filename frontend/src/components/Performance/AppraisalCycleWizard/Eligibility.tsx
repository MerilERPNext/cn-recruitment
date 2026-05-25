import { lazy, Suspense, useState } from "react";
import { mockWizardData } from "./AppraisalCycleWizard";
import type { EligibilityBreakdownItem } from "./components/Eligibility/EligibilitySummaryAside";
import type { EligibilityEmployee } from "./components/Eligibility/EligibilityEmployeesCard";
import type { EligibilityExclusion } from "./components/Eligibility/EligibilityExclusionsCard";
import type { EligibilityRule } from "./components/Eligibility/EligibilityRulesCard";
import WizardShell from "./WizardShell";

const EligibilityRulesCard = lazy(() => import("./components/Eligibility/EligibilityRulesCard"));
const EligibilityExclusionsCard = lazy(() => import("./components/Eligibility/EligibilityExclusionsCard"));
const EligibilityEmployeesCard = lazy(() => import("./components/Eligibility/EligibilityEmployeesCard"));
const EligibilitySummaryAside = lazy(() => import("./components/Eligibility/EligibilitySummaryAside"));

const ruleRows: EligibilityRule[] = [
  {
    id: 1,
    joiner: "WHERE",
    field: "Business Unit",
    operator: "is",
    value: "India Tech",
  },
  {
    id: 2,
    joiner: "AND",
    field: "Department",
    operator: "is in",
    value: "Engineering, Design, Product",
  },
  {
    id: 3,
    joiner: "AND",
    field: "Employee Type",
    operator: "is",
    value: "Full-time",
  },
  {
    id: 4,
    joiner: "AND",
    field: "Tenure",
    operator: ">",
    value: "3 months",
  },
];

const exclusions: EligibilityExclusion[] = [
  { label: "On long leave (>50% of cycle)", count: "12 employees", checked: true },
  { label: "In notice period", count: "8 employees", checked: true },
  { label: "Joined < 90 days before cycle end", count: "23 employees", checked: true },
  { label: "Currently on PIP", count: "4 employees", checked: false },
];

const breakdown: EligibilityBreakdownItem[] = [
  { label: "Engineering", value: 942, percent: 44 },
  { label: "Design", value: 184, percent: 9 },
  { label: "Product", value: 312, percent: 15 },
  { label: "Research", value: 86, percent: 4 },
  { label: "QA", value: 234, percent: 11 },
  { label: "Others", value: 382, percent: 18 },
];

const employees = [
  { name: "Pallavi Mahar", department: "Design · Oxygen", grade: "L4", manager: "Rohit Khanna", tenure: "3.2y", initials: "PM" },
  { name: "Karthik Iyer", department: "Engineering · Platform", grade: "L4", manager: "Rohit Khanna", tenure: "4.1y", initials: "KI" },
  { name: "Riya Banerjee", department: "Design · Oxygen", grade: "L3", manager: "Rohit Khanna", tenure: "1.8y", initials: "RB" },
  { name: "Shreya Das", department: "Design · Oxygen", grade: "L2", manager: "Rohit Khanna", tenure: "0.6y", initials: "SD" },
];

const fieldOptions = [
  "Business Unit",
  "Department",
  "Location",
  "Country",
  "Grade",
  "Job Family",
  "Job Title",
  "Employee Type",
  "Manager",
  "Tenure",
  "Date of Joining",
].map((value) => ({
  label: value,
  value,
}));

const operatorOptions = ["is", "is not", "is in", "is not in", "≥", "≤", "contains"].map((value) => ({
  label: value,
  value,
}));

const eligibilityData = {
  ...mockWizardData,
  activeStepId: "eligibility",
  header: {
    title: "Eligibility",
    description:
      "Define who's in this cycle. Rules refresh nightly; you can override individuals later.",
  },
  validationStatus: "Validation passed",
  nextStepLabel: "Stages",
};

const inputClass =
  "min-h-[38px] w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

const selectClass =
  "relative w-full [&>button]:min-h-[38px] [&>button]:rounded-md [&>button]:border-gray-200 [&>button]:bg-white [&>button]:px-3 [&>button]:py-2 [&>button]:text-left [&>button]:text-sm [&>button]:font-normal [&>button]:text-gray-700 [&>button]:shadow-none [&>button_span]:font-normal [&>div]:w-full";

const sectionFallback = (
  <div className="min-h-[180px] rounded-lg border border-gray-200 bg-white p-4 shadow-sm" />
);

const Eligibility = () => {
  const [activeMode, setActiveMode] = useState<"rules" | "csv">("rules");
  const [rules, setRules] = useState(ruleRows);
  const [selectedExclusions, setSelectedExclusions] = useState(
    exclusions.reduce<Record<string, boolean>>(
      (acc, item) => ({ ...acc, [item.label]: item.checked }),
      {},
    ),
  );

  return (
    <WizardShell
      data={eligibilityData}
      contentClassName="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"
    >
      <div className="min-w-0 space-y-4 sm:space-y-5">
        <Suspense fallback={sectionFallback}>
          <EligibilityRulesCard
            activeMode={activeMode}
            fieldOptions={fieldOptions}
            inputClass={inputClass}
            operatorOptions={operatorOptions}
            rules={rules}
            selectClass={selectClass}
            setActiveMode={setActiveMode}
            setRules={setRules}
          />
        </Suspense>

        <Suspense fallback={sectionFallback}>
          <EligibilityExclusionsCard
            exclusions={exclusions}
            selectedExclusions={selectedExclusions}
            setSelectedExclusions={setSelectedExclusions}
          />
        </Suspense>

        <Suspense fallback={sectionFallback}>
          <EligibilityEmployeesCard employees={employees} />
        </Suspense>
      </div>

      <Suspense fallback={sectionFallback}>
        <EligibilitySummaryAside breakdown={breakdown} />
      </Suspense>
    </WizardShell>
  );
};

export default Eligibility;
