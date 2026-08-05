/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FrappeAPI from "../utils/frappeAPI";
import type { RecognitionProgram } from "../types/recognition";

const API_BASE = "chatnext_work_connect.chatnext_work_connect.api.recognition";
const BADGE_API_BASE = "chatnext_work_connect.chatnext_work_connect.api.badge";
const NOMINATION_API_BASE = "chatnext_work_connect.chatnext_work_connect.api.nomination";
const WC_SETTINGS_API_BASE = "chatnext_work_connect.chatnext_work_connect.api.work_connect_settings";

// ─── Generic doctype → filter options (Frappe resource API) ───────────────────
// Fetches a doctype's records via /api/resource/<doctype> and maps them to
// { label, value } filter options. Mirrors the Payroll Period select pattern so
// any filter that maps to a real doctype/Link field can be driven dynamically
// from the backend instead of a hardcoded list.
export type SelectOption = { label: string; value: string };

export const useDoctypeOptions = (
  doctype: string,
  opts?: {
    labelField?: string;
    // A "{field}" template for the label, e.g. "{award_name} ({name})".
    // Takes precedence over labelField when set.
    labelTemplate?: string;
    // Field to use as the option value; defaults to the docname (`name`).
    valueField?: string;
    filters?: [string, string, unknown][];
    orderBy?: string;
    limit?: number;
    enabled?: boolean;
  },
) => {
  const labelField = opts?.labelField;
  const labelTemplate = opts?.labelTemplate;
  const valueField = opts?.valueField;
  return useQuery<SelectOption[]>({
    queryKey: ["doctype-options", doctype, opts],
    enabled: opts?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const templateFields = labelTemplate
        ? Array.from(labelTemplate.matchAll(/\{(\w+)\}/g)).map((m) => m[1])
        : [];
      const fields = Array.from(
        new Set([
          "name",
          ...(labelField ? [labelField] : []),
          ...(valueField ? [valueField] : []),
          ...templateFields,
        ]),
      );
      const res = await FrappeAPI.getDocumentList(doctype, {
        fields,
        filters: opts?.filters as any,
        orderBy: opts?.orderBy ?? "name asc",
        limit: opts?.limit ?? 500,
      });
      return (res.data as any[]).map((r) => ({
        value: (valueField && r[valueField]) || r.name,
        label: labelTemplate
          ? labelTemplate.replace(/\{(\w+)\}/g, (_, f) => r[f] ?? "")
          : (labelField && r[labelField]) || r.name,
      }));
    },
  });
};

// ─── Advanced Settings (Recognition) via the Frappe resource API ──────────────
// The "Advanced Settings" Single doctype is read/written directly through the
// resource API (/api/resource/Advanced Settings/Advanced Settings) — no custom
// backend endpoint.
export type AdvancedSettings = Record<string, unknown>;

export const useAdvancedSettings = () => {
  return useQuery<AdvancedSettings>({
    queryKey: ["recognition", "advanced-settings"],
    queryFn: async () => {
      const doc = await FrappeAPI.getDocument("Advanced Settings", "Advanced Settings");
      return doc as AdvancedSettings;
    },
  });
};

// Strict feature flags derived from the Advanced Settings doctype: a feature is
// enabled ONLY when its flag == 1. Drives which Recognition pages / buttons /
// displays are shown on the frontend (managed from the doctype in the desk).
export type RecognitionFlags = {
  loaded: boolean;
  enableAppreciations: boolean;
  enableIndividualAwards: boolean;
  enableTeamAwards: boolean;
  enableAwards: boolean; // individual OR team
  displayIndividualAwardWinners: boolean;
  displayTeamAwardWinners: boolean;
  displayAppreciationProgramsInLeaderboard: boolean;
  hideRewardsPointSummary: boolean;
  hideBudgetedPointsFrontend: boolean;
  hideNominateUptoValue: boolean;
  /** CC controls for Recognition emails (Advanced Settings). */
  enableCcEmployees: boolean;
  enableCcEmailIds: boolean;
  sendEmailToRecognizerManager: boolean;
  /** Minimum characters required in an appreciation/nomination note (0 = no minimum). */
  minimumNominationCharacters: number;
};

const truthy = (v: unknown) => v === 1 || v === "1" || v === true;

