/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  differenceInMinutes,
  endOfMonth,
  format,
  isAfter,
  isValid,
  parse,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import { FilterCondition, FilterOperator } from "../types/frappe";
import { MonthOption } from "../components/Attendance/AllEmpAttendance/SelectByMonth";

export const gradientClassMap: Record<string, string> = {
  present: "#dcfce7", // green-100
  absent: "#FEE2E2", // red-100
  leave: "#FEF9C3", // orange-100
  "work from home": "#f3e8ff", // purple-100
  holiday: "#dbeafe",
  "week off": "#f3f4f6",
};

export const getStatusGradient = (firstHalf: string, secondHalf: string) => {
  const gradient = `linear-gradient(to bottom right, ${gradientClassMap[firstHalf?.toLowerCase()]
    } 50%, ${gradientClassMap[secondHalf?.toLowerCase()]} 50%)`;
  return { background: gradient };
};

export function timeSinceFormatted(date: Date): string {
  const now = new Date();
  const diffMs: number = now.getTime() - date.getTime();

  const diffMinutes: number = Math.floor(diffMs / (1000 * 60));
  const hours: number = Math.floor(diffMinutes / 60);
  const minutes: number = diffMinutes % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0",
    )}h`;
  } else {
    return `00:${String(minutes).padStart(2, "0")}m`;
  }
}

export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // months are 0-based
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


export function formatDateToDDMMYYYY(
  value: string | number | Date
): string {
  if (value === null || value === undefined) return "";

  let date: Date | null = null;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "string") {
    date = parseISO(value);
  } else if (typeof value === "number") {
    date = new Date(value);
  }

  if (!date || !isValid(date)) {
    return String(value);
  }

  return format(date, "dd-MM-yyyy");
}


export function formatTo24HourTime(isoString: string): string {
  const date = parseISO(isoString.replace(" ", "T"));
  return format(date, "HH:mm");
}

interface LogEntry {
  name: string;
  employee: string;
  time: string;
  log_type: "IN" | "OUT";
  shift: string;
  shift_start: string;
  shift_end: string;
  shift_actual_start: string;
  shift_actual_end: string;
}
// Total time worked between checkin/checkout time from from first checkin to last checkout
export const getTotalTime = (logs: LogEntry[] | undefined): string => {
  if (!logs || logs.length === 0) return "--:--";

  // Sort logs by time ascending
  const sortedLogs = [...logs].sort(
    (a, b) =>
      new Date(a.time.replace(" ", "T")).getTime() -
      new Date(b.time.replace(" ", "T")).getTime(),
  );

  let totalMinutes = 0;
  let lastInTime: Date | null = null;

  for (const log of sortedLogs) {
    const logTime = parseISO(log.time.replace(" ", "T"));

    if (log.log_type === "IN") {
      lastInTime = logTime;
    } else if (log.log_type === "OUT" && lastInTime) {
      const minutesWorked = differenceInMinutes(logTime, lastInTime);
      if (minutesWorked > 0) {
        totalMinutes += minutesWorked;
      }
      lastInTime = null;
    }
  }
  // If last log is IN with no matching OUT, add time from IN to now
  if (lastInTime) {
    const now = new Date();
    if (isAfter(now, lastInTime)) {
      totalMinutes += differenceInMinutes(now, lastInTime);
    }
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export async function getDeviceLocation(): Promise<Coordinates> {
  try {
    const location = await window.nativeInterface.execute("getLocation");
    if (location?.mocked) {
      throw new Error("Mocked location not allowed.");
    }
    if (
      !location ||
      !location.coords ||
      typeof location.coords.latitude !== "number" ||
      typeof location.coords.longitude !== "number"
    ) {
      throw new Error("Invalid location data received.");
    }

    const { latitude, longitude } = location.coords;
    return { latitude, longitude };
  } catch (error) {
    throw new Error("Error getting location: " + (error as Error).message);
  }
}

export async function getDeviceLocationWeb(): Promise<Coordinates> {
  if (!navigator.geolocation) {
    throw new Error("Geolocation is not supported by this browser.");
  }
  if (navigator.permissions) {
    try {
      const permissionStatus = await navigator.permissions.query({
        name: "geolocation",
      });

      if (permissionStatus.state === "denied") {
        throw new Error("Location permission was denied.");
      }
    } catch (err) {
      console.warn("Could not verify permissions:", err);
    }
  }
  return new Promise<Coordinates>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position: GeolocationPosition) => {
        const { latitude, longitude } = position.coords;
        resolve({ latitude, longitude });
      },
      (error: GeolocationPositionError) => {
        reject(new Error("Error getting location: " + error.message));
      },
    );
  });
}

export const getLocationName = async (latitude: number, longitude: number) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      {
        headers: {
          "User-Agent": "hr-management-system/1.0",
          "Accept-Language": "en",
        },
      }
    );

    const data = await res.json();

    return (
      data.display_name ||
      `${latitude}, ${longitude}`
    );
  } catch (error) {
    console.error("Error fetching location name:", error);
    return "Unable to fetch location";
  }
};

export const formatTimeSafe = (timeStr: string | undefined) => {
  if (!timeStr) return "--:--";
  try {
    const parsed = parse(timeStr, "HH:mm:ss", new Date());
    if (!isValid(parsed)) return "--:--";
    return format(parsed, "HH:mm");
  } catch {
    return "--:--";
  }
};

type FiltersObject = Record<string, unknown>;
type FilterTuple = [FilterOperator, unknown];

const validOperators: Set<FilterOperator> = new Set([
  "=",
  "!=",
  ">",
  "<",
  ">=",
  "<=",
  "like",
  "not like",
  "in",
  "not in",
  "is",
  "is not",
  "between",
]);

const isFilterTuple = (val: unknown): val is FilterTuple => {
  return (
    Array.isArray(val) &&
    val.length === 2 &&
    typeof val[0] === "string" &&
    validOperators.has(val[0] as FilterOperator)
  );
};

export const mapFiltersToConditions = (
  filtersObj: FiltersObject,
): FilterCondition[] => {
  return Object.entries(filtersObj).map(([key, value]) => {
    if (isFilterTuple(value)) {
      const [operator, val] = value;
      return [key, operator, val];
    }
    return [key, "=", value];
  });
};

//Badge status color
// badgeHelpers.ts
export type BadgeSize = "sm" | "md" | "lg";

export interface BadgePropsFromHelper {
  backgroundColor: string; // tailwind bg-*
  textColor: string; // tailwind text-*
  size?: BadgeSize;
}

/**
 * For status strings like "Open", "Closed", "In Progress", etc.
 */
export const getBadgePropsByStatus = (
  status?: string,
): BadgePropsFromHelper => {
  if (!status) {
    return {
      backgroundColor: "bg-gray-100",
      textColor: "text-gray-600",
      size: "sm",
    };
  }

  switch (status.toLowerCase()) {
    case "open":
    case "rejected":
      return {
        backgroundColor: "bg-[#ffeaea]",
        textColor: "text-red-500",
        size: "sm",
      };

    case "closed":
    case "done":
    case "approved":
    case "completed":
      return {
        backgroundColor: "bg-[#eaffea]",
        textColor: "text-green-600",
        size: "sm",
      };

    case "in progress":
    case "progress":
      return {
        backgroundColor: "bg-blue-100",
        textColor: "text-blue-600",
        size: "sm",
      };

    case "on hold":
    case "pending":
      return {
        backgroundColor: "bg-yellow-100",
        textColor: "text-yellow-700",
        size: "sm",
      };

    default:
      return {
        backgroundColor: "bg-gray-100",
        textColor: "text-gray-600",
        size: "sm",
      };
  }
};

/**
 * For priority strings like "Low", "Medium", "High", "Urgent"
 */
export const getBadgePropsByPriority = (
  priority?: string,
): BadgePropsFromHelper => {
  if (!priority) {
    return {
      backgroundColor: "bg-gray-100",
      textColor: "text-gray-600",
      size: "sm",
    };
  }

  switch (priority.toLowerCase()) {
    case "low":
      return {
        backgroundColor: "bg-green-100",
        textColor: "text-green-600",
        size: "sm",
      };
    case "medium":
      return {
        backgroundColor: "bg-yellow-100",
        textColor: "text-yellow-600",
        size: "sm",
      };
    case "high":
      return {
        backgroundColor: "bg-orange-100",
        textColor: "text-orange-600",
        size: "sm",
      };
    case "urgent":
      return {
        backgroundColor: "bg-red-100",
        textColor: "text-red-600",
        size: "sm",
      };
    default:
      return {
        backgroundColor: "bg-gray-100",
        textColor: "text-gray-600",
        size: "sm",
      };
  }
};

export const generateMonthOptions = (count: number): MonthOption[] => {
  const now = new Date();

  return Array.from({ length: count }, (_, i) => {
    const date = subMonths(now, i);
    return {
      label: format(date, "MMM-yyyy"),
      value: format(date, "yyyy-MM"),
    };
  });
};

export function getDatesBetween(start: string, end: string): string[] {
  const dates: string[] = [];

  // normalize to YYYY-MM-DD first
  const startDate = start.split("T")[0];
  const endDate = end.split("T")[0];

  // force local-safe time
  const current = new Date(`${startDate}T12:00:00`);
  const last = new Date(`${endDate}T12:00:00`);

  while (current <= last) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export const getMonthDateRange = (monthValue: string) => {
  const parsedMonth = parse(monthValue, "yyyy-MM", new Date());

  return {
    frm_date: format(startOfMonth(parsedMonth), "yyyy-MM-dd"),
    to_date: format(endOfMonth(parsedMonth), "yyyy-MM-dd"),
  };
};

export const buildLeavePayload = ({
  employee,
  submission,
  dailyConfig,
}: {
  employee: string;
  submission: any;
  dailyConfig?: Record<string, "Full Day" | "First Half" | "Second Half">;
}) => {
  const isSingleDay =
    submission.fromDate?.split("T")[0] === submission.toDate?.split("T")[0];

  const basePayload: any = {
    employee,
    leave_type: submission.leaveType,
    from_date: submission.fromDate?.split("T")[0],
    to_date: submission.toDate?.split("T")[0],
    description: submission.description,
    custom_reason: submission.custom_reason,
    custom_attachment: submission?.custom_attachment?.[0]?.url,
  };

  // No half-day selected
  if (!submission.halfDay) {
    return {
      ...basePayload,
      half_day: 0,
    };
  }

  // Single day with half-day
  if (isSingleDay) {
    return {
      ...basePayload,
      half_day: 1,
      custom_half_day_type: submission.halfDayOption, // "First Half" or "Second Half"
    };
  }

  // Multiple days with half-day - always use individual mode
  return {
    ...basePayload,
    individual: 1,
    individual_dates: Object.entries(dailyConfig || {}).map(([date, type]) => ({
      date,
      half_day: type === "Full Day" ? 0 : 1,
      half_day_type: type === "Full Day" ? "" : type,
    })),
  };
};

export const NOTIFICATION_TITLE_MAP: Record<string, string[]> = {
  "Help Desk": ["Helpdesk"],
  Compensation: ["Salary Slip"],
  "Leaves & Holidays": ["Leaves"],
  Attendance: ["Attendance"],
  Expenses: ["Expenses"],
};
