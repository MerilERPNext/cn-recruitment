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
  nomination_start_date?: string;
  nomination_end_date?: string;
  voting_start_date?: string;
  voting_end_date?: string;
  current_phase?: string;
  overall_progress?: number;
  nominate_upto?: number | null;
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

export interface NomineeForVoting {
  nomination_name: string;
  employee: string;
  employee_name: string;
  designation: string;
  department: string;
  image: string;
  votes_received: number;
  already_voted: boolean;
}

export interface ProgramInteractionContext {
  success: boolean;
  award: {
    name: string;
    award_name: string;
    description: string;
    icon?: string;
    color?: string;
    nomination_start_date?: string;
    nomination_end_date?: string;
    voting_start_date?: string;
    voting_end_date?: string;
    nomination_form?: string;
  };
  nomination_open: boolean;
  voting_open: boolean;
  can_nominate: boolean;
  can_vote: boolean;
  form_schema: any | null;
  nominees_for_voting: NomineeForVoting[];
  my_nominations_count: number;
}

export interface MyNominationActivity {
  nomination_name: string;
  award: string;
  award_name: string;
  icon?: string;
  color?: string;
  status: string;
  votes_received: number;
}

export interface MySubmittedNomination {
  nomination_name: string;
  award_name: string;
  nominee_name: string;
  status: string;
}

export interface PendingVoteProgram {
  award: string;
  award_name: string;
  icon?: string;
  color?: string;
  unvoted_count: number;
}

export interface MyRecognitionActivity {
  success: boolean;
  nominated_for: MyNominationActivity[];
  my_nominations: MySubmittedNomination[];
  pending_votes: PendingVoteProgram[];
}