// Whether a Recognition sub-page (by its route key) is visible under the flags.
// Dashboard / Feed / Admin Dashboard are always shown; the rest are gated.
export const recognitionPageVisible = (
  key: string,
  flags: RecognitionFlags,
): boolean => {
  switch (key) {
    case "my-appreciations-history":
    case "appreciations-leaderboard":
      return flags.enableAppreciations;
    case "awards-live":
    case "awards-history":
    case "nomination-workflows":
      return flags.enableAwards;
    case "earned-points":
      return !flags.hideRewardsPointSummary;
    default:
      return true;
  }
};

export const useRecognitionFlags = (): RecognitionFlags => {
  const { data, isSuccess } = useAdvancedSettings();
  const s = (data ?? {}) as Record<string, unknown>;
  const enableIndividualAwards = truthy(s.enable_individual_awards);
  const enableTeamAwards = truthy(s.enable_team_awards);
  return {
    loaded: isSuccess,
    enableAppreciations: truthy(s.enable_appreciations),
    enableIndividualAwards,
    enableTeamAwards,
    enableAwards: enableIndividualAwards || enableTeamAwards,
    displayIndividualAwardWinners: truthy(s.display_individual_award_winners),
    displayTeamAwardWinners: truthy(s.display_team_award_winners),
    displayAppreciationProgramsInLeaderboard: truthy(s.display_appreciation_programs_in_leaderboard),
    hideRewardsPointSummary: truthy(s.hide_rewards_point_summary),
    hideBudgetedPointsFrontend: truthy(s.hide_budgeted_points_frontend),
    hideNominateUptoValue: truthy(s.hide_nominate_upto_value),
    enableCcEmployees: truthy(s.enable_cc_employees),
    enableCcEmailIds: truthy(s.enable_cc_email_ids),
    sendEmailToRecognizerManager: truthy(s.send_email_to_recognizer_manager),
    minimumNominationCharacters: Number(s.minimum_nomination_characters) || 0,
  };
};

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
  /** Restrict to a single Employee Appreciation status (e.g. "Approved"). */
  status?: string;
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
  person_id?: string;   // Employee id of the shown person (for the hover card)
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
export type ProgramType = "Appreciation" | "Award";

export type EligibleProgram = {
  program_name: string;
  program_title: string;
  program_description: string;
  program_type?: ProgramType | null;
  program_logo?: string | null;
  start_date: string;
  end_date: string;
  program_has_reward: boolean;
  reward_type: string;
  /** "Nominate Upto" value (number_of_recognition_allowed_by_same_recognizer). */
  nominate_upto?: number | null;
};

export type EligibleProgramsResponse = {
  success: boolean;
  employee: string;
  eligible_programs: EligibleProgram[];
};

