/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FrappeAPI from "../utils/frappeAPI";
import type {
  RecognitionProgram,
  LeaderboardEntry,
  RecognitionMetrics,
  DepartmentStatus,
  ProgramWinner,
  MyRecognitionActivity,
} from "../types/recognition";

const API_BASE = "chatnext_work_connect.chatnext_work_connect.api.recognition";
const BADGE_API_BASE = "chatnext_work_connect.chatnext_work_connect.api.badge";
const NOMINATION_API_BASE = "chatnext_work_connect.chatnext_work_connect.api.nomination";
const WC_SETTINGS_API_BASE = "chatnext_work_connect.chatnext_work_connect.api.work_connect_settings";

// Recognition Type interface
export interface RecognitionType {
  name: string;
  award?: string;
  recognition_type_name: string;
  recognition_type_code: string;
  recognition_category?: string;
  description?: string;
  icon?: string;
  color?: string;
  reward_value?: number;
  points_value?: number;
  is_monetary?: boolean;
  is_badge?: boolean;
  is_certificate?: boolean;
  display_on_profile?: boolean;
  linked_event?: string;
  award_details?: {
    name: string;
    award_name: string;
    award_code: string;
    award_category?: string;
    nomination_form?: string;
    linked_event?: string;
  };
}

// Badge Type interface (for badge-specific API)
export interface BadgeType {
  name: string; // Recognition Type name (for API call)
  recognition_type_name: string; // Display name
  recognition_type_code: string;
  recognition_category?: string;
  description?: string;
  icon?: string;
  color?: string;
}

