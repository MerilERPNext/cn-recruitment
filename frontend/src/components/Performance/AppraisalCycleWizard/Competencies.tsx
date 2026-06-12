import clsx from "clsx";
import { Check } from "lucide-react";
import { useState } from "react";
import { Typography } from "../../shared/atoms/Typography";
import { mockWizardData } from "./AppraisalCycleWizard";
import WizardShell from "./WizardShell";

const frameworks = [
  { id: "pw-eng", name: "PW Engineering", count: 12 },
  { id: "pw-design", name: "PW Design", count: 8 },
  { id: "pw-product", name: "PW Product", count: 10 },
  { id: "pw-people", name: "PW People Manager", count: 14 },
];

const competencies = [
  { id: "design-craft", name: "Design Craft", weight: "15%" },
  { id: "systems-thinking", name: "Systems Thinking", weight: "12%" },
  {
    id: "cross-functional",
    name: "Cross-functional Partnership",
    weight: "12%",
  },
  { id: "communication", name: "Communication", weight: "10%" },
  { id: "leadership", name: "Leadership & Mentorship", weight: "12%" },
  { id: "technical-excellence", name: "Technical Excellence", weight: "15%" },
  { id: "ownership", name: "Ownership & Outcomes", weight: "14%" },
  { id: "learners-mindset", name: "Learner's Mindset", weight: "10%" },
];

const levels = ["JUNIOR", "MID", "SENIOR", "LEAD", "MANAGER"];