// `programType` filters the list server-side: "Appreciation" (profile Appreciate)
// or "Award" (active programs).
export const useEligiblePrograms = (
  employee?: string,
  programType?: ProgramType,
) => {
  return useQuery<EligibleProgramsResponse>({
    queryKey: ["recognition", "eligible-programs", employee, programType, "Approved"],
    queryFn: async () => {
      const response = await FrappeAPI.callMethod(
        "chatnext_work_connect.chatnext_work_connect.api.recognition_eligibility.get_eligible_programs",
        // Only surface Approved Recognition Programs (backend applies the
        // `status` filter when provided).
        { employee, program_type: programType, status: "Approved" },
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
  /** JSON-stringified submission from the program's attached panel form. */
  custom_form_data?: string;
  /** Comma-separated recognition value(s) selected for this appreciation. */
  values?: string;
  /** CC employee IDs (only sent when enable_cc_employees is on). */
  cc_employees?: string[];
  /** CC external email addresses (only sent when enable_cc_email_ids is on). */
  cc_email_ids?: string[];
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

// ─── Program budget (Budgeting Rule) ─────────────────────────────────────────
// A Recognition Program may link a Budgeting Rule via `budgeting_rule`; the
// budget value is the total Budget Points across that rule's limit rows.
// Returns 0 when no rule/budget is configured. Reuses the Frappe resource API
// (no custom endpoint) — the visibility flag comes from useRecognitionFlags
// (hide_budgeted_points_frontend), so it is not duplicated here.
export const useProgramBudget = (programName?: string) => {
  return useQuery<number>({
    queryKey: ["recognition", "program-budget", programName],
    enabled: !!programName,
    queryFn: async () => {
      const prog = (await FrappeAPI.getDocument(
        "Recognition Program",
        programName as string,
        ["budgeting_rule"],
      )) as { budgeting_rule?: string | null };
      const ruleName = prog?.budgeting_rule;
      if (!ruleName) return 0;

      const rule = (await FrappeAPI.getDocument(
        "Budgeting Rule",
        ruleName,
      )) as { limits?: { budget_points?: number | null }[] };
      return (rule?.limits ?? []).reduce(
        (sum, l) => sum + (Number(l?.budget_points) || 0),
        0,
      );
    },
  });
};

// ─── Program recognition values ──────────────────────────────────────────────
// The Recognition Program stores its values as a comma-separated string in the
// `values` field. This returns them as a clean list for the appreciate form's
// Values dropdown.
export const useProgramValues = (programName?: string) => {
  return useQuery<string[]>({
    queryKey: ["recognition", "program-values", programName],
    enabled: !!programName,
    queryFn: async () => {
      const p = (await FrappeAPI.getDocument(
        "Recognition Program",
        programName as string,
        ["values"],
      )) as { values?: string | null };
      return (p?.values || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    },
  });
};

// ─── Panel form (program's attached Microapp Form Widget) ─────────────────────
// A program may reference a Microapp Form Widget via
// `attach_form_for_panel_members`. This hook resolves that link and returns the
// widget's form.io schema (`custom_form_data`) so the active-program panel can
// render the form. Pure resource-API reads — no custom backend method needed.
export type PanelForm = {
  widget: string;
  label: string;
  /** Parsed form.io schema ({ components: [...] }). */
  schema: { components?: unknown[] } | null;
};

export const usePanelForm = (programName?: string) => {
  return useQuery<PanelForm | null>({
    queryKey: ["recognition", "panel-form", programName],
    enabled: !!programName,
    queryFn: async () => {
      // 1. Read the program's attached form widget link.
      const program = (await FrappeAPI.getDocument(
        "Recognition Program",
        programName as string,
        ["attach_form_for_panel_members"],
      )) as { attach_form_for_panel_members?: string | null };
      const widgetName = program?.attach_form_for_panel_members;
      if (!widgetName) return null;

      // 2. Read the widget's form.io schema + label.
      const widget = (await FrappeAPI.getDocument(
        "Microapp Form Widget",
        widgetName,
        ["name", "label", "custom_form_data"],
      )) as { name: string; label?: string; custom_form_data?: string | null };

      let schema: PanelForm["schema"] = null;
      if (widget?.custom_form_data) {
        try {
          schema =
            typeof widget.custom_form_data === "string"
              ? JSON.parse(widget.custom_form_data)
              : (widget.custom_form_data as PanelForm["schema"]);
        } catch (e) {
          console.error("Failed to parse panel form custom_form_data", e);
          schema = null;
        }
      }

      return { widget: widget.name, label: widget.label || widget.name, schema };
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
  entry_type?: "Earned" | "Redeemed";
  points: number;
  date: string;
  program?: string;
  /** Human-readable programme title for `program` (Source column). */
  program_title?: string;
  /** Originating appreciation / recognition / award (Transaction ID column). */
  transaction_id?: string;
  employee_appreciation?: string;
  employee_recognition?: string;
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
  /** Program end date — shown as "Closed on <date>" on the award card. */
  end_date?: string | null;
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
  /** Shown under the name on the leaderboard (falls back to designation). */
  department?: string;
  image: string;
  count: number;
  points: number;
};

export type AppreciationLeaderboardResponse = {
  success: boolean;
  tab: "receivers" | "recognizers";
  data: LeaderboardPersonEntry[];
  total_count: number;
  /** Whether ranks/scores are driven by total points or appreciation count. */
  ranking_basis?: "points" | "count";
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

/** Which persona is shown as the recognizer (Advanced Settings.recognizer_persona). */
export type RecognizerPersona = "Nominator" | "Publisher" | "Group Company";

export type AwardNominationRow = {
  id: string;
  program: string;
  /** Displayed recognizer, resolved per recognizer_persona. */
  nominatedBy: string;
  recognizer?: string;
  recognizerName?: string;
  recognizerType?: "Employee" | "Company" | "User";
  recognizerPersona?: RecognizerPersona;
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
  /** Active recognizer display setting — used to label the recognizer column. */
  recognizer_persona?: RecognizerPersona;
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
  recognized_by_id?: string;   // giver Employee id
  receiver_name: string;
  receiver_id?: string;        // receiver Employee id
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
