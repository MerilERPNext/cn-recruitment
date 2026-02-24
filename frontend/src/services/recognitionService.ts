/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FrappeAPI from "../utils/frappeAPI";
import type {
  RecognitionProgram,
  LeaderboardEntry,
  RecognitionMetrics,
  DepartmentStatus,
  ProgramWinner,
} from "../types/recognition";

const API_BASE = "chatnext_work_connect.chatnext_work_connect.api.recognition";
const BADGE_API_BASE = "chatnext_work_connect.chatnext_work_connect.api.badge";

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
