/**
 * Shared static configuration for policy drawer settings.
 * Used by AttendanceSummary and ViewPolicies components.
 */
export const DRAWER_SETTINGS: Record<
  string,
  { doctypeName: string; useEmployeeAsTarget?: boolean }
> = {
  "Current Shift": { doctypeName: "Shift Type" },
  "Attendance Method": {
    doctypeName: "Employee",
    useEmployeeAsTarget: true,
  },
  "Week Off": { doctypeName: "Week Off" },
  "Attendance Policy": { doctypeName: "Attendance Policies" },
  "Overtime Policy": { doctypeName: "Overtime Policy" },
};

/**
 * Returns the CSS class string for a policy status badge.
 * Handles null/undefined status safely.
 */
export const getStatusStyle = (status?: string | null): string => {
  if (!status || status === "----") return "bg-yellow-100 text-yellow-700";
  if (status.toLowerCase() === "yes") return "bg-blue-100 text-blue-700";
  return "bg-red-100 text-red-700";
};
