import type { ElementType } from 'react';

export interface GoalItem {
  id: string;
  type: string;
  typeBgColor: string;
  typeTextColor: string;
  title: string;
  weightage: string;
  category: string;
  progressText: string;
  progressPercentage: number;
  progressColor: string;
  status: string;
  statusBgColor: string;
  statusTextColor: string;
  statusPulse: string;
}

export interface StatItem {
  id: string;
  title: string;
  icon: ElementType;
  iconBgColor: string;
  iconTextColor: string;
  value: string;
  subtitle: string;
}

export interface TaskItem {
  id: string;
  title: string;
  dueDate: string;
  icon: ElementType;
  iconBgColor: string;
  iconTextColor: string;
  buttonText: string;
}

export interface FeedbackItem {
  id: string;
  authorInitials: string;
  authorName: string;
  authorRole: string;
  type: string;
  typeBgColor: string;
  typeTextColor: string;
  quote?: string;
}
