/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import {
  attendanceService,
  getAllAttendancePolicies,
  getAllIpRestrictions,
  getAllShiftBlocks,
  getAllShiftLocations,
  getAllWeekOffs,
} from "../services/attendanceService";
import type {
  AllEventsAndAttendanceT,
  Attendance,
  AttendanceRecord,
  AttendanceRequest,
  CanShowClockIn,
  EmployeeCheckInLog,
  EmployeeShift,
  EmployeeShiftSummary,
  PolicyQuestion,
  UserRoles,
} from "../types/attendance";
import { FilterCondition } from "../types/frappe";

// Retry logic (same as other hooks)
const isPermissionError = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message.includes("permission") ||
    error.message.includes("403") ||
    error.message.includes("Access Restricted"));

const defaultRetry = (failureCount: number, error: unknown) => {
  // Don't retry permission errors
  if (isPermissionError(error)) return false;

  // Don't retry 417 errors (device ID/expectation failed errors)
  if (error && typeof error === "object") {
    if ("response" in error && (error as any).response?.status === 417) {
      console.warn("🚫 Not retrying 417 error - likely device ID issue");
      return false;
    }
    if ("status" in error && (error as any).status === 417) {
      console.warn("🚫 Not retrying 417 error - likely device ID issue");
      return false;
    }
  }

  return failureCount < 3;
};

const defaultQueryOptions = {
  staleTime: 1000 * 60 * 60 * 2, // 2 hours
  gcTime: 1000 * 60 * 60 * 3, // 3 hours
  retry: defaultRetry,
  retryDelay: (attemptIndex: number) =>
    Math.min(1000 * 2 ** attemptIndex, 30000),
};

export const useAllAttendance = (
  fields?: string[],
  filters?: FilterCondition[]
): UseQueryResult<Attendance[], Error> => {
  return useQuery<Attendance[], Error>({
    queryKey: ["attendance", "all", filters],
    queryFn: () => attendanceService.getAllAttendance(fields, filters),
    refetchOnWindowFocus: true,
    ...defaultQueryOptions,
  });
};
export const useHomeSummaryDetails = (
  userId: string,
  filters?: string
): UseQueryResult<EmployeeCheckInLog[], Error> => {
  return useQuery<EmployeeCheckInLog[], Error>({
    queryKey: ["home-summary-details", userId, filters],
    queryFn: () => attendanceService.getHomeSummaryDetails(userId, filters),
    enabled: !!userId,
    refetchOnWindowFocus: true,
    ...defaultQueryOptions,
  });
};

export const useGetEmployeeShift = (
  userId: string,
  filters?: object
): UseQueryResult<EmployeeShift, Error> => {
  return useQuery<EmployeeShift, Error>({
    queryKey: ["employee-shift", userId, filters],
    queryFn: () => attendanceService.getEmployeeShift(userId, filters),
    enabled: !!userId,
    refetchOnWindowFocus: true,
    ...defaultQueryOptions,
  });
};
// Inprogress
export const useGetEmployeeDeviceId = (): UseQueryResult<
  EmployeeShift,
  Error
> => {
  return useQuery<any, Error>({
    queryKey: ["employee-device-id"],
    queryFn: () => attendanceService.getEmployeeDeviceId(),
    refetchOnWindowFocus: true,
    ...defaultQueryOptions,
  });
};

export const useGetQuickAttendanceSummary = (
  employeeId: string,
  fromDate: string,
  toDate: string
): UseQueryResult<EmployeeShiftSummary, Error> => {
  return useQuery<EmployeeShiftSummary, Error>({
    queryKey: ["employee-attendance-summary", employeeId, fromDate, toDate],
    queryFn: () =>
      attendanceService.getQuickAttendanceSummary(employeeId, fromDate, toDate),
    enabled: !!employeeId && !!fromDate && !!toDate,
    refetchOnWindowFocus: true,
    ...defaultQueryOptions,
  });
};
export const useAllAttendanceRequests = (
  pageSize: number | string,
  filters?: FilterCondition[]
): UseQueryResult<AttendanceRequest[], Error> => {
  return useQuery<AttendanceRequest[], Error>({
    queryKey: ["attendance", "all", filters],
    queryFn: () =>
      attendanceService.getAllAttendanceRequests(pageSize, filters),
    refetchOnWindowFocus: true,
    ...defaultQueryOptions,
  });
};
export const useGetUserRoles = (
  filters?: FilterCondition[]
): UseQueryResult<UserRoles, Error> => {
  return useQuery<UserRoles, Error>({
    queryKey: ["user-roles", "all", filters],
    queryFn: () => attendanceService.getUserRoles(filters),
    refetchOnWindowFocus: true,
    ...defaultQueryOptions,
  });
};
export const useGetToDoWithReferenceDoc = (
  todo_id: string
): UseQueryResult<any, Error> => {
  return useQuery<any, Error>({
    queryKey: ["todo-refdocs", "all", todo_id],
    queryFn: () => attendanceService.getToDoWithReferenceDoc(todo_id),
    refetchOnWindowFocus: true,
    ...defaultQueryOptions,
  });
};