const Competencies = () => {
  const [activeFramework, setActiveFramework] = useState("pw-design");

  // Hardcoded to match the visual mock where Design Craft x Senior is selected
  const activeCompetency = "design-craft";
  const activeLevel = "SENIOR";

  const competenciesData = {
    ...mockWizardData,
    activeStepId: "competencies",
    header: {
      title: "Competencies",
      description:
        "Map competencies to roles & grades. Behavioural anchors visible per Leapsome pattern.",
    },
    validationStatus: "Validation passed",
    nextStepLabel: "Next: Workflow",
  };

  return (
    <WizardShell
      data={competenciesData}
      contentClassName="flex flex-col lg:flex-row gap-6 pb-8"
    >
      {/* Left Column: Frameworks */}
      <aside className="w-full lg:w-[240px] shrink-0 flex flex-col gap-4">
        <div className="flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <Typography
              variant="bodyMedium"
              className="font-bold text-gray-900"
            >
              Frameworks
            </Typography>
            <Typography variant="caption" className="text-gray-500">
              3 published
            </Typography>
          </div>

          <div className="flex flex-col">
            {frameworks.map((fw) => (
              <button
                key={fw.id}
                type="button"
                onClick={() => setActiveFramework(fw.id)}
                className={clsx(
                  "p-4 cursor-pointer transition-colors border-l-2 w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset",
                  activeFramework === fw.id
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-transparent bg-white hover:bg-gray-50",
                )}
              >
                <Typography
                  variant="bodyMedium"
                  className="font-bold text-gray-900 block mb-0.5"
                >
                  {fw.name}
                </Typography>
                <Typography variant="caption" className="text-gray-500">
                  {fw.count} competencies
                </Typography>
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-gray-100">
            <button className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow-sm transition hover:bg-gray-50">
              + New framework
            </button>
          </div>
        </div>
      </aside>

      {/* Center Column: Competency Mapping */}
      <section className="flex-1 flex flex-col min-w-0">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Typography variant="h4" className="font-bold text-gray-900">
                PW Design
              </Typography>
              <Typography variant="bodyMedium" className="text-gray-500">
                8 competencies × 5 levels = 40 anchor descriptors
              </Typography>
            </div>
            <button className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 whitespace-nowrap">
              + Add competency
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-1/3">
                    Competency
                  </th>
                  <th className="px-2 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">
                    <div className="flex justify-center gap-3 sm:gap-4">
                      {levels.map((l) => (
                        <span key={l}>{l}</span>
                      ))}
                    </div>
                  </th>
                  <th className="px-5 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">
                    Weight
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {competencies.map((comp) => (
                  <tr
                    key={comp.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <Typography
                        variant="bodyMedium"
                        className="font-bold text-gray-800"
                      >
                        {comp.name}
                      </Typography>
                    </td>
                    <td className="px-2 py-3.5 text-center">
                      <div className="flex justify-center gap-3 sm:gap-4">
                        {levels.map((level, idx) => {
                          const isFocused =
                            comp.id === activeCompetency &&
                            level === activeLevel;
                          // Mimic the image: first 3 are blue-ish, last 2 are gray-ish
                          const isBlueCheck = idx < 3;

                          return (
                            <div
                              key={level}
                              className={clsx(
                                "flex h-5 w-5 items-center justify-center rounded transition-colors",
                                isFocused
                                  ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-100 ring-offset-1"
                                  : isBlueCheck
                                    ? "bg-blue-100 text-blue-500"
                                    : "bg-gray-100 text-gray-300",
                              )}
                            >
                              <Check
                                className="h-3.5 w-3.5"
                                strokeWidth={isFocused ? 3 : 2}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Typography
                        variant="bodyMedium"
                        className="font-bold text-gray-900"
                      >
                        {comp.weight}
                      </Typography>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-100 bg-gray-50/50">
                  <td
                    className="px-5 py-4 font-bold text-gray-800 text-sm"
                    colSpan={2}
                  >
                    Total weight
                  </td>
                  <td className="px-5 py-4 text-right flex items-center justify-end gap-1 text-emerald-600 font-bold text-sm">
                    100% <Check className="h-4 w-4" />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Anchor Preview Box */}
          <div className="p-5 sm:p-6 bg-white border-t border-gray-100">
            <Typography
              variant="caption"
              className="font-bold text-gray-400 uppercase tracking-widest block mb-3"
            >
              Behavioural Anchor - Design Craft × Senior
            </Typography>
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-4">
              <Typography
                variant="bodyMedium"
                className="italic text-gray-600 leading-relaxed"
              >
                "Produces polished, brand-consistent designs across complex
                flows. Sets craft bar for the team. Mentors mid-level designers
                on craft. Owns design QA for a product area."
              </Typography>
            </div>
          </div>
        </div>
      </section>

      {/* Right Column: Context Sidebars */}
      <aside className="w-full lg:w-[260px] xl:w-[280px] shrink-0 flex flex-col gap-4">
        {/* Specialist Toggle Note */}
        <div className="rounded-xl border border-purple-100 bg-purple-50 p-5 shadow-sm">
          <Typography
            variant="bodyMedium"
            className="font-bold text-purple-900 block mb-1"
          >
            Specialist toggle
          </Typography>
          <Typography
            variant="caption"
            className="text-purple-800 leading-relaxed block"
          >
            For specialist competencies (e.g. "Accessibility"), reviewers from
            outside the function are not asked to rate.
          </Typography>
        </div>

        {/* Mapping Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <Typography
            variant="caption"
            className="font-bold text-gray-400 uppercase tracking-widest block mb-4"
          >
            Mapping
          </Typography>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-start gap-2">
              <span className="text-sm text-gray-500">Role</span>
              <span className="text-sm font-semibold text-gray-900 text-right">
                Sr. Product Designer
              </span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-sm text-gray-500">Grade</span>
              <span className="text-sm font-semibold text-gray-900 text-right">
                L3 / L4
              </span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-sm text-gray-500">Function</span>
              <span className="text-sm font-semibold text-gray-900 text-right">
                Design
              </span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-sm text-gray-500">BU</span>
              <span className="text-sm font-semibold text-gray-900 text-right">
                All India BUs
              </span>
            </div>
          </div>
        </div>
      </aside>
    </WizardShell>
  );
};

export default Competencies;
