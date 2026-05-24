import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Typography } from "../../shared/atoms/Typography";
import { mockWizardData } from "./AppraisalCycleWizard";
import WizardShell from "./WizardShell";

const ruleRows = [
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

const exclusions = [
  { label: "On long leave (>50% of cycle)", count: "12 employees", checked: true },
  { label: "In notice period", count: "8 employees", checked: true },
  { label: "Joined < 90 days before cycle end", count: "23 employees", checked: true },
  { label: "Currently on PIP", count: "4 employees", checked: false },
];

const breakdown = [
  { label: "Engineering", value: 942, percent: 44 },
  { label: "Design", value: 184, percent: 9 },
  { label: "Product", value: 312, percent: 15 },
  { label: "Research", value: 86, percent: 4 },
  { label: "QA", value: 234, percent: 11 },
  { label: "Others", value: 382, percent: 18 },
];

const employees = [
  { name: "Aarav Mehta", team: "Engineering", location: "India Tech", type: "Full-time" },
  { name: "Nisha Rao", team: "Design", location: "India Tech", type: "Full-time" },
  { name: "Rohan Iyer", team: "Product", location: "India Tech", type: "Full-time" },
];

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

const Eligibility = () => {
  const [activeMode, setActiveMode] = useState<"rules" | "csv">("rules");
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
        <section className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
          <div className="mb-5 grid grid-cols-2 rounded-lg bg-gray-50 p-1 sm:inline-flex">
            <button
              onClick={() => setActiveMode("rules")}
              className={`min-h-[40px] rounded-md px-3 py-2 text-sm font-bold sm:px-4 ${
                activeMode === "rules" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              Dynamic rules
            </button>
            <button
              onClick={() => setActiveMode("csv")}
              className={`min-h-[40px] rounded-md px-3 py-2 text-sm font-bold sm:px-4 ${
                activeMode === "csv" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              Static CSV upload
            </button>
          </div>

          <Typography
            variant="caption"
            className="mb-3 block font-bold uppercase tracking-wider text-gray-500"
          >
            Include employees where
          </Typography>

          <div className="space-y-3">
            {ruleRows.map((rule) => (
              <div
                key={rule.id}
                className="grid grid-cols-1 gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3 sm:grid-cols-[72px_minmax(0,1fr)] xl:grid-cols-[70px_minmax(0,1fr)_110px_minmax(0,1.15fr)_32px] xl:border-0 xl:bg-transparent xl:p-0"
              >
                <div className="flex min-h-[38px] items-center sm:row-span-3 xl:row-span-1">
                  <span
                    className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                      rule.joiner === "WHERE"
                        ? "bg-white text-gray-500 xl:bg-white"
                        : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    {rule.joiner}
                  </span>
                </div>
                <select className={`${inputClass} bg-white`} defaultValue={rule.field}>
                  <option>{rule.field}</option>
                  <option>Business Unit</option>
                  <option>Department</option>
                  <option>Employee Type</option>
                  <option>Tenure</option>
                </select>
                <select className={`${inputClass} bg-white`} defaultValue={rule.operator}>
                  <option>is</option>
                  <option>is in</option>
                  <option>&gt;</option>
                  <option>is not</option>
                </select>
                <input className={`${inputClass} bg-white`} defaultValue={rule.value} />
                <button className="flex h-[38px] w-full items-center justify-center rounded-md border border-gray-200 bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-700 sm:col-start-2 xl:col-start-auto xl:w-8 xl:border-0 xl:bg-transparent">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button className="mt-4 inline-flex min-h-[38px] items-center gap-2 rounded-md border border-blue-100 bg-white px-3 text-sm font-bold text-blue-600 hover:bg-blue-50">
            <Plus className="h-4 w-4" />
            Add condition
          </button>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
          <Typography variant="h3" className="text-base font-bold text-gray-900">
            Exclusions & Overrides
          </Typography>
          <Typography variant="bodyMedium" className="mt-1 text-sm font-normal text-gray-500">
            People matching the rules above who should NOT participate
          </Typography>

          <div className="mt-4 space-y-3">
            {exclusions.map((item) => (
              <label
                key={item.label}
                className="flex min-h-[42px] flex-col items-start justify-between gap-2 rounded-md bg-gray-50 px-3 py-3 text-sm text-gray-700 sm:flex-row sm:items-center"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedExclusions[item.label]}
                    onChange={(event) =>
                      setSelectedExclusions((current) => ({
                        ...current,
                        [item.label]: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 accent-blue-500"
                  />
                  <span className="min-w-0 break-words">{item.label}</span>
                </span>
                <span className="pl-7 text-xs font-semibold text-gray-500 sm:pl-0">
                  {item.count}
                </span>
              </label>
            ))}
          </div>

          <button className="mt-4 min-h-[36px] rounded-md border border-gray-200 bg-white px-3 text-sm font-bold text-gray-700">
            + Add individual override
          </button>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Typography variant="h3" className="text-base font-bold text-gray-900">
              Sample matching employees
            </Typography>
            <button className="self-start text-sm font-bold text-blue-600 sm:self-auto">
              View all 2,140 →
            </button>
          </div>
          <div className="mt-4 overflow-hidden rounded-lg border border-gray-100">
            {employees.map((employee) => (
              <div
                key={employee.name}
                className="grid grid-cols-1 gap-1 border-b border-gray-100 px-3 py-3 text-sm last:border-b-0 sm:grid-cols-2 md:grid-cols-[1fr_130px_130px_100px]"
              >
                <span className="font-bold text-gray-900">{employee.name}</span>
                <span className="text-gray-500">{employee.team}</span>
                <span className="text-gray-500">{employee.location}</span>
                <span className="text-gray-500">{employee.type}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="min-w-0 space-y-4">
        <section className="overflow-hidden rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 p-4 text-white shadow-sm sm:p-5">
          <Typography
            variant="caption"
            className="block font-bold uppercase tracking-wider text-white"
          >
            Matching employees
          </Typography>
          <div className="mt-2 text-5xl font-bold leading-none sm:text-6xl">2,140</div>
          <Typography variant="bodyMedium" className="mt-2 text-sm font-semibold text-blue-50">
            ↑ 86 since you last viewed
          </Typography>
          <div className="mt-5 grid grid-cols-1 gap-3 rounded-lg bg-white/15 p-3 min-[380px]:grid-cols-2 sm:mt-6">
            <div>
              <div className="text-xl font-bold">2,183</div>
              <div className="text-xs font-semibold text-blue-50">Matched rule</div>
            </div>
            <div>
              <div className="text-xl font-bold">43</div>
              <div className="text-xs font-semibold text-blue-50">Excluded</div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <Typography
            variant="caption"
            className="mb-4 block font-bold uppercase tracking-wider text-gray-500"
          >
            Breakdown
          </Typography>
          <div className="space-y-3">
            {breakdown.map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs font-semibold text-gray-600">
                  <span>{item.label}</span>
                  <span>
                    {item.value} · {item.percent}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-md bg-gray-100">
                  <div
                    className="h-full rounded-md bg-blue-500"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </WizardShell>
  );
};

export default Eligibility;
