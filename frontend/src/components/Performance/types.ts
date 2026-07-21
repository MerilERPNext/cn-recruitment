import type { LucideIcon } from "lucide-react";

export type ProjectTone = "primary" | "secondary" | "success" | "warning" | "error" | "info";

export interface Skill {
  name: string;
  lastAssessed: string;
  mentor: string;
  current: number;
  target: number;
  delta: string;
  growth?: boolean;
  focus?: boolean;
}

export interface Category {
  name: string;
  count: number;
  tone: ProjectTone;
  skills: Skill[];
}

export interface ProjectToneClasses {
  accent: string;
  badgeBg: string;
  badgeText: string;
  bar: string;
  soft: string;
}

export interface CategoryFilter {
  label: string;
  tone: ProjectTone;
}

export interface MetricCard {
  label: string;
  value: string;
  helper: string;
  tone: ProjectTone;
}

export interface SkillsLibraryItem {
  name: string;
  hot?: boolean;
  featured?: boolean;
}

export interface ProficiencyLevel {
  level: number;
  label: string;
  description: string;
}

export interface LearningPlanItem {
  icon: LucideIcon;
  title: string;
  action: string;
}
