/* eslint-disable @typescript-eslint/no-explicit-any */
export interface RecognitionProgram {
  id: string;
  name: string;
  code: string;
  description: string;
  icon?: string;
  color?: string;
  start_date: string;
  end_date: string;
  participant_count: number;
  status: string;
  category?: string;
  days_left?: number;
}

export interface LeaderboardEntry {
  employee: string;
  employee_name: string;
  designation?: string;
  department?: string;
  user?: string;
  points: number;
  count: number;
  rank: number;
}

export interface RecognitionMetrics {
  chart_data: {
    month: string;
    month_num: number;
    count: number;
  }[];
  eligible_to_give: {
    percentage: number;
    change: number;
    change_type: "increase" | "decrease";
  };
  avg_recognition: number;
  total_recognitions: number;
  year: number;
}

export interface DepartmentStatus {
  department: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  approval_percentage: number;
}

export interface ProgramWinner {
  id: string;
  employee: string;
  employee_name: string;
  designation?: string;
  department?: string;
  user?: string;
  recognition_type: string;
  recognition_type_name: string;
  badge_name: string;
  icon?: string;
  color?: string;
  awarded_at?: string;
  reason?: string;
}

export interface RecognitionDashboardData {
  active_programs: RecognitionProgram[];
  ongoing_programs: RecognitionProgram[];
  leaderboard: LeaderboardEntry[];
  metrics: RecognitionMetrics;
  department_status: {
    overall_approval_percentage: number;
    total_pending: number;
    departments: DepartmentStatus[];
  };
  winners: ProgramWinner[];
}
