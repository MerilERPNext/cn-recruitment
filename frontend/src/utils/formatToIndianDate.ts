/**
 * formatToIndianDate.ts
 *
 * All date-formatting utilities in this file now read the active date format
 * from `dateFormatStore` at call-time, so the display format automatically
 * reflects whatever the system administrator has configured in backend.
 *
 * Supported output formats (driven by backend API):
 *   "yyyy-mm-dd" | "dd-mm-yyyy" | "dd/mm/yyyy" |
 *   "dd.mm.yyyy" | "mm/dd/yyyy" | "mm-dd-yyyy"
 *
 * Input can be:
 *   - A JS Date object
 *   - A Unix timestamp (number)
 *   - An ISO/MySQL date string in any reasonable format
 *     (e.g. "2026-04-28", "2026-04-28 12:32:27", "28-04-2026", "04/28/2026", …)
 */

import {
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
} from "date-fns";
import { getDateFormat, type SupportedDateFormat } from "./dateFormatStore";

const buildDateString = (
  dd: string,
  mm: string,
  yyyy: string,
  format: SupportedDateFormat,
): string => {
  switch (format) {
    case "yyyy-mm-dd":
      return `${yyyy}-${mm}-${dd}`;
    case "dd-mm-yyyy":
      return `${dd}-${mm}-${yyyy}`;
    case "dd/mm/yyyy":
      return `${dd}/${mm}/${yyyy}`;
    case "dd.mm.yyyy":
      return `${dd}.${mm}.${yyyy}`;
    case "mm/dd/yyyy":
      return `${mm}/${dd}/${yyyy}`;
    case "mm-dd-yyyy":
      return `${mm}-${dd}-${yyyy}`;
    default:
      return `${dd}-${mm}-${yyyy}`; // safe fallback
  }
};

/**
 * Attempt to parse any reasonably formatted date string into a JS Date.
 * Handles:
 *   - ISO  : "2026-04-28", "2026-04-28T12:32:27Z"
 *   - MySQL: "2026-04-28 12:32:27.983001"
 *   - All six output formats written back as input (e.g. "28-04-2026",
 *     "28/04/2026", "28.04.2026", "04/28/2026", "04-28-2026")
 */
const parseDate = (raw: string): Date | null => {
  // 1. Standard ISO / yyyy-mm-dd  → native Date handles this fine
  //    Also handles "2026-04-28 12:32:27.983001" via space→T swap
  const normalized = raw.trim().replace(" ", "T");
  const direct = new Date(normalized);
  if (!isNaN(direct.getTime())) return direct;

  // 2. dd-mm-yyyy  or  dd.mm.yyyy  →  reorder to yyyy-mm-dd
  const ddmmyyyy = raw.match(
    /^(\d{2})[-./](\d{2})[-./](\d{4})([ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?)?$/,
  );
  if (ddmmyyyy) {
    const [, d, m, y, time = ""] = ddmmyyyy;
    const attempt = new Date(`${y}-${m}-${d}${time ? "T" + time.trim() : ""}`);
    if (!isNaN(attempt.getTime())) return attempt;
  }

  // 3. mm-dd-yyyy  or  mm/dd/yyyy  →  reorder to yyyy-mm-dd
  //    (ambiguous with dd-mm-yyyy when dd <= 12; we treat the system format as
  //    the hint, but for *input parsing* we try both and take the first valid one)
  const mmddyyyy = raw.match(
    /^(\d{2})[-./](\d{2})[-./](\d{4})([ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?)?$/,
  );
  if (mmddyyyy) {
    const [, p1, p2, y, time = ""] = mmddyyyy;
    // Try mm/dd/yyyy interpretation
    const attempt = new Date(
      `${y}-${p1}-${p2}${time ? "T" + time.trim() : ""}`,
    );
    if (!isNaN(attempt.getTime())) return attempt;
  }

  return null;
};

const formatToIndianDate = (dateInput: string | number | Date): string => {
  if (!dateInput) return "";

  const format = getDateFormat();

  try {
    let date: Date;

    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === "number") {
      date = new Date(dateInput);
    } else {
      const parsed = parseDate(dateInput);
      if (!parsed) return "";
      date = parsed;
    }

    if (isNaN(date.getTime())) return "";

    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = String(date.getFullYear());

    return buildDateString(dd, mm, yyyy, format);
  } catch {
    return "";
  }
};

export default formatToIndianDate;

/**
 * Replaces all ISO-format dates (yyyy-mm-dd) embedded inside a plain text
 * string with the admin-configured display format.
 *
 * Example (with system format "dd.mm.yyyy"):
 *   "Overtime on 2026-05-16 (Full Day)"
 *   → "Overtime on 16.05.2026 (Full Day)"
 *
 * Safe to call on any string — if no ISO dates are found the original value
 * is returned unchanged.
 */
export const formatDatesInText = (text: string): string => {
  if (!text) return text;
  // Match yyyy-mm-dd, optionally preceded/followed by non-digit chars
  return text.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_match, yyyy, mm, dd) => {
    return buildDateString(dd, mm, yyyy, getDateFormat());
  });
};

