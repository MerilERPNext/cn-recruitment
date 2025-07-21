import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { attendanceService } from '../services/attendanceService';
import type { Attendance } from '../types/attendance';
import { FilterCondition } from '../types/frappe';

// Retry logic (same as other hooks)
const isPermissionError = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message.includes('permission') ||
    error.message.includes('403') ||
    error.message.includes('Access Restricted'));

const defaultRetry = (failureCount: number, error: unknown) =>
  isPermissionError(error) ? false : failureCount < 3;

const defaultQueryOptions = {
  staleTime: 1000 * 60 * 60 * 2, // 2 hours
  gcTime: 1000 * 60 * 60 * 3, // 3 hours
  retry: defaultRetry,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
};


export const useAllAttendance = (): UseQueryResult<Attendance[], Error> => {
  return useQuery<Attendance[], Error>({
    queryKey: ['attendance', 'all'],
    queryFn: () => attendanceService.getAllAttendance(),
    refetchOnWindowFocus: true,
    ...defaultQueryOptions,
  });
};


export const useAttendanceById = (id: string | null): UseQueryResult<Attendance, Error> => {
  return useQuery<Attendance, Error>({
    queryKey: ['attendance', id],
    queryFn: () => attendanceService.getAttendanceById(id!),
    enabled: !!id,
    ...defaultQueryOptions,
  });
};

const defaultStaleTime = 1000 * 60 * 2; // 2 min
const defaultGcTime = 1000 * 60 * 2; // 2 min

export const useAttendance = (
  filters: FilterCondition[],
  queryKeySuffix: unknown = filters,
): UseQueryResult<Attendance[], Error> => {
  return useQuery<Attendance[], Error>({
    queryKey: ["attendance", queryKeySuffix],
    queryFn: () => attendanceService.getAttendance(filters),
    staleTime: defaultStaleTime,
    gcTime: defaultGcTime,
    enabled: filters.length > 0,
  });
};