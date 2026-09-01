import { UiPermissionResponse } from "../services/permissionService";
import { isPageEnabled } from "./uiPermission";

interface FallbackCandidate {
  pageName: string;
  appName?: string;
  route: string;
}

const FALLBACK_CANDIDATE_ROUTES: FallbackCandidate[] = [
  // Leaves and Holidays
  {
    appName: "Leaves and Holidays",
    pageName: "Leave Summary",
    route: "/webapp/leave-app/leaves/leave-balance",
  },
  {
    appName: "Leaves and Holidays",
    pageName: "My Requests",
    route: "/webapp/leave-app/leaves/leave-requests/my",
  },
  {
    appName: "Leaves and Holidays",
    pageName: "Team Requests",
    route: "/webapp/leave-app/leaves/leave-requests/team",
  },
  {
    appName: "Leaves and Holidays",
    pageName: "Holidays",
    route: "/webapp/leave-app/leaves/holidays",
  },
  {
    appName: "Leaves and Holidays",
    pageName: "Compensatory",
    route: "/webapp/leave-app/compensatory-request",
  },

  // Attendance
  {
    appName: "Attendance",
    pageName: "Attendance Summary",
    route: "/webapp/attendance/summary",
  },
  {
    appName: "Attendance",
    pageName: "My Attendance",
    route: "/webapp/attendance/emp-attendance",
  },
  {
    appName: "Attendance",
    pageName: "Team Attendance",
    route: "/webapp/attendance/team-attendance",
  },
  {
    appName: "Attendance",
    pageName: "My Requests",
    route: "/webapp/attendance/attendance-request",
  },
  {
    appName: "Attendance",
    pageName: "Team Requests",
    route: "/webapp/attendance/team-attendance-requests",
  },

  // Compensation
  {
    appName: "Compensation",
    pageName: "Pay Package",
    route: "/webapp/salary-slip-app/pay-package",
  },
  {
    appName: "Compensation",
    pageName: "Salary Slip",
    route: "/webapp/salary-slip-app/salary-slip-list",
  },
  {
    appName: "Compensation",
    pageName: "IT Declaration",
    route: "/webapp/salary-slip-app/it-declaration-form",
  },
  {
    appName: "Compensation",
    pageName: "Flexi Declaration",
    route: "/webapp/salary-slip-app/flexi-declaration-form",
  },
  {
    appName: "Compensation",
    pageName: "Tax Declaration Sheet",
    route: "/webapp/salary-slip-app/income-tax-sheet",
  },
  {
    appName: "Compensation",
    pageName: "Annual CTC",
    route: "/webapp/salary-slip-app/ctc-salary-breakdown?view=annual",
  },

  // Benefits
  {
    appName: "Benefits",
    pageName: "My Benefits",
    route: "/webapp/benefits-app/my-benefits",
  },
  {
    appName: "Benefits",
    pageName: "My Requests",
    route: "/webapp/benefits-app/my-requests",
  },
  {
    appName: "Benefits",
    pageName: "Team Requests",
    route: "/webapp/benefits-app/my-team-requests",
  },
  {
    appName: "Benefits",
    pageName: "Benefit Slips",
    route: "/webapp/benefits-app/benefits-slips",
  },

  // Expenses
  {
    appName: "Expenses",
    pageName: "Expense Summary",
    route: "/webapp/expenses-app/expense-summary",
  },
  {
    appName: "Expenses",
    pageName: "Expense Claims",
    route: "/webapp/expenses-app/expenses-list",
  },
  {
    appName: "Expenses",
    pageName: "Team Requests",
    route: "/webapp/expenses-app/team-requests",
  },

  // HR Process
  {
    appName: "HR Process",
    pageName: "Flow Requests",
    route: "/webapp/flow-app/flow-requests",
  },
  {
    appName: "HR Process",
    pageName: "Onboarding",
    route: "/webapp/flow-app/onboarding",
  },
  {
    appName: "HR Process",
    pageName: "Separation",
    route: "/webapp/flow-app/separation",
  },
  {
    appName: "HR Process",
    pageName: "Confirmation",
    route: "/webapp/flow-app/confirmation",
  },

  // Performance
  {
    appName: "Performance",
    pageName: "Overview",
    route: "/webapp/performance-app/overview",
  },
  {
    appName: "Performance",
    pageName: "My Team",
    route: "/webapp/performance-app/team-overview",
  },

  // Directory & Standalone
  {
    appName: "Employee Directory",
    pageName: "Employee Directory",
    route: "/webapp/employees-directory",
  },
  {
    appName: "Timesheet",
    pageName: "Timesheet",
    route: "/webapp/timesheet/timesheet-create",
  },
  {
    appName: "Policies",
    pageName: "Policies",
    route: "/webapp/policies-app",
  },
  {
    appName: "Employee Documents",
    pageName: "Employee Documents",
    route: "/webapp/employee-documents",
  },
  {
    appName: "Help Desk",
    pageName: "Help Desk",
    route: "/webapp/helpdesk",
  },
];

/**
 * Returns the target fallback route when impersonating another user and the dashboard is restricted:
 * 1. Profile route (/webapp/employee-profile) if user has permission to view Employee Profile.
 * 2. The first accessible/permitted page route as a fallback.
 */
export const getImpersonationFallbackRoute = (
  uiPermissions: UiPermissionResponse | undefined
): string => {
  // 1. If Profile is permitted, redirect to Profile
  if (isPageEnabled(uiPermissions, "Employee Profile")) {
    return "/webapp/employee-profile";
  }

  // 2. Otherwise find the first permitted candidate page
  if (uiPermissions && uiPermissions.length > 0) {
    for (const candidate of FALLBACK_CANDIDATE_ROUTES) {
      if (candidate.appName) {
        const appPerm = uiPermissions.find(
          (p) => p.app_name === candidate.appName
        );
        if (!appPerm || !appPerm.enabled) continue;
      }
      if (isPageEnabled(uiPermissions, candidate.pageName)) {
        return candidate.route;
      }
    }

    // 3. If none matched candidate pages directly, check if any app is enabled
    for (const app of uiPermissions) {
      if (!app.enabled) continue;
      const enabledPage = app.pages?.find((p) => p.enabled);
      if (enabledPage) {
        const match = FALLBACK_CANDIDATE_ROUTES.find(
          (c) => c.pageName === enabledPage.page_name
        );
        if (match) return match.route;
      }
    }
  }

  // Fallback default
  return "/webapp/employee-profile";
};
