import { useGetUnreadNotificationCount } from "./useNotification";
import { NOTIFICATION_TITLE_MAP } from "../utils/helperUtils";
import useCurrentUser from "./useCurrentUser";

export const useAppNotificationCounts = () => {
  const { data: currentUser } = useCurrentUser();
  const { data: notificationData } = useGetUnreadNotificationCount(
    currentUser?.name
  );

  const getCount = (uiLabel: string) => {
    if (!notificationData) return 0;

    const backendTitles = NOTIFICATION_TITLE_MAP[uiLabel];
    if (!backendTitles) return 0;

    return notificationData
      .filter((app) => backendTitles.includes(app.title))
      .reduce((sum, app) => {
        // Sum up self and allocated for all doctypes in the app
        const appTotal = app.doctypes.reduce((doctypeSum, dt) => {
          return doctypeSum + (dt.self || 0) + (dt.allocated || 0);
        }, 0);
        return sum + appTotal;
      }, 0);
  };

  const getCountByBackendTitle = (backendTitle?: string) => {
    // This might be less useful now, but let's keep it working with the new structure
    if (!backendTitle || !notificationData) return 0;

    const app = notificationData.find((app) => app.title === backendTitle);
    if (!app) return 0;

    return app.doctypes.reduce((sum, dt) => sum + (dt.self || 0) + (dt.allocated || 0), 0);
  };

  const getSubModuleCount = (
    uiLabel: string,
    subModuleLabel: string
  ): number => {
    if (!notificationData) return 0;

    const backendTitles = NOTIFICATION_TITLE_MAP[uiLabel];
    if (!backendTitles) return 0;

    // Find the relevant app
    const app = notificationData.find((app) =>
      backendTitles.includes(app.title)
    );

    if (!app || !app.doctypes) return 0;

    // Logic for specific sub-modules
    // Leaves & Holidays
    if (uiLabel === "Leaves & Holidays") {
      if (subModuleLabel === "My Requests") {
        const dt = app.doctypes.find((d) => d.doctype === "Leave Application");
        return dt?.self || 0;
      }
      if (subModuleLabel === "Team Requests") {
        const dt = app.doctypes.find((d) => d.doctype === "Leave Application");
        return dt?.allocated || 0;
      }
    }

    // Attendance
    if (uiLabel === "Attendance") {
      if (subModuleLabel === "My Requests") {
        const dt = app.doctypes.find((d) => d.doctype === "Attendance Request");
        return dt?.self || 0;
      }
      if (subModuleLabel === "Team Requests") {
        const dt = app.doctypes.find((d) => d.doctype === "Attendance Request");
        return dt?.allocated || 0;
      }
      if (subModuleLabel === "All Shifts") {
        const dt = app.doctypes.find((d) => d.doctype === "Shift Request");
        return (dt?.self || 0) + (dt?.allocated || 0);
      }
    }

    // Compensation (Salary Slip)
    if (uiLabel === "Compensation") {
      if (subModuleLabel === "My Loan Requests") {
        const dt = app.doctypes.find((d) => d.doctype === "Loan Application");
        return dt?.self || 0;
      }
      if (subModuleLabel === "Team Loan Requests") {
        const dt = app.doctypes.find((d) => d.doctype === "Loan Application");
        return dt?.allocated || 0;
      }
    }
    
    // Help Desk
    if (uiLabel === "Help Desk") {
        // Help Desk usually doesn't have sub-modules in the same way, but if it did:
         const dt = app.doctypes.find((d) => d.doctype === "HD Ticket");
         return (dt?.self || 0) + (dt?.allocated || 0);
    }

    // Expenses
    if (uiLabel === "Expenses") {
      if (subModuleLabel === "Expense Claims") {
        const dt = app.doctypes.find((d) => d.doctype === "Expense Claim");
        return dt?.self || 0;
      }
      if (subModuleLabel === "Team Requests") {
        const dt = app.doctypes.find((d) => d.doctype === "Expense Claim");
        return dt?.allocated || 0;
      }
    }

    return 0;
  };

  return {
    getCount,
    getCountByBackendTitle,
    getSubModuleCount,
  };
};
