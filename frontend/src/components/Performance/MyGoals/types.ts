export type GoalStatus = 'On-track' | 'At-risk' | 'Off-track';

export interface GoalKeyResult {
  id: string;
  title: string;
  percentage: number;
}

export interface Goal {
  type: string;
  label: string;
  title: string;
  subtitle: string;
  current: number;
  target: number;
  unit: string;
  percentage: number;
  weight: number;
  status: GoalStatus;
  state: string;
  barColor: string;
  krs?: GoalKeyResult[];
}
