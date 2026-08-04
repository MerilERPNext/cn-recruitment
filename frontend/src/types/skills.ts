// ─────────────────────────────────────────────
// Skills Overview API Types
// API: cn_pms.cn_performance_management.api.skills_api.get_skills_overview
// ─────────────────────────────────────────────

/** A category filter chip shown in the skills tab. */
export interface SkillsChip {
  key: string;
  label: string;
  count: number;
}

/** A single data-point on the radar / spider chart. */
export interface SkillsRadarItem {
  category: string;
  label: string;
  current: number;
  target: number;
}

/** A skill that has been flagged as a focus area. */
export interface SkillsFocusArea {
  skill: string;
  category: string;
  current: number;
  target: number;
  gap: number;
}

/** The core `data` payload returned by `get_skills_overview`. */
export interface SkillsOverviewData {
  employee: string;
  total_skills: number;
  category_count: number;
  last_assessed: string | null;
  next_due: string | null;
  max_level: number;
  avg_current: number;
  avg_current_label: string | null;
  avg_target: number;
  avg_gap: number;
  focus_count: number;
  critical_gap_count: number;
  chips: SkillsChip[];
  radar: SkillsRadarItem[];
  focus_areas: SkillsFocusArea[];
}

/**
 * The full shape returned by `FrappeAPI.getMethod()` after
 * Axios unwraps `response.data.message`.
 */
export interface SkillsOverviewResponse {
  success: boolean;
  message: string;
  data: SkillsOverviewData;
}