// Get badge types (recognition types that are badges)
export const useGetBadgeTypes = () => {
  return useQuery<{
    success: boolean;
    badges: BadgeType[];
  }>({
    queryKey: ["recognition", "badge-types"],
    queryFn: async () => {
      const response = await FrappeAPI.callMethod(
        `${BADGE_API_BASE}.get_badge_types`
      );
      return response as {
        success: boolean;
        badges: BadgeType[];
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Get all recognition types
export const useGetRecognitionTypes = (filters?: Record<string, any>) => {
  return useQuery<{
    success: boolean;
    recognition_types: RecognitionType[];
  }>({
    queryKey: ["recognition", "types", filters],
    queryFn: async () => {
      let params: Record<string, any> | undefined = undefined;
      if (filters && Object.keys(filters).length > 0) {
        params = { filters: JSON.stringify(filters) };
      }
      
      const response = await FrappeAPI.callMethod(
        `${API_BASE}.get_recognition_types`,
        params
      );
      return response as {
        success: boolean;
        recognition_types: RecognitionType[];
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Get recognition programs (active and ongoing)
export const useGetRecognitionPrograms = () => {
  return useQuery<{
    success: boolean;
    active_programs: RecognitionProgram[];
    ongoing_programs: RecognitionProgram[];
  }>({
    queryKey: ["recognition", "programs"],
    queryFn: async () => {
      const response = await FrappeAPI.callMethod(`${API_BASE}.get_recognition_programs`);
      return response as {
        success: boolean;
        active_programs: RecognitionProgram[];
        ongoing_programs: RecognitionProgram[];
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get recognition leaderboard
export const useGetRecognitionLeaderboard = (
  period?: string,
  type: "received" | "given" = "received"
) => {
  return useQuery<{
    success: boolean;
    leaderboard: LeaderboardEntry[];
    period?: string;
    type: string;
  }>({
    queryKey: ["recognition", "leaderboard", period, type],
    queryFn: async () => {
      const params: Record<string, any> = { type };
      if (period) params.period = period;
      
      const response = await FrappeAPI.callMethod(
        `${API_BASE}.get_recognition_leaderboard`,
        params
      );
      return response as {
        success: boolean;
        leaderboard: LeaderboardEntry[];
        period?: string;
        type: string;
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get recognition metrics
export const useGetRecognitionMetrics = (period?: string, year?: number) => {
  return useQuery<{
    success: boolean;
    metrics: RecognitionMetrics;
  }>({
    queryKey: ["recognition", "metrics", period, year],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (period) params.period = period;
      if (year) params.year = year;
      
      const response = await FrappeAPI.callMethod(
        `${API_BASE}.get_recognition_metrics`,
        params
      );
      return response as {
        success: boolean;
        metrics: RecognitionMetrics;
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Get department nomination status
export const useGetDepartmentNominationStatus = () => {
  return useQuery<{
    success: boolean;
    overall_approval_percentage: number;
    total_pending: number;
    departments: DepartmentStatus[];
  }>({
    queryKey: ["recognition", "department-status"],
    queryFn: async () => {
      const response = await FrappeAPI.callMethod(
        `${API_BASE}.get_department_nomination_status`
      );
      return response as {
        success: boolean;
        overall_approval_percentage: number;
        total_pending: number;
        departments: DepartmentStatus[];
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get last program winners
export const useGetLastProgramWinners = (limit: number = 3) => {
  return useQuery<{
    success: boolean;
    winners: ProgramWinner[];
  }>({
    queryKey: ["recognition", "winners", limit],
    queryFn: async () => {
      const response = await FrappeAPI.callMethod(
        `${API_BASE}.get_last_program_winners`,
        { limit }
      );
      return response as {
        success: boolean;
        winners: ProgramWinner[];
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get employee recognition points (for "My Points" display)
export const useGetEmployeeRecognitionPoints = (employee?: string) => {
  return useQuery<{
    success: boolean;
    points: number;
  }>({
    queryKey: ["recognition", "points", employee],
    queryFn: async () => {
      if (!employee) {
        // Get current user's employee
        const currentUser = await FrappeAPI.callMethod("frappe.auth.get_logged_user");
        const employeeDoc = await FrappeAPI.getDocumentList("Employee", {
          filters: [["user_id", "=", currentUser]],
          fields: ["name"],
          limit: 1,
        });
        
        if (employeeDoc.data.length === 0) {
          return { success: true, points: 0 };
        }
        
        const firstEmployee = employeeDoc.data[0] as { name: string };
        employee = firstEmployee.name;
      }
      
      // Get employee recognitions and calculate points
      const recognitions = await FrappeAPI.getDocumentList("Employee Recognition", {
        filters: [
          ["employee", "=", employee],
          ["approval_status", "=", "Approved"],
          ["docstatus", "!=", 2],
        ],
        fields: ["recognition_type"],
      });
      
      let totalPoints = 0;
      for (const rec of recognitions.data) {
        const recItem = rec as { recognition_type?: string };
        if (!recItem.recognition_type) continue;
        
        try {
          const recType = await FrappeAPI.getDocument(
            "Recognition Type",
            recItem.recognition_type,
            ["points_value"]
          );
          const recTypeData = recType as { points_value?: number };
          totalPoints += recTypeData.points_value || 0;
        } catch {
          // Skip if recognition type not found
        }
      }
      
      return { success: true, points: totalPoints };
    },
    enabled: !!employee || true, // Always enabled, will fetch current user if employee not provided
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Appreciate an employee (mutation)
export const useAppreciateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      employee: string;
      recognition_type: string;
      reason?: string;
      award_name?: string;
    }) => {
      const response = await FrappeAPI.callMethod(
        `${API_BASE}.award_recognition`,
        data
      );
      return response as {
        success: boolean;
        message: string;
        recognition: string;
      };
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["recognition"] });
    },
  });
};

// Get my recognition activity (nominations, votes, etc.)
export const useGetMyRecognitionActivity = () => {
  return useQuery<MyRecognitionActivity>({
    queryKey: ["recognition", "my-activity"],
    queryFn: async () => {
      const response = await FrappeAPI.callMethod(
        `${API_BASE}.get_my_recognition_activity`
      );
      return response as MyRecognitionActivity;
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Create a nomination (mutation)
export const useCreateNomination = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      award: string;
      form_data: Record<string, any>;
    }) => {
      const response = await FrappeAPI.callMethod(
        `${NOMINATION_API_BASE}.create_nomination`,
        { nomination_data: data }
      );
      return response as {
        success: boolean;
        message: string;
        nomination: string;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recognition"] });
    },
  });
};

// Get form session ID for chatnext window (nomination forms)
export const useGetFormSessionId = () => {
  return useMutation({
    mutationFn: async (data: { form_widget_name: string; award_name: string }) => {
      const response = await FrappeAPI.callMethod(
        "chatnext_work_connect.chatnext_work_connect.api.recognition_form.get_form_session_id",
        data
      );
      return response as { success: boolean; session_id: string };
    },
  });
};

// Submit a vote on a nomination (mutation)
export const useSubmitVote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      nomination_name: string;
      vote_score?: number;
      vote_comment?: string;
    }) => {
      const response = await FrappeAPI.callMethod(
        `${WC_SETTINGS_API_BASE}.submit_nomination_vote`,
        data
      );
      return response as {
        success: boolean;
        message: string;
        vote: string;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recognition"] });
    },
  });
};

// ─── My Appreciations History (get_appreciation_programs) ─────────────────────
export type AppreciationHistoryParams = {
  employee?: string;
  program?: string;
  recognizer_type?: string;
  recognized_with?: string;
  time?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  persons?: string;
  direction?: "received" | "given";
  start?: number;
  page_length?: number;
};

export type AppreciationApiItem = {
  name: string;
  title: string;
  value: string;
  values: string[];
  message: string;
  logo?: string;
  person: string;
  person_image: string;
  date: string;
  direction: "received" | "given";
  points: number;
};

export type AppreciationProgramsResponse = {
  success: boolean;
  data: AppreciationApiItem[];
  total_count: number;
  filter_options: {
    programs: { value: string; label: string }[];
    employees: { value: string; label: string }[];
  };
};

// ─── Eligible programs (get_eligible_programs) ────────────────────────────────
export type EligibleProgram = {
  program_name: string;
  program_title: string;
  program_description: string;
  program_logo?: string | null;
  start_date: string;
  end_date: string;
  program_has_reward: boolean;
  reward_type: string;
};

export type EligibleProgramsResponse = {
  success: boolean;
  employee: string;
  eligible_programs: EligibleProgram[];
};

export const useEligiblePrograms = (employee?: string) => {
  return useQuery<EligibleProgramsResponse>({
    queryKey: ["recognition", "eligible-programs", employee],
    queryFn: async () => {
      const response = await FrappeAPI.callMethod(
        "chatnext_work_connect.chatnext_work_connect.api.recognition_eligibility.get_eligible_programs",
        { employee },
      );
      return response as EligibleProgramsResponse;
    },
    enabled: !!employee,
  });
};

// ─── Create Employee Appreciation (create_employee_appreciation) ──────────────
export type CreateEmployeeAppreciationPayload = {
  employee: string;
  program_name: string;
  given_by?: string;
  points?: number;
  note?: string;
  date?: string;
};

export const useCreateEmployeeAppreciation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEmployeeAppreciationPayload) => {
      const response = await FrappeAPI.callMethod(
        "chatnext_work_connect.chatnext_work_connect.api.employee_appreciation.create_employee_appreciation",
        data,
      );
      return response as {
        success: boolean;
        data: Record<string, unknown>;
        message: string;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recognition"] });
      queryClient.invalidateQueries({ queryKey: ["all-emp-appreciations-badges"] });
    },
  });
};

// ─── Eligible receivers (get_eligible_receivers) ──────────────────────────────
export type EligibleReceiver = {
  employee: string;
  employee_name: string;
  department: string | null;
  designation: string | null;
};

export type EligibleReceiversResponse = {
  success: boolean;
  employee: string;
  program: string;
  eligible_receivers: EligibleReceiver[];
};

export const useEligibleReceivers = (employee?: string, program?: string) => {
  return useQuery<EligibleReceiversResponse>({
    queryKey: ["recognition", "eligible-receivers", employee, program],
    enabled: !!employee && !!program,
    queryFn: async () => {
      const response = await FrappeAPI.callMethod(
        "chatnext_work_connect.chatnext_work_connect.api.recognition_eligibility.get_eligible_receivers",
        { employee, program },
      );
      return response as EligibleReceiversResponse;
    },
  });
};

// ─── Earned Points Summary (get_employee_points) ──────────────────────────────
export type EmployeePointsParams = {
  employee?: string;
  redemption_from_date?: string;
  redemption_to_date?: string;
  min_redeemed_points?: string;
  max_redeemed_points?: string;
};

export type RedemptionEntry = {
  name: string;
  points: number;
  date: string;
  program?: string;
  award?: string;
  recognition_type?: string;
  remarks?: string;
};

export type EmployeePointsResponse = {
  success: boolean;
  employee: string;
  total_earned_points: number;
  used_points: number;
  available_points: number;
  redemptions: RedemptionEntry[];
};

export const useEmployeePoints = (params: EmployeePointsParams) => {
  return useQuery<EmployeePointsResponse>({
    queryKey: ["recognition", "employee-points", params],
    queryFn: async () => {
      const response = await FrappeAPI.callMethod(
        "chatnext_work_connect.chatnext_work_connect.api.recognition_points.get_employee_points",
        params,
      );
      return response as EmployeePointsResponse;
    },
    enabled: !!params.employee,
  });
};

export const useAppreciationPrograms = (params: AppreciationHistoryParams) => {
  return useQuery<AppreciationProgramsResponse>({
    queryKey: ["recognition", "appreciation-programs", params],
    queryFn: async () => {
      const response = await FrappeAPI.callMethod(
        "chatnext_work_connect.chatnext_work_connect.api.recognition_points.get_appreciation_programs",
        params,
      );
      return response as AppreciationProgramsResponse;
    },
    enabled: !!params.employee,
  });
};

// ─── Award-wise employee points (get_award_employee_points) ───────────────────
export type AwardEmployeePointsParams = {
  /** 'all' | 'month' | 'quarter' | 'year' (filters on the award/nomination date). */
  time_period?: string;
  /** 'nomination_date desc|asc' or 'points desc|asc'. */
  sort?: string;
};

export type AwardPointsEmployee = {
  employee: string;
  employee_name: string | null;
  full_name: string | null;
  image: string | null;
  designation: string | null;
  total_points: number;
  recognition_count: number;
  last_nomination_date: string | null;
};

export type AwardPointsAward = {
  award: string;
  award_name: string | null;
  total_points: number;
  employees: AwardPointsEmployee[];
};

export type AwardEmployeePointsResponse = {
  success: boolean;
  filters: {
    time_period: string;
    from_date: string | null;
    to_date: string | null;
    sort: string;
  };
  awards: AwardPointsAward[];
};

// ─── Appreciation Leaderboard (get_appreciation_leaderboard) ──────────────────
export type AppreciationLeaderboardParams = {
  tab?: "receivers" | "recognizers";
  program?: string;
  time?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  start?: number;
  page_length?: number;
};

export type LeaderboardPersonEntry = {
  rank: number;
  employee: string;
  employee_name: string;
  designation: string;
  image: string;
  count: number;
  points: number;
};

export type AppreciationLeaderboardResponse = {
  success: boolean;
  tab: "receivers" | "recognizers";
  data: LeaderboardPersonEntry[];
  total_count: number;
  filter_options: { programs: { value: string; label: string }[] };
};

export const useAppreciationLeaderboard = (
  params: AppreciationLeaderboardParams = {},
) => {
  const { tab = "receivers", page_length = 100, ...rest } = params;
  return useQuery<AppreciationLeaderboardResponse>({
    queryKey: ["recognition", "appreciation-leaderboard", tab, page_length, rest],
    queryFn: async () => {
      const response = await FrappeAPI.callMethod(
        "chatnext_work_connect.chatnext_work_connect.api.recognition_points.get_appreciation_leaderboard",
        { tab, page_length, ...rest },
      );
      return response as AppreciationLeaderboardResponse;
    },
  });
};

// ─── Recognition Admin Dashboard (get_recognition_admin_dashboard) ────────────
export type AdminAppreciationProgram = {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
};
export type AdminAwardProgram = AdminAppreciationProgram & {
  awardType: string;
  nominations: "Open" | "Closed";
};
export type AdminTeamRegistration = {
  teamName: string;
  teamType: string;
  members: number;
  programName: string;
  createdBy: string;
  createdOn: string;
  status: string;
};
export type RecognitionAdminParams = {
  tab: "appreciation" | "award" | "team";
  search?: string;
  status?: string;
  award_type?: string;
  names?: string;
  start_from?: string;
  start_to?: string;
  end_from?: string;
  end_to?: string;
  sort_field?: string;
  sort_order?: "asc" | "desc";
  start?: number;
  page_length?: number;
};

type LabelValue = { label: string; value: string };

export type RecognitionAdminDashboardResponse = {
  success: boolean;
  tab: string;
  // Row shape depends on the tab (appreciation / award / team).
  data: (AdminAppreciationProgram | AdminAwardProgram | AdminTeamRegistration)[];
  total_count: number;
  stats: { value: number; label: string }[];
  filter_options: {
    names: LabelValue[];
    statuses: LabelValue[];
    award_types: LabelValue[];
  };
};

export type CreateRecognitionProgramPayload = {
  program_type: "Appreciation" | "Award";
  program_name: string;
  program_code: string;
  program_description?: string;
  award_type?: "Individual" | "Team";
  start_date?: string;
  end_date?: string;
  values?: string;
  is_active?: number;
  program_has_reward?: number;
  reward_type?: string;
  points_per_recognition?: number;
};

export const useCreateRecognitionProgram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateRecognitionProgramPayload) => {
      return FrappeAPI.callMethod(
        "chatnext_work_connect.chatnext_work_connect.api.recognition_points.create_recognition_program",
        payload,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recognition", "admin-dashboard"] });
    },
  });
};

export type RecognitionProgramDetail = {
  program_code: string;
  program_type: "Appreciation" | "Award";
  program_name: string;
  program_description: string;
  award_type: "Individual" | "Team";
  start_date: string;
  end_date: string;
  values: string;
  is_active: number;
  program_has_reward: number;
  reward_type: string;
  points_per_recognition: number;
};

// ─── Award Nomination Workflow (get_award_nominations) ────────────────────────
export type AwardNominationCategory =
  | "individual_received"
  | "individual_raised"
  | "team_raised";

export type AwardNominationRow = {
  id: string;
  program: string;
  nominatedBy: string;
  nominationDate: string;
  lastActionDate: string;
  status: string;
  published: number;
};

export type AwardNominationsResponse = {
  success: boolean;
  category: string;
  data: AwardNominationRow[];
  total_count: number;
  counts: Record<AwardNominationCategory, number>;
  filter_options: {
    programs: { label: string; value: string }[];
    statuses: { label: string; value: string }[];
  };
};

export type AwardNominationsParams = {
  employee?: string;
  category: AwardNominationCategory;
  search?: string;
  status?: string;
  programs?: string;
  nomination_from?: string;
  nomination_to?: string;
  action_from?: string;
  action_to?: string;
  sort_order?: "asc" | "desc";
  start?: number;
  page_length?: number;
};

export const useAwardNominations = (params: AwardNominationsParams) => {
  const { employee, ...rest } = params;
  return useQuery<AwardNominationsResponse>({
    queryKey: ["recognition", "award-nominations", employee, rest],
    enabled: !!employee,
    queryFn: async () => {
      const response = await FrappeAPI.callMethod(
        "chatnext_work_connect.chatnext_work_connect.api.recognition_points.get_award_nominations",
        { employee, ...rest },
      );
      return response as AwardNominationsResponse;
    },
  });
};

// Publish / unpublish (move to draft) selected nominations from the list view.
export const useSetNominationPublished = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { names: string[]; published: boolean }) => {
      const response = await FrappeAPI.callMethod(
        "chatnext_work_connect.chatnext_work_connect.api.recognition_points.set_nomination_published_status",
        { names: JSON.stringify(data.names), published: data.published ? 1 : 0 },
      );
      return response as { success: boolean; updated: string[]; published: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recognition", "award-nominations"] });
    },
  });
};

// Full detail for the "Appreciation Details" view drawer.
export type AppreciationDetail = {
  name: string;
  title: string;
  logo: string;
  recognized_by: string;
  receiver_name: string;
  date: string;
  points: number;
  note: string;
  values: string[];
  program: string;
};

export const useAppreciationDetails = (name?: string | null, enabled = true) => {
  return useQuery<AppreciationDetail>({
    queryKey: ["recognition", "appreciation-detail", name],
    enabled: !!name && enabled,
    queryFn: async () => {
      const response = await FrappeAPI.callMethod(
        "chatnext_work_connect.chatnext_work_connect.api.recognition_points.get_appreciation_details",
        { name },
      );
      return (response as { detail: AppreciationDetail }).detail;
    },
  });
};

// Fetch a generated certificate PDF (base64) for an Employee Appreciation.
export const fetchAppreciationCertificate = async (
  name: string,
): Promise<{ filename: string; content_base64: string }> => {
  const response = await FrappeAPI.callMethod(
    "chatnext_work_connect.chatnext_work_connect.api.recognition_points.get_appreciation_certificate",
    { name },
  );
  return response as { filename: string; content_base64: string };
};

// Delete an Employee Appreciation (award/appreciation history "Delete" action).
export const useDeleteAppreciation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      return FrappeAPI.callMethod(
        "chatnext_work_connect.chatnext_work_connect.api.recognition_points.delete_employee_appreciation",
        { name },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recognition", "award-programs"] });
      queryClient.invalidateQueries({ queryKey: ["recognition", "appreciation-programs"] });
      queryClient.invalidateQueries({ queryKey: ["recognition", "award-employee-points"] });
    },
  });
};

export const useRecognitionProgram = (programCode?: string | null) => {
  return useQuery<RecognitionProgramDetail>({
    queryKey: ["recognition", "program", programCode],
    enabled: !!programCode,
    queryFn: async () => {
      const response = await FrappeAPI.callMethod(
        "chatnext_work_connect.chatnext_work_connect.api.recognition_points.get_recognition_program",
        { program_code: programCode },
      );
      return (response as { program: RecognitionProgramDetail }).program;
    },
  });
};

export type UpdateRecognitionProgramPayload = { program_code: string } & Partial<
  Omit<CreateRecognitionProgramPayload, "program_code">
>;

export const useUpdateRecognitionProgram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateRecognitionProgramPayload) => {
      return FrappeAPI.callMethod(
        "chatnext_work_connect.chatnext_work_connect.api.recognition_points.update_recognition_program",
        payload,
      );
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["recognition", "admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["recognition", "program", vars.program_code] });
    },
  });
};

export const useRecognitionAdminDashboard = (params: RecognitionAdminParams) => {
  return useQuery<RecognitionAdminDashboardResponse>({
    queryKey: ["recognition", "admin-dashboard", params],
    queryFn: async () => {
      const response = await FrappeAPI.callMethod(
        "chatnext_work_connect.chatnext_work_connect.api.recognition_points.get_recognition_admin_dashboard",
        params,
      );
      return response as RecognitionAdminDashboardResponse;
    },
  });
};

// ─── My Awards History (get_award_programs) ───────────────────────────────────
// Same filter set + response shape as get_appreciation_programs, but "Program"
// here refers to the Award.
export type AwardProgramsParams = AppreciationHistoryParams;
// Award rows additionally carry the recipient organisation for the "My Awards" cards.
export type AwardProgramItem = AppreciationApiItem & {
  org: string;
};
export type AwardProgramsResponse = Omit<AppreciationProgramsResponse, "data"> & {
  data: AwardProgramItem[];
};

export const useAwardPrograms = (params: AwardProgramsParams) => {
  return useQuery<AwardProgramsResponse>({
    queryKey: ["recognition", "award-programs", params],
    queryFn: async () => {
      const response = await FrappeAPI.callMethod(
        "chatnext_work_connect.chatnext_work_connect.api.recognition_points.get_award_programs",
        params,
      );
      return response as AwardProgramsResponse;
    },
    enabled: !!params.employee,
  });
};

export const useAwardEmployeePoints = (params: AwardEmployeePointsParams = {}) => {
  const { time_period = "all", sort = "nomination_date desc" } = params;
  return useQuery<AwardEmployeePointsResponse>({
    queryKey: ["recognition", "award-employee-points", time_period, sort],
    queryFn: async () => {
      const response = await FrappeAPI.callMethod(
        "chatnext_work_connect.chatnext_work_connect.api.recognition_points.get_award_employee_points",
        { time_period, sort },
      );
      return response as AwardEmployeePointsResponse;
    },
  });
};
