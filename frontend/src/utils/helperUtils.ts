import { differenceInMinutes, format, isAfter, parseISO } from "date-fns";

export const gradientClassMap: Record<string, string> = {
  present: "#dcfce7", // green-100
  absent: "#FEE2E2", // red-100
  leave: "#FEF9C3", // orange-100
  "work from home": "#f3e8ff", // purple-100
  holiday: "#dbeafe",
  "week off": "#f3f4f6",
};

export const getStatusGradient = (firstHalf: string, secondHalf: string) => {
  const gradient = `linear-gradient(to bottom right, ${
    gradientClassMap[firstHalf?.toLowerCase()]
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
      "0"
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

export function formatDateString(dateString: string) {
  if (!dateString || isNaN(Date.parse(dateString))) return "Invalid date";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
      new Date(b.time.replace(" ", "T")).getTime()
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
      }
    );
  });
}
