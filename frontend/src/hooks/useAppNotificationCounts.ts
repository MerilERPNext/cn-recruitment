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

    const labelSubLabelCountMap: {
      Label: string;
      subLabels: Record<string, { backendMap: string; count_value: string[] }>;
    }[] = [
        {
          Label: "Leaves & Holidays",
          subLabels: {
            "My Requests": {
              backendMap: "Leave Application",
              count_value: ["self"]
            },
            "Team Requests": {
              backendMap: "Leave Application",
              count_value: ["allocated"]
            },
            "Compensatory": {
              backendMap: "Compensatory Leave Request",
              count_value: ["self", "allocated"]
            }
          },
        },
        {
          Label: "Attendance",
          subLabels: {
            "My Requests": {
              backendMap: "Attendance Request",
              count_value: ["self"]
            },
            "Team Requests": {
              backendMap: "Attendance Request",
              count_value: ["allocated"]
            },
            "All Shifts": {
              backendMap: "Shift Request",
              count_value: ["self", "allocated"]
            }
          }
        }, {
          Label: "Compensation",
          subLabels: {
            "My Loan Requests": {
              backendMap: "Loan Application",
              count_value: ["self"]
            },
            "Team Loan Requests": {
              backendMap: "Leave Application",
              count_value: ["allocated"]
            }
          }
        }, {
          Label: "Help Desk",
          subLabels: {
            "All Requests": {
              backendMap: "HD Ticket",
              count_value: ["self", "allocated"]
            }
          }
        }, {
          Label: "Expenses",
          subLabels: {
            "Expense Claims": {
              backendMap: "Expense Claim",
              count_value: ["self"]
            },
            "Team Requests": {
              backendMap: "Expense Claim",
              count_value: ["allocated"]
            }
          }
        }
      ]

    const module = labelSubLabelCountMap.find((item) => item.Label === uiLabel);
    if (!module) return 0;

    const subModule = module.subLabels[subModuleLabel];

    if (!subModule) return 0;

    const backendMap = subModule.backendMap;
    const count_value = subModule?.count_value ?? [];

    const dt = doctypes.find(d => d.doctype === backendMap);
    if (!dt) return 0;

    return count_value.reduce((acc: number, curr) => acc + Number(dt[curr as keyof typeof dt] ?? 0), 0);
  };

  // ------------------------------------------------

  return {
    getCount,
    getCountByBackendTitle,
    getSubModuleCount,
  };
};
