import React, { useState } from "react";
import { ChevronRight, Download, Plus, Sparkles, TrendingUp } from "lucide-react";
import Badge from "../../shared/Badge";
import { Typography } from "../../shared/atoms/Typography";
import EditSkillPopup from "./EditSkillPopup";

type ProjectTone = "primary" | "secondary" | "success" | "warning" | "error" | "info";

interface Skill {
  name: string;
  lastAssessed: string;
  mentor: string;
  current: number;
  target: number;
  delta: string;
  growth?: boolean;
  focus?: boolean;
}

interface Category {
  name: string;
  count: number;
  tone: ProjectTone;
  skills: Skill[];
}

const PROJECT_TONES: Record<ProjectTone, { accent: string; badgeBg: string; badgeText: string; bar: string; soft: string }> = {
  primary: {
    accent: "bg-primary-500",
    badgeBg: "bg-primary-50 border border-primary-100",
    badgeText: "text-primary-700",
    bar: "bg-primary-500",
    soft: "bg-primary-50 text-primary-700",
  },
  secondary: {
    accent: "bg-secondary-500",
    badgeBg: "bg-secondary-50 border border-secondary-100",
    badgeText: "text-secondary-700",
    bar: "bg-secondary-500",
    soft: "bg-secondary-50 text-secondary-700",
  },
  success: {
    accent: "bg-success-600",
    badgeBg: "bg-success-50 border border-success-100",
    badgeText: "text-success-800",
    bar: "bg-success-600",
    soft: "bg-success-50 text-success-800",
  },
  warning: {
    accent: "bg-warning-600",
    badgeBg: "bg-warning-50 border border-warning-100",
    badgeText: "text-warning-800",
    bar: "bg-warning-600",
    soft: "bg-warning-50 text-warning-800",
  },
  error: {
    accent: "bg-error-600",
    badgeBg: "bg-error-50 border border-error-100",
    badgeText: "text-error-800",
    bar: "bg-error-600",
    soft: "bg-error-50 text-error-800",
  },
  info: {
    accent: "bg-info-600",
    badgeBg: "bg-info-50 border border-info-100",
    badgeText: "text-info-800",
    bar: "bg-info-600",
    soft: "bg-info-50 text-info-800",
  },
};

const categories: Category[] = [
  {
    name: "Design Craft",
    count: 3,
    tone: "secondary",
    skills: [
      { name: "Visual Design", lastAssessed: "Apr 2026", mentor: "Aditi Sharma", current: 4, target: 5, delta: "+1 lvl", growth: true },
      { name: "Interaction Design", lastAssessed: "Apr 2026", mentor: "Aditi Sharma", current: 4, target: 4, delta: "Met" },
      { name: "Prototyping", lastAssessed: "Apr 2026", mentor: "Aditi Sharma", current: 5, target: 5, delta: "Met" },
    ],
  },
  {
    name: "Systems & UX",
    count: 2,
    tone: "info",
    skills: [
      { name: "Design Systems", lastAssessed: "Mar 2026", mentor: "Karthik Iyer", current: 4, target: 5, delta: "+1 lvl", growth: true },
      { name: "Information Architecture", lastAssessed: "Mar 2026", mentor: "Karthik Iyer", current: 3, target: 4, delta: "+1 lvl" },
    ],
  },
  {
    name: "Research & Insight",
    count: 2,
    tone: "success",
    skills: [
      { name: "User Research", lastAssessed: "Mar 2026", mentor: "Riya Banerjee", current: 2, target: 4, delta: "+2 lvls", growth: true, focus: true },
      { name: "Usability Testing", lastAssessed: "Mar 2026", mentor: "Riya Banerjee", current: 3, target: 4, delta: "+1 lvl" },
    ],
  },
  {
    name: "Technical",
    count: 3,
    tone: "primary",
    skills: [
      { name: "Analytics Instrumentation", lastAssessed: "Feb 2026", mentor: "Devansh Rao", current: 3, target: 4, delta: "+1 lvl" },
      { name: "Experiment Design", lastAssessed: "Feb 2026", mentor: "Devansh Rao", current: 3, target: 4, delta: "+1 lvl" },
      { name: "Accessibility", lastAssessed: "Feb 2026", mentor: "Neha Sinha", current: 2, target: 4, delta: "+2 lvls", focus: true },
    ],
  },
];

const categoryFilters = [
  { label: "All (16)", tone: "info" as ProjectTone },
  ...categories.map(({ name, count, tone }) => ({ label: `${name} (${count})`, tone })),
  { label: "Soft Skills (3)", tone: "warning" as ProjectTone },
  { label: "Tools (3)", tone: "error" as ProjectTone },
];

