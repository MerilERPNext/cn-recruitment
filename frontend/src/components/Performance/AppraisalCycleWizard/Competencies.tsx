import clsx from "clsx";
import { Check } from "lucide-react";
import { useState } from "react";
import { Typography } from "../../shared/atoms/Typography";

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

  return (
    <>
      {/* Left Column: Frameworks */}
      <aside className="w-full lg:w-[240px] shrink-0 flex flex-col gap-4">
        <div className="flex flex-col bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border">
            <Typography
              variant="bodyMedium"
              className="font-bold text-text-title"
            >
              Frameworks
            </Typography>
            <Typography variant="caption" color="body2">
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
                  "p-4 cursor-pointer transition-colors border-l-2 w-full text-left focus:outline-none focus:ring-1 focus:ring-primary",
                  activeFramework === fw.id
                    ? "border-primary bg-primary/10"
                    : "border-transparent bg-card hover:bg-slate-500/10",
                )}
              >
                <Typography
                  variant="bodyMedium"
                  className="font-bold text-text-title block mb-0.5"
                >
                  {fw.name}
                </Typography>
                <Typography variant="caption" color="body2">
                  {fw.count} competencies
                </Typography>
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-border">
            <button className="w-full rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-slate-500/10 cursor-pointer">
              + New framework
            </button>
          </div>
        </div>
      </aside>

      {/* Center Column: Competency Mapping */}
      <section className="flex-1 flex flex-col min-w-0">
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col h-full">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Typography variant="h4" className="font-bold text-text-title">
                PW Design
              </Typography>
              <Typography variant="bodyMedium" color="body2">
                8 competencies × 5 levels = 40 anchor descriptors
              </Typography>
            </div>
            <button className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-text-title shadow-sm transition hover:bg-slate-500/10 whitespace-nowrap cursor-pointer">
              + Add competency
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-4 text-[10px] font-bold text-text-body2 uppercase tracking-widest w-1/3">
                    Competency
                  </th>
                  <th className="px-2 py-4 text-[10px] font-bold text-text-body2 uppercase tracking-widest text-center">
                    <div className="flex justify-center gap-3 sm:gap-4">
                      {levels.map((l) => (
                        <span key={l}>{l}</span>
                      ))}
                    </div>
                  </th>
                  <th className="px-5 py-4 text-[10px] font-bold text-text-body2 uppercase tracking-widest text-right">
                    Weight
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {competencies.map((comp) => (
                  <tr
                    key={comp.id}
                    className="hover:bg-slate-500/10 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <Typography
                        variant="bodyMedium"
                        className="font-bold text-text-title"
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
                                  ? "bg-primary text-white shadow-sm ring-2 ring-primary/30 ring-offset-1"
                                  : isBlueCheck
                                    ? "bg-primary/20 text-primary"
                                    : "bg-slate-500/20 text-text-body2",
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
                        className="font-bold text-text-title"
                      >
                        {comp.weight}
                      </Typography>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-slate-500/10">
                  <td
                    className="px-5 py-4 font-bold text-text-title text-sm"
                    colSpan={2}
                  >
                    Total weight
                  </td>
                  <td className="px-5 py-4 text-right flex items-center justify-end gap-1 text-emerald-500 font-bold text-sm">
                    100% <Check className="h-4 w-4" />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Anchor Preview Box */}
          <div className="p-5 sm:p-6 bg-card border-t border-border">
            <Typography
              variant="caption"
              color="body2"
              className="font-bold uppercase tracking-widest block mb-3"
            >
              Behavioural Anchor - Design Craft × Senior
            </Typography>
            <div className="rounded-lg bg-slate-500/10 border border-border p-4">
              <Typography
                variant="bodyMedium"
                color="body2"
                className="italic leading-relaxed"
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
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-5 shadow-sm">
          <Typography
            variant="bodyMedium"
            className="font-bold text-purple-400 block mb-1"
          >
            Specialist toggle
          </Typography>
          <Typography
            variant="caption"
            className="text-purple-300 leading-relaxed block"
          >
            For specialist competencies (e.g. "Accessibility"), reviewers from
            outside the function are not asked to rate.
          </Typography>
        </div>

        {/* Mapping Info */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <Typography
            variant="caption"
            color="body2"
            className="font-bold uppercase tracking-widest block mb-4"
          >
            Mapping
          </Typography>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-start gap-2">
              <span className="text-sm text-text-body2">Role</span>
              <span className="text-sm font-semibold text-text-title text-right">
                Sr. Product Designer
              </span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-sm text-text-body2">Grade</span>
              <span className="text-sm font-semibold text-text-title text-right">
                L3 / L4
              </span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-sm text-text-body2">Function</span>
              <span className="text-sm font-semibold text-text-title text-right">
                Design
              </span>   
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-sm text-text-body2">BU</span>
              <span className="text-sm font-semibold text-text-title text-right">
                All India BUs
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Competencies;
