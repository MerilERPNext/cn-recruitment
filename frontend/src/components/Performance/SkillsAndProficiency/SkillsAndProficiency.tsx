import React, { useMemo, useState } from "react";
import { ChevronRight, Download, Loader2, Plus, SquareCheck, TrendingUp } from "lucide-react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import Badge from "../../shared/Badge";
import { Typography } from "../../shared/atoms/Typography";
import EditSkillPopup from "./EditSkillPopup";
import { categories, levelLabels, PROJECT_TONES } from "../mockdata";
import type { Skill, MetricCard, ProjectTone } from "../types";
import { useSkillsOverview } from "../../../hooks/useSkills";
import type { SkillsOverviewData, SkillsChip, SkillsRadarItem, SkillsFocusArea } from "../../../types/skills";

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

/** Build the four metric cards from live API data. */
const buildMetricCards = (data: SkillsOverviewData): MetricCard[] => [
  {
    label: "Avg current proficiency",
    value: `${data.avg_current ?? 0}`,
    helper: `of ${data.max_level ?? 5}.0 · ${data.avg_current_label ?? "N/A"}`,
    tone: "info" as ProjectTone,
  },
  {
    label: "Avg target proficiency",
    value: `${data.avg_target ?? 0}`,
    helper: `gap of ${data.avg_gap ?? 0} levels`,
    tone: "info" as ProjectTone,
  },
  {
    label: "Focus skills",
    value: `${data.focus_count ?? 0}`,
    helper: "marked as growth priority",
    tone: "info" as ProjectTone,
  },
  {
    label: "Critical gaps",
    value: `${data.critical_gap_count ?? 0}`,
    helper: "skills with gap ≥ 2 levels",
    tone: "info" as ProjectTone,
  },
];



const SkillsAndProficiency: React.FC = () => {
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const { data: overviewResponse, isLoading, isError } = useSkillsOverview();

  const overview: SkillsOverviewData | undefined = overviewResponse?.data;
  const chips: SkillsChip[] = overview?.chips ?? [];
  const radarItems: SkillsRadarItem[] = overview?.radar ?? [];
  const focusAreas: SkillsFocusArea[] = overview?.focus_areas ?? [];
  const metricCards: MetricCard[] = overview ? buildMetricCards(overview) : [];

  const maxLevel = overview?.max_level ?? 5;

  const radarChartOptions = useMemo<ApexOptions>(() => ({
    chart: {
      type: "radar",
      toolbar: { show: false },
      dropShadow: { enabled: false },
    },
    colors: ["#0EA5E9", "#6172F3"],
    stroke: { width: 2 },
    fill: {
      opacity: [0.25, 0.08],
    },
    markers: { size: 3, strokeWidth: 0 },
    xaxis: {
      categories: radarItems.map((r) => r.label),
      labels: {
        style: {
          fontSize: "11px",
          fontWeight: 500,
          colors: Array(radarItems.length).fill("#374151"),
        },
      },
    },
    yaxis: {
      show: false,
      max: maxLevel,
      min: 0,
      tickAmount: maxLevel,
    },
    legend: {
      show: true,
      position: "bottom",
      fontSize: "12px",
      fontWeight: 500,
      labels: { colors: "#6B7280" },
      markers: { size: 6, shape: "circle" as const },
      itemMargin: { horizontal: 12 },
    },
    tooltip: {
      enabled: true,
      y: { formatter: (val: number) => `Level ${val} / ${maxLevel}` },
    },
    plotOptions: {
      radar: {
        size: 80,
        polygons: {
          strokeColors: "#C7D7FE",
          connectorColors: "#C7D7FE",
          fill: { colors: ["#f8fafc", "#ffffff"] },
        },
      },
    },
  }), [radarItems, maxLevel]);

  const radarChartSeries = useMemo(() => [
    { name: "Current", data: radarItems.map((r) => r.current) },
    { name: "Target", data: radarItems.map((r) => r.target) },
  ], [radarItems]);

  return (
    <div className="min-h-full overflow-y-auto bg-surface p-3 font-brand text-text-title sm:p-2 lg:p-1">
      <div className="mx-auto max-w-screen space-y-4 lg:space-y-5">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center rounded-lg border border-primary-100 bg-white p-10 shadow-sm">
            <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
            <Typography variant="bodySmall" className="ml-3 text-text-body2">Loading skills overview…</Typography>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="rounded-lg border border-error-200 bg-error-50 p-5 text-center shadow-sm">
            <Typography variant="bodySmall" className="text-error-700">
              Unable to load skills overview. Please try again later.
            </Typography>
          </div>
        )}

        {/* Header card — driven by API data */}
        {!isLoading && !isError && (
          <div className="rounded-lg border border-primary-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <Typography variant="h3" className="text-xl leading-tight text-text-title sm:text-2xl">
                  {overview?.total_skills ?? 0} tracked skills across {overview?.category_count ?? 0} categories
                </Typography>
                <Typography variant="bodySmall" className="mt-1 text-text-body2">
                  Last full re-assessment: {overview?.last_assessed ?? "N/A"} · Next due: {overview?.next_due ?? "N/A"}
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
        )}

        {/* Metric cards — built from API response */}
        {!isLoading && !isError && metricCards.length > 0 && (
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
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="overflow-hidden rounded-lg border border-primary-100 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-primary-100 p-4 lg:flex-row lg:items-center">
              <Typography variant="bodyMedium" className="shrink-0 whitespace-nowrap font-bold text-text-title">
                My Skills
              </Typography>
              <div className="ml-auto flex gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible lg:pb-0">
                {chips.map((chip) => (
                  <div key={chip.key} className="shrink-0">
                    <Badge
                      label={`${chip.label} (${chip.count})`}
                      backgroundColor={PROJECT_TONES.info.badgeBg}
                      textColor={PROJECT_TONES.info.badgeText}
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
              {radarItems.length > 0 ? (
                <div className="mx-auto mt-2 w-full max-w-[280px]">
                  <Chart
                    type="radar"
                    height={260}
                    options={radarChartOptions}
                    series={radarChartSeries}
                  />
                </div>
              ) : (
                <Typography variant="caption" className="mt-4 block text-center text-text-body2">
                  No category data available.
                </Typography>
              )}
            </div>

            <div className="rounded-lg border border-primary-100 bg-white p-4 shadow-sm sm:p-5">
              <Typography variant="bodyMedium" className="font-bold text-text-title">
                Focus areas
              </Typography>
              <div className="mt-4 space-y-3">
                {focusAreas.length > 0 ? (
                  focusAreas.map((area) => (
                    <div key={area.skill} className="flex items-center gap-3 rounded-lg border border-warning-200 bg-warning-50 p-3">
                      <SquareCheck className="h-4 w-4 shrink-0 text-warning-600" />
                      <div>
                        <Typography variant="bodySmall" className="font-semibold text-text-title">
                          {area.skill}
                        </Typography>
                        <Typography variant="caption" className="text-text-body2">
                          {area.category} · gap {area.gap ?? 0} levels
                        </Typography>
                      </div>
                    </div>
                  ))
                ) : (
                  <Typography variant="caption" className="text-text-body2">
                    No focus areas defined yet.
                  </Typography>
                )}
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