const metricCards = [
  { label: "Avg current proficiency", value: "3.1", helper: "of 5.0 · Intermediate", tone: "info" as ProjectTone },
  { label: "Avg target proficiency", value: "4.1", helper: "gap of 0.9 levels", tone: "primary" as ProjectTone },
  { label: "Focus skills (FY26)", value: "3", helper: "marked as growth priority", tone: "warning" as ProjectTone },
  { label: "Critical gaps", value: "4", helper: "skills with gap ≥ 2 levels", tone: "error" as ProjectTone },
];

const focusAreas = [
  "User Research",
  "Accessibility (WCAG 2.2)",
  "ProtoPie",
];

const levelLabels = ["L1", "L2", "L3", "L4", "L5"];

const getLevelTone = (level: number) => {
  if (level === 5) return PROJECT_TONES.success.bar;
  if (level === 4) return PROJECT_TONES.primary.bar;
  if (level === 3) return PROJECT_TONES.info.bar;
  if (level === 2) return PROJECT_TONES.warning.bar;
  return "bg-gray-400";
};

const getLevelLabel = (level: number) => {
  if (level >= 5) return "Expert";
  if (level === 4) return "Advanced";
  if (level === 3) return "Intermediate";
  return "Beginner";
};

const SkillsAndProficiency: React.FC = () => {
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const radarRings = [28, 48, 68, 88];
  const radarLabels = ["Design", "Systems", "Research", "Technical", "Soft", "Tools"];
  const radarLabelPositions = [
    "left-[86px] top-0",
    "right-0 top-[50px]",
    "right-0 bottom-[50px]",
    "left-[78px] bottom-0",
    "left-1 bottom-[50px]",
    "left-1 top-[50px]",
  ];

  return (
    <div className="min-h-full overflow-y-auto bg-surface p-4 font-brand text-text-title lg:p-6">
      <div className="mx-auto max-w-screen space-y-5">
        <div className="rounded-lg border border-primary-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
            
              <Typography variant="h3" className="text-text-title">
                16 tracked skills across 6 categories
              </Typography>
              <Typography variant="bodySmall" className="mt-1 text-text-body2">
                Last full re-assessment: Apr 2026 · Next due: Jul 2026
              </Typography>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-100 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-primary-50">
                <Download className="h-4 w-4" />
                Export PDF
              </button>
              <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-500 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600">
                <Plus className="h-4 w-4" />
                Add Skill
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-primary-100 bg-white p-5 shadow-sm">
              <Typography variant="caption" className="uppercase tracking-wide text-text-body2">
                {metric.label}
              </Typography>
              <div className={`mt-2 text-3xl font-bold ${PROJECT_TONES[metric.tone].badgeText}`}>{metric.value}</div>
              <Typography variant="caption" className="mt-1 block text-text-body2">
                {metric.helper}
              </Typography>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="overflow-hidden rounded-lg border border-primary-100 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-primary-100 p-4 lg:flex-row lg:items-center lg:justify-between">
              <Typography variant="bodyMedium" className="font-bold text-text-title">
                My Skills
              </Typography>
              <div className="flex flex-wrap gap-2">
                {categoryFilters.map((filter) => (
                  <Badge
                    key={filter.label}
                    label={filter.label}
                    backgroundColor={PROJECT_TONES[filter.tone].badgeBg}
                    textColor={PROJECT_TONES[filter.tone].badgeText}
                    size="sm"
                  />
                ))}
              </div>
            </div>

            <div className="divide-y divide-gray-50">
              {categories.map((category) => (
                <div key={category.name}>
                  <div className="flex items-center gap-3 bg-primary-50/60 px-4 py-3">
                    <div className={`h-7 w-1.5 rounded-md ${PROJECT_TONES[category.tone].accent}`} />
                    <Typography variant="bodySmall" className="font-bold text-text-title">
                      {category.name}
                    </Typography>
                    <Typography variant="caption" className="text-text-body2">
                      {category.count} skills
                    </Typography>
                  </div>

                  {category.skills.map((skill) => (
                    <div key={skill.name} className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(190px,1fr)_230px_72px_96px_20px_96px_32px] lg:items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <Typography variant="bodySmall" className="font-semibold text-text-title">
                            {skill.name}
                          </Typography>
                          {skill.growth && <TrendingUp className="h-3.5 w-3.5 text-success-600" />}
                          {skill.focus && (
                            <Badge label="FY26 focus" backgroundColor="bg-warning-50 border border-warning-100" textColor="text-warning-800" size="sm" />
                          )}
                        </div>
                        <Typography variant="caption" className="mt-1 block text-text-body2">
                          Last assessed {skill.lastAssessed} · mentor: {skill.mentor}
                        </Typography>
                      </div>

                      <div className="flex min-w-[230px] items-center gap-1.5">
                        {levelLabels.map((label, index) => {
                          const level = index + 1;
                          const isCurrent = level <= skill.current;
                          const isTargetOnly = level > skill.current && level <= skill.target;
                          const levelClass = isCurrent
                            ? `${getLevelTone(level)} text-white`
                            : isTargetOnly
                              ? "border border-dashed border-primary-500 bg-white text-primary-700"
                              : "bg-gray-100 text-gray-500";

                          return (
                            <div
                              key={label}
                              className={`flex h-6 w-12 items-center justify-center rounded text-[11px] font-semibold ${levelClass}`}
                            >
                              {label}
                            </div>
                          );
                        })}
                      </div>

                      <Badge
                        label={skill.delta}
                        backgroundColor={skill.delta === "Met" ? "bg-success-50 border border-success-100" : "bg-warning-50 border border-warning-100"}
                        textColor={skill.delta === "Met" ? "text-success-800" : "text-warning-800"}
                        size="sm"
                      />

                      <div
                        className={`min-w-[96px] rounded-md px-3 py-1.5 text-center text-[11px] font-semibold ${
                          PROJECT_TONES[skill.current >= 5 ? "success" : skill.current >= 4 ? "primary" : "info"].soft
                        }`}
                      >
                        L{skill.current} · {getLevelLabel(skill.current)}
                      </div>
                      <span className=" text-center text-text-body2 lg:block">→</span>
                      <div
                        className={`min-w-[96px] rounded-md px-3 py-1.5 text-center text-[11px] font-semibold ${
                          PROJECT_TONES[skill.target >= 5 ? "success" : "primary"].soft
                        }`}
                      >
                        L{skill.target} · {getLevelLabel(skill.target)}
                      </div>

                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-100 text-gray-500 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                        onClick={() => setSelectedSkill(skill)}
                        aria-label={`Edit ${skill.name}`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-lg border border-primary-100 bg-white p-5 shadow-sm">
              <Typography variant="bodyMedium" className="font-bold text-text-title">
                Proficiency by category
              </Typography>
              <Typography variant="caption" className="mt-1 block text-text-body2">
                Current (filled) vs Target (outline)
              </Typography>
              <div className="relative mx-auto h-48 w-48">
                <svg viewBox="0 0 200 200" className="h-full w-full">
                  {radarRings.map((size) => (
                    <polygon
                      key={size}
                      points={`100,${100 - size} ${100 + size * 0.86},${100 - size / 2} ${100 + size * 0.86},${100 + size / 2} 100,${100 + size} ${100 - size * 0.86},${100 + size / 2} ${100 - size * 0.86},${100 - size / 2}`}
                      fill="none"
                      stroke="#C7D7FE"
                      strokeWidth="1"
                    />
                  ))}
                  <polygon points="100,16 173,58 173,142 100,184 27,142 27,58" fill="#EEF4FF" stroke="#6172F3" strokeDasharray="4 4" strokeWidth="2" />
                  <polygon points="100,34 159,68 145,134 100,152 43,137 57,70" fill="#0EA5E9" fillOpacity="0.26" stroke="#0EA5E9" strokeWidth="4" />
                </svg>
                {radarLabels.map((label, index) => (
                  <div key={label} className={`absolute text-[10px] font-medium text-gray-700 ${radarLabelPositions[index]}`}>
                    {label}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-center gap-5 text-xs text-text-body2">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-info-50 ring-1 ring-info-200" />
                  Current
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm border border-dashed border-primary-500" />
                  Target
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-primary-100 bg-white p-5 shadow-sm">
              <Typography variant="bodyMedium" className="font-bold text-text-title">
                Focus areas · FY26
              </Typography>
              <div className="mt-4 space-y-3">
                {focusAreas.map((area) => (
                  <div key={area} className="flex items-center gap-3 rounded-lg border border-warning-200 bg-warning-50 p-3">
                    <Sparkles className="h-4 w-4 shrink-0 text-warning-600" />
                    <div>
                      <Typography variant="bodySmall" className="font-semibold text-text-title">
                        {area}
                      </Typography>
                      <Typography variant="caption" className="text-text-body2">
                        Beginner → Advanced
                      </Typography>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-secondary-100 bg-secondary-50 p-5">
              <Typography variant="bodyMedium" className="font-bold text-secondary-800">
                Independent track
              </Typography>
              <Typography variant="caption" className="mt-2 block leading-5 text-gray-700">
                Skills are tracked separately from Goals and Competencies during quarterly check-ins. They feed development planning, not the final rating.
              </Typography>
            </div>
          </div>
        </div>
      </div>

      {selectedSkill ? <EditSkillPopup skill={selectedSkill} onClose={() => setSelectedSkill(null)} /> : null}
    </div>
  );
};

export default SkillsAndProficiency;
