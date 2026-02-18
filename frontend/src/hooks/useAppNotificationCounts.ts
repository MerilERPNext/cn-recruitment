import { useGetUnreadNotificationCount } from "./useNotification";
import { NOTIFICATION_TITLE_MAP } from "../utils/helperUtils";
import useCurrentUser from "./useCurrentUser";

export const useAppNotificationCounts = () => {
  const { data: currentUser } = useCurrentUser();
  const { data: notificationData } = useGetUnreadNotificationCount(
    currentUser?.name
  );

  // ✅ Always array
  const safeData = Array.isArray(notificationData)
    ? notificationData
    : [];

  // ------------------------------------------------

  const getCount = (uiLabel: string) => {
    const backendTitles = NOTIFICATION_TITLE_MAP[uiLabel];
    if (!backendTitles) return 0;

    return safeData
      .filter((app) => backendTitles.includes(app?.title))
      .reduce((sum, app) => {
        const doctypes = Array.isArray(app?.doctypes)
          ? app.doctypes
          : [];

        const appTotal = doctypes.reduce((doctypeSum, dt) => {
          return doctypeSum + (dt?.self || 0) + (dt?.allocated || 0);
        }, 0);

        return sum + appTotal;
      }, 0);
  };

  // ------------------------------------------------

  const getCountByBackendTitle = (backendTitle?: string) => {
    if (!backendTitle) return 0;

    const app = safeData.find(
      (app) => app?.title === backendTitle
    );

    if (!app) return 0;

    const doctypes = Array.isArray(app.doctypes)
      ? app.doctypes
      : [];

    return doctypes.reduce(
      (sum, dt) => sum + (dt?.self || 0) + (dt?.allocated || 0),
      0
    );
  };

  // ------------------------------------------------

  const getSubModuleCount = (
    uiLabel: string,
    subModuleLabel: string
  ): number => {

    const backendTitles = NOTIFICATION_TITLE_MAP[uiLabel];
    if (!backendTitles) return 0;

    const app = safeData.find((app) =>
      backendTitles.includes(app?.title)
    );

    if (!app) return 0;

    const doctypes = Array.isArray(app.doctypes)
      ? app.doctypes
      : [];

    // Leaves & Holidays
    if (uiLabel === "Leaves & Holidays") {
      const dt = doctypes.find(d => d.doctype === "Leave Application");

      if (subModuleLabel === "My Requests") return dt?.self || 0;
      if (subModuleLabel === "Team Requests") return dt?.allocated || 0;
    }

    // Attendance
    if (uiLabel === "Attendance") {
      if (subModuleLabel === "My Requests") {
        const dt = doctypes.find(d => d.doctype === "Attendance Request");
        return dt?.self || 0;
      }

      if (subModuleLabel === "Team Requests") {
        const dt = doctypes.find(d => d.doctype === "Attendance Request");
        return dt?.allocated || 0;
      }

      if (subModuleLabel === "All Shifts") {
        const dt = doctypes.find(d => d.doctype === "Shift Request");
        return (dt?.self || 0) + (dt?.allocated || 0);
      }
    }

    // Compensation
    if (uiLabel === "Compensation") {
      const dt = doctypes.find(d => d.doctype === "Loan Application");

      if (subModuleLabel === "My Loan Requests") return dt?.self || 0;
      if (subModuleLabel === "Team Loan Requests") return dt?.allocated || 0;
    }

    // Help Desk
    if (uiLabel === "Help Desk") {
      const dt = doctypes.find(d => d.doctype === "HD Ticket");
      return (dt?.self || 0) + (dt?.allocated || 0);
    }

    // Expenses
    if (uiLabel === "Expenses") {
      const dt = doctypes.find(d => d.doctype === "Expense Claim");

      if (subModuleLabel === "Expense Claims") return dt?.self || 0;
      if (subModuleLabel === "Team Requests") return dt?.allocated || 0;
    }

    return 0;
  };

  // ------------------------------------------------

  return {
    getCount,
    getCountByBackendTitle,
    getSubModuleCount,
  };
};
