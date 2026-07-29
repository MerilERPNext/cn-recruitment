import React, { useState } from "react";
import { ChevronRight, Download, Plus, Sparkles, TrendingUp } from "lucide-react";
import Badge from "../../shared/Badge";
import { Typography } from "../../shared/atoms/Typography";
import EditSkillPopup from "./EditSkillPopup";
import { categories, categoryFilters, focusAreas, levelLabels, metricCards, PROJECT_TONES } from "../mockdata";
import type { Skill } from "../types";

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
    <div className="min-h-full overflow-y-auto bg-surface p-3 font-brand text-text-title sm:p-2 lg:p-1">
      <div className="mx-auto max-w-screen space-y-4 lg:space-y-5">
        <div className="rounded-lg border border-primary-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
            
              <Typography variant="h3" className="text-xl leading-tight text-text-title sm:text-2xl">
                16 tracked skills across 6 categories
              </Typography>
              <Typography variant="bodySmall" className="mt-1 text-text-body2">
                Last full re-assessment: Apr 2026 · Next due: Jul 2026
              </Typography>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
              <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-100 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-primary-50 sm:px-4" aria-label="Export skills PDF">
                <Download className="h-4 w-4" />
                Export PDF
              </button>
              <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-500 px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 sm:px-4" aria-label="Add skill">
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
              <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible lg:pb-0">
                {categoryFilters.map((filter) => (
                  <div key={filter.label} className="shrink-0">
                    <Badge
                      label={filter.label}
                      backgroundColor={PROJECT_TONES[filter.tone].badgeBg}
                      textColor={PROJECT_TONES[filter.tone].badgeText}
                      size="sm"
                    />
                  </div>
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
                    <div key={skill.name} className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(190px,1fr)_230px_72px_96px_20px_96px_32px] lg:items-center lg:gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
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

                      <div className="grid grid-cols-5 gap-1.5 lg:flex lg:min-w-[230px] lg:items-center">
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
                              className={`flex h-7 min-w-0 items-center justify-center rounded text-[11px] font-semibold lg:h-6 lg:w-12 ${levelClass}`}
                            >
                              {label}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between gap-2 lg:block">
                        <span className="text-xs font-medium text-text-body2 lg:hidden">Gap</span>
                        <Badge
                          label={skill.delta}
                          backgroundColor={skill.delta === "Met" ? "bg-success-50 border border-success-100" : "bg-warning-50 border border-warning-100"}
                          textColor={skill.delta === "Met" ? "text-success-800" : "text-warning-800"}
                          size="sm"
                        />
                      </div>

                      <div className="grid grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)_32px] items-center gap-2 lg:contents">
                        <div
                          className={`rounded-md px-2 py-1.5 text-center text-[11px] font-semibold lg:min-w-[96px] lg:px-3 ${
                            PROJECT_TONES[skill.current >= 5 ? "success" : skill.current >= 4 ? "primary" : "info"].soft
                          }`}
                        >
                          L{skill.current} · {getLevelLabel(skill.current)}
                        </div>
                        <span className="text-center text-text-body2 lg:block">→</span>
                        <div
                          className={`rounded-md px-2 py-1.5 text-center text-[11px] font-semibold lg:min-w-[96px] lg:px-3 ${
                            PROJECT_TONES[skill.target >= 5 ? "success" : "primary"].soft
                          }`}
                        >
                          L{skill.target} · {getLevelLabel(skill.target)}
                        </div>

                        <button
                          aria-label={`Edit ${skill.name}`}
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-100 text-gray-500 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                          onClick={() => setSelectedSkill(skill)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="border-t border-gray-50 p-4">
              <button
                type="button"
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-200 bg-white text-sm font-medium text-primary-700 transition-colors hover:border-primary-200 hover:bg-primary-50"
                aria-label="Add a skill from the library"
              >
                <Plus className="h-4 w-4" />
                Add a skill from the library (200+ available)
              </button>
            </div>
          </div>

          <div className="space-y-4 lg:space-y-5">
            <div className="rounded-lg border border-primary-100 bg-white p-4 shadow-sm sm:p-5">
              <Typography variant="bodyMedium" className="font-bold text-text-title">
                Proficiency by category
              </Typography>
              <Typography variant="caption" className="mt-1 block text-text-body2">
                Current (filled) vs Target (outline)
              </Typography>
              <div className="relative mx-auto h-44 w-44 sm:h-48 sm:w-48">
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

            <div className="rounded-lg border border-primary-100 bg-white p-4 shadow-sm sm:p-5">
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

            <div className="rounded-lg border border-secondary-100 bg-secondary-50 p-4 sm:p-5">
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
