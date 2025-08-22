import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import { attendanceService } from "../services/attendanceService";
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
} from "../types/attendance";
import { FilterCondition } from "../types/frappe";

// Retry logic (same as other hooks)
const isPermissionError = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message.includes("permission") ||
    error.message.includes("403") ||
    error.message.includes("Access Restricted"));

const defaultRetry = (failureCount: number, error: unknown) =>
  isPermissionError(error) ? false : failureCount < 3;

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
    queryKey: ["home-summary-details", filters],
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
    queryKey: ["employee-shift", userId],
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    queryKey: ["employee-attendance-summary", fromDate],
    queryFn: () =>
      attendanceService.getQuickAttendanceSummary(employeeId, fromDate, toDate),
    enabled: !!employeeId,
    refetchOnWindowFocus: true,
    ...defaultQueryOptions,
  });
};
export const useAllAttendanceRequests = (
  pageSize: number,
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
    queryFn: () => attendanceService.getAllEventsAndAttendance(filters),
    refetchOnWindowFocus: true,
    ...defaultQueryOptions,
  });
};
export const useGetPolicyForDate = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  id: string | null
): UseQueryResult<Attendance, Error> => {
  return useQuery<Attendance, Error>({
    queryKey: ["attendance", id],
    queryFn: () => attendanceService.getAttendanceById(id!),
    enabled: !!id,
    ...defaultQueryOptions,
  });
};
export const useAttendancePolicies = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