export const useAllEmployeeCheckIns = (
  filters?: FilterCondition[]
): UseQueryResult<EmployeeCheckInLog[], Error> => {
  return useQuery<EmployeeCheckInLog[], Error>({
    queryKey: ["emp-check-ins", "all", filters],
    queryFn: () => attendanceService.employeeCheckInDetails(filters),
    refetchOnWindowFocus: true,
    ...defaultQueryOptions,
  });
};
export const useGetAllEventsAndAttendance = (
  filters: AllEventsAndAttendanceT
): UseQueryResult<AttendanceRecord[], Error> => {
  return useQuery<AttendanceRecord[], Error>({
    queryKey: ["get-All-Events-And-Attendance", filters],
    queryFn: async () => {
      try {
        return await attendanceService.getAllEventsAndAttendance(filters);
      } catch (error) {
        console.warn("🎯 useGetAllEventsAndAttendance caught error:", error);

        // Handle 417 errors by returning empty array
        if (error && typeof error === "object") {
          if (
            ("response" in error && (error as any).response?.status === 417) ||
            ("status" in error && (error as any).status === 417)
          ) {
            console.warn("🔄 Returning empty array for 417 error in hook");
            return [];
          }
        }

        throw error;
      }
    },
    enabled: !!filters?.start,
    refetchOnWindowFocus: true,
    ...defaultQueryOptions,
  });
};

//this is an reusable hook for getting mandatory details for emloyee id
export function useCheckAttachmentMandatory(
  empId: string | null | undefined,
  date: string | null,
  request_type: string
) {
  return useQuery({
    queryKey: [
      "attendance-request-form-attachment-validations",
      empId,
      date,
      request_type,
    ],
    queryFn: () =>
      attendanceService.checkAttachmentMandatory(empId, date, request_type),
    enabled: !!empId && !!request_type,
  });
}

export const useGetPolicyForDate = (
  filters: any
): UseQueryResult<string, Error> => {
  return useQuery<string, Error>({
    queryKey: ["policy-for-date", filters],
    queryFn: () => attendanceService.getPolicyForDate(filters),
    refetchOnWindowFocus: true,
    ...defaultQueryOptions,
  });
};

export const useAttendanceById = (
  enabled: boolean,
  filters?: FilterCondition[]
): UseQueryResult<Attendance[], Error> => {
  return useQuery<Attendance[], Error>({
    queryKey: ["attendance", "all", filters],
    queryFn: () => attendanceService.getAttendanceById(filters),
    enabled: enabled,
    refetchOnWindowFocus: true,
    ...defaultQueryOptions,
  });
};

export const useAttendancePolicies = (
  filters?: any
): UseQueryResult<PolicyQuestion, Error> => {
  return useQuery<PolicyQuestion, Error>({
    queryKey: ["attendance-policy", filters],
    queryFn: () => attendanceService.getAttendancePolicies(filters),
    enabled: !!filters,
    ...defaultQueryOptions,
  });
};

const defaultStaleTime = 1000 * 60 * 2; // 2 min
const defaultGcTime = 1000 * 60 * 2; // 2 min

export const useAttendance = (
  filters: FilterCondition[],
  queryKeySuffix: unknown = filters
): UseQueryResult<Attendance[], Error> => {
  return useQuery<Attendance[], Error>({
    queryKey: ["attendance", queryKeySuffix, filters],
    queryFn: () => attendanceService.getAttendance(filters),
    staleTime: defaultStaleTime,
    gcTime: defaultGcTime,
    enabled: filters.length > 0,
  });
};

