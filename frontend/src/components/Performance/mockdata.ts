import { BookOpen, Sparkles, UserRound } from "lucide-react";
import type {
  Category,
  CategoryFilter,
  LearningPlanItem,
  MetricCard,
  ProficiencyLevel,
  ProjectTone,
  ProjectToneClasses,
  SkillsLibraryItem,
} from "./types";

export const PROJECT_TONES: Record<ProjectTone, ProjectToneClasses> = {
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

export const categories: Category[] = [
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

export const categoryFilters: CategoryFilter[] = [
  { label: "All (16)", tone: "info" },
  ...categories.map(({ name, count, tone }) => ({ label: `${name} (${count})`, tone })),
  { label: "Soft Skills (3)", tone: "warning" },
  { label: "Tools (3)", tone: "error" },
];

export const metricCards: MetricCard[] = [
  { label: "Avg current proficiency", value: "3.1", helper: "of 5.0 · Intermediate", tone: "info" },
  { label: "Avg target proficiency", value: "4.1", helper: "gap of 0.9 levels", tone: "primary" },
  { label: "Focus skills (FY26)", value: "3", helper: "marked as growth priority", tone: "warning" },
  { label: "Critical gaps", value: "4", helper: "skills with gap ≥ 2 levels", tone: "error" },
];

export const focusAreas = ["User Research", "Accessibility (WCAG 2.2)", "ProtoPie"];

export const levelLabels = ["L1", "L2", "L3", "L4", "L5"];

export const skillsLibrary: SkillsLibraryItem[] = [
  { name: "User Research", hot: true },
  { name: "Usability Testing", featured: true },
  { name: "Survey Design" },
  { name: "Quant Research" },
  { name: "Generative Research", hot: true },
  { name: "Diary Studies" },
  { name: "Card Sorting" },
  { name: "A/B Testing & Experimentation", hot: true },
];

export const proficiencyLevels: ProficiencyLevel[] = [
  { level: 1, label: "Novice", description: "Aware of the concept. Needs heavy guidance. Can't deliver independently." },
  { level: 2, label: "Beginner", description: "Performs basic tasks with supervision. Recognises common patterns." },
  { level: 3, label: "Intermediate", description: "Independent on standard work. Asks for help on ambiguous problems." },
  { level: 4, label: "Advanced", description: "Can teach others. Handles complex cases. Mentors mid-level peers." },
  { level: 5, label: "Expert", description: "Industry-level authority. Sets the standard for the team / function." },
];

export const learningPlan: LearningPlanItem[] = [
  { icon: UserRound, title: "Riya Banerjee - weekly research craft 1:1", action: "Mentor" },
  { icon: Sparkles, title: "Just Enough Research - Erika Hall", action: "Book - LMS" },
  { icon: BookOpen, title: "Shadow 4 usability sessions this quarter", action: "Action" },
];