export const formatToIndianDateWithTime = (
  dateInput: string | number | Date,
): string => {
  if (!dateInput) return "";

  const format = getDateFormat();

  try {
    let date: Date;

    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === "number") {
      date = new Date(dateInput);
    } else {
      // Normalise MySQL/ISO datetime strings  e.g. "2026-04-28 12:32:27.983001"
      const normalized = dateInput.replace(" ", "T");
      date = new Date(normalized);

      if (isNaN(date.getTime())) {
        const parsed = parseDate(dateInput);
        if (!parsed) return "";
        date = parsed;
      }
    }

    if (isNaN(date.getTime())) return "";

    // Convert to Indian timezone for display
    const indianDate = new Date(
      date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    );

    const dd = String(indianDate.getDate()).padStart(2, "0");
    const mm = String(indianDate.getMonth() + 1).padStart(2, "0");
    const yyyy = String(indianDate.getFullYear());

    const hours = String(indianDate.getHours()).padStart(2, "0");
    const minutes = String(indianDate.getMinutes()).padStart(2, "0");
    const seconds = String(indianDate.getSeconds()).padStart(2, "0");

    return `${buildDateString(dd, mm, yyyy, format)} ${hours}:${minutes}:${seconds}`;
  } catch {
    return "";
  }
};

export const formatEndDate = (endDate: string | null | undefined): string => {
  if (!endDate) return "Present";
  return formatToIndianDate(endDate);
};

export function formatDateDDMonthYYYY(
  dateString?: string | number | Date | null
): string {
  if (!dateString) return "—";
  try {
    const parsed =
      typeof dateString === "string"
        ? parseDate(dateString) || new Date(dateString)
        : dateString instanceof Date
          ? dateString
          : new Date(dateString);

    if (!parsed || isNaN(parsed.getTime())) return "—";
    const day = parsed.getDate();
    const month = parsed.toLocaleString("en-US", { month: "short" });
    const year = parsed.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return "—";
  }
}

export function getDays(from_date: string, to_date: string): number {
  if (!from_date || !to_date) return 0;
  const fromDate = startOfDay(parseISO(from_date));
  const toDate = startOfDay(parseISO(to_date));
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return 0;
  return differenceInCalendarDays(toDate, fromDate) + 1; // inclusive
}

export const formatTime = (timeString?: string): string => {
  if (!timeString) return "-";

  try {
    // Split microseconds if present
    const [hms] = timeString.split(".");

    const parts = hms.split(":");

    if (parts.length !== 3) return timeString;

    const [hours, minutes, seconds] = parts;

    // Ensure all parts exist
    if (!hours || !minutes || !seconds) return timeString;

    // Normalize to HH:mm:ss
    const normalizedTime = [
      hours.padStart(2, "0"),
      minutes.padStart(2, "0"),
      seconds.padStart(2, "0"),
    ].join(":");

    const date = new Date(`1970-01-01T${normalizedTime}`);

    // Validate date
    if (isNaN(date.getTime())) return timeString;

    // 24-hour format
    return format(date, "HH:mm");
  } catch {
    return timeString;
  }
};

export function calculateEndMonth(startDate: string, tenure: number) {
  if (!startDate || !tenure) return "-";

  const date = parseDate(startDate) || new Date(startDate);
  if (isNaN(date.getTime())) return "-";

  date.setMonth(date.getMonth() + tenure);

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  
  const format = getDateFormat();

  switch (format) {
    case "yyyy-mm-dd":
      return `${year}-${month}`;
    case "dd-mm-yyyy":
    case "mm-dd-yyyy":
      return `${month}-${year}`;
    case "dd/mm/yyyy":
    case "mm/dd/yyyy":
      return `${month}/${year}`;
    case "dd.mm.yyyy":
      return `${month}.${year}`;
    default:
      return `${month}-${year}`;
  }
}


export const formatLogTimestamp = (value: string): { date: string; time: string } => {
  // API returns MySQL datetime with microseconds, ex: "2026-04-23 18:30:36.815713"
  if (!value) return { date: "", time: "" };

  try {
    const normalized = value.replace(" ", "T");
    const [base, fractional] = normalized.split(".");
    
    // Check if the input specifies a timezone (ends with Z or has +/- offset)
    const hasTimezone = /Z|[+-]\d{2}:?\d{2}$/.test(value);

    let d: Date;
    if (hasTimezone) {
      let safeIso = normalized;
      if (fractional) {
        const tzMatch = fractional.match(/Z|[+-].*$/);
        const tzSuffix = tzMatch ? tzMatch[0] : "";
        const numericFraction = tzMatch ? fractional.slice(0, tzMatch.index) : fractional;
        safeIso = `${base}.${numericFraction.slice(0, 3)}${tzSuffix}`;
      }
      d = new Date(safeIso);
    } else {
      const safeIso = fractional
        ? `${base}.${fractional.slice(0, 3)}Z`
        : `${base}Z`;
      d = new Date(safeIso);
    }

    if (Number.isNaN(d.getTime())) return { date: "", time: "" };

    if (hasTimezone) {
      const dateParts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).formatToParts(d);

      const day = dateParts.find((p) => p.type === "day")?.value ?? "";
      const month = dateParts.find((p) => p.type === "month")?.value ?? "";
      const year = dateParts.find((p) => p.type === "year")?.value ?? "";
      const format = getDateFormat();
      const date = day && month && year ? buildDateString(day, month, year, format) : "";

      const time = d.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      return { date, time };
    } else {
      const day = String(d.getUTCDate()).padStart(2, "0");
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      const year = String(d.getUTCFullYear());
      const format = getDateFormat();
      const date = buildDateString(day, month, year, format);

      let hours = d.getUTCHours();
      const minutes = String(d.getUTCMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedHours = String(hours).padStart(2, "0");
      const time = `${formattedHours}:${minutes} ${ampm}`;

      return { date, time };
    }
  } catch (error) {
    console.error("Error formatting log timestamp:", error);
    return { date: "", time: "" };
  }
};