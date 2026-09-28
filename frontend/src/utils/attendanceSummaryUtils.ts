import {
  compareAsc,
  compareDesc,
  differenceInMinutes,
  endOfDay,
  format,
  parseISO,
  startOfDay,
} from "date-fns";
import { EmployeeCheckInLog } from "../types/attendance";
import { formatTo24HourTime } from "./helperUtils";

export interface TodayAttendanceFilters {
  start: string;
  end: string;
  encodedFilters: string;
}

/**
 * Returns start, end, and encoded filters for querying today's attendance logs
 */
export const getTodayAttendanceFilters = (date: Date = new Date()): TodayAttendanceFilters => {
  const start = format(startOfDay(date), "yyyy-MM-dd HH:mm:ss");
  const end = format(endOfDay(date), "yyyy-MM-dd HH:mm:ss");
  const filters = {
    time: ["between", [start, end]],
  };
  const encodedFilters = encodeURIComponent(JSON.stringify(filters));
  return { start, end, encodedFilters };
};

export interface CheckInSummary {
  checkIns: EmployeeCheckInLog[];
  checkOuts: EmployeeCheckInLog[];
  firstCheckIn: EmployeeCheckInLog | undefined;
  lastCheckOut: EmployeeCheckInLog | undefined;
  lastLog: EmployeeCheckInLog | undefined;
  isCurrentlyCheckedIn: boolean;
  inTime: string;
  outTime: string;
  totalWorkingMinutes: number;
  totalWorkingHours: string;
  workPercentage: number;
}

/**
 * Centralized calculation of check-in, check-out, working hours, and work percentage
 * from employee check-in logs. Matches the calculation logic used on DesktopDashboard and MobileDashboard.
 */
export const calculateCheckInSummary = (
  homeSummary?: EmployeeCheckInLog[],
  currentTime: Date = new Date(),
  standardWorkingHours?: number,
): CheckInSummary => {
  if (!homeSummary || homeSummary.length === 0) {
    return {
      checkIns: [],
      checkOuts: [],
      firstCheckIn: undefined,
      lastCheckOut: undefined,
      lastLog: undefined,
      isCurrentlyCheckedIn: false,
      inTime: "--:--",
      outTime: "--:--",
      totalWorkingMinutes: 0,
      totalWorkingHours: "--:--",
      workPercentage: 0,
    };
  }

  const checkIns = homeSummary.filter((log) => log.log_type === "IN");
  const checkOuts = homeSummary.filter((log) => log.log_type === "OUT");

  const firstCheckIn = checkIns.length
    ? [...checkIns].sort((a, b) =>
        compareAsc(
          parseISO(a.time.replace(" ", "T")),
          parseISO(b.time.replace(" ", "T")),
        ),
      )[0]
    : undefined;

  const lastCheckOut = checkOuts.length
    ? [...checkOuts].sort((a, b) =>
        compareDesc(
          parseISO(a.time.replace(" ", "T")),
          parseISO(b.time.replace(" ", "T")),
        ),
      )[0]
    : undefined;

  const lastLog = [...homeSummary].sort((a, b) =>
    compareDesc(
      parseISO(a.time.replace(" ", "T")),
      parseISO(b.time.replace(" ", "T")),
    ),
  )[0];

  const isCurrentlyCheckedIn = lastLog?.log_type === "IN";

  // Calculate total worked minutes
  let totalMinutes = 0;
  const sortedLogs = [...homeSummary].sort((a, b) =>
    compareAsc(
      parseISO(a.time.replace(" ", "T")),
      parseISO(b.time.replace(" ", "T")),
    ),
  );

  let currentCheckIn: EmployeeCheckInLog | null = null;

  for (const log of sortedLogs) {
    if (log.log_type === "IN") {
      currentCheckIn = log;
    } else if (log.log_type === "OUT" && currentCheckIn) {
      const checkInTime = parseISO(currentCheckIn.time.replace(" ", "T"));
      const checkOutTime = parseISO(log.time.replace(" ", "T"));
      totalMinutes += differenceInMinutes(checkOutTime, checkInTime);
      currentCheckIn = null;
    }
  }

  if (currentCheckIn && isCurrentlyCheckedIn) {
    const checkInTime = parseISO(currentCheckIn.time.replace(" ", "T"));
    totalMinutes += differenceInMinutes(currentTime, checkInTime);
  }

  const safeMinutes = Math.max(0, totalMinutes);
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  const totalWorkingHours = `${hours.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}`;

  // Calculate work percentage
  let workPercentage = 0;
  if (firstCheckIn?.shift_start && firstCheckIn?.shift_end) {
    const shiftStart = parseISO(firstCheckIn.shift_start.replace(" ", "T"));
    const shiftEnd = parseISO(firstCheckIn.shift_end.replace(" ", "T"));
    const totalShiftMinutes = standardWorkingHours
      ? standardWorkingHours * 60
      : differenceInMinutes(shiftEnd, shiftStart);
    if (totalShiftMinutes > 0) {
      workPercentage = Math.min(
        Math.round((safeMinutes / totalShiftMinutes) * 100),
        100,
      );
    }
  }

  const inTime = firstCheckIn?.time
    ? formatTo24HourTime(firstCheckIn.time)
    : "--:--";
  const outTime = lastCheckOut?.time
    ? formatTo24HourTime(lastCheckOut.time)
    : "--:--";

  return {
    checkIns,
    checkOuts,
    firstCheckIn,
    lastCheckOut,
    lastLog,
    isCurrentlyCheckedIn,
    inTime,
    outTime,
    totalWorkingMinutes: safeMinutes,
    totalWorkingHours,
    workPercentage,
  };
};