export const useLeaveType = (
  filters?: FilterCondition[],
  queryKeySuffix: unknown = filters
): UseQueryResult<[], Error> => {
  return useQuery<[], Error>({
    queryKey: ["leave-type", queryKeySuffix],
    queryFn: () => attendanceService.getLeaveType(filters),
    staleTime: defaultStaleTime,
    gcTime: defaultGcTime,
  });
};

export const useCanShowClockIn = (
  params: Record<string, unknown>
): UseQueryResult<CanShowClockIn, Error> => {
  return useQuery<CanShowClockIn, Error>({
    queryKey: ["can-show-clock-in", params],
    queryFn: () => attendanceService.canShowClockIn(params),
    staleTime: defaultStaleTime,
    gcTime: defaultGcTime,
    enabled: !!params && Object.keys(params).length > 0,
  });
};

export function useCreateNewAttendanceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      attendanceService.createAttendanceRequest(body),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["attendance", "all"] });
    },
    onError: (e) => {
      console.log(e);
    },
  });
}
export function useReqValidationsForAttendanceRequest(empId: string) {
  return useQuery({
    queryKey: ["attendance-request-validations", empId],
    queryFn: () => attendanceService.reqValidationsForAttendanceRequest(empId!),
    enabled: !!empId,
  });
}

export const usePlannedOvertimeAllowed = (employee: string) => {
  return useQuery<boolean>({
    queryKey: ["planned-overtime-allowed", employee],
    queryFn: () => {
      return attendanceService.plannedOvertimeAllowed(employee);
    },
    enabled: !!employee,
    staleTime: 5 * 60 * 1000,
  });
};

export function useAddAttendanceAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ employee, data }: { employee: string; data: object }) =>
      attendanceService.addAttendanceAssignment(employee, data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["attendance", "all"],
      });
    },

    onError: (e) => {
      console.log(e);
    },
  });
}
export const usePlannedOvertimeRequestAttachments = (employee: string) => {
  return useQuery<any>({
    queryKey: ["planned-overtime-attachments-allowed", employee],
    queryFn: () => {
      return attendanceService.plannedOvertimeRequestAttachments(employee);
    },
    enabled: !!employee,
    staleTime: 5 * 60 * 1000,
  });
};

type ActionOnAttendanceRequestVariables = {
  todo_ids: string | string[];
  selected_action: "Approve" | "Reject";
};

export function useActionOnAttendanceRequest() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, ActionOnAttendanceRequestVariables>({
    mutationFn: ({ todo_ids, selected_action }) =>
      attendanceService.actionOnAttendanceRequest(todo_ids, selected_action),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["attendance", "all"],
      });
    },

    onError: (e) => {
      console.log(e);
    },
  });
}

export function useCheckInOutService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      attendanceService.checkInOutService(body),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["checkin-checkout"] });
    },
    onError: (e) => {
      console.log(e);
      throw e;
    },
  });
}
export function useEditAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      attendanceService.editAttendance(body),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["edit-attendance"] });
    },
    onError: (e) => {
      console.log(e);
      throw e;
    },
  });
}
export function useClockInOutService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      attendanceService.clockInOutService(body),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["clockin-clockout"] });
    },
    onError: (e) => {
      console.log(e);
      throw e;
    },
  });
}

export function useCreatePlannedOvertimeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      attendanceService.createPlannedOvertimeRequest(body),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["planned-overtime-request"] });
    },
    onError: (e) => {
      console.log(e);
    },
  });
}
export const useAllAttendancePolicies = (filters?: FilterCondition[]) => {
  return useQuery({
    queryKey: ["all-attendance-policies", filters],
    queryFn: () => getAllAttendancePolicies(filters),
  });
};

export const useAllWeekOffs = (filters?: FilterCondition[]) => {
  return useQuery({
    queryKey: ["all-week-offs", filters],
    queryFn: () => getAllWeekOffs(filters),
  });
};
export const useAllIpRestrictions = (filters?: FilterCondition[]) => {
  return useQuery({
    queryKey: ["all-ip-restrictions", filters],
    queryFn: () => getAllIpRestrictions(filters),
  });
};
export const useAllShiftLocations = (filters?: FilterCondition[]) => {
  return useQuery({
    queryKey: ["all-shift-locations", filters],
    queryFn: () => getAllShiftLocations(filters),
  });
};
export const useAllShiftBlocks = (filters?: FilterCondition[]) => {
  return useQuery({
    queryKey: ["all-shift-blocks", filters],
    queryFn: () => getAllShiftBlocks(filters),
  });
};
