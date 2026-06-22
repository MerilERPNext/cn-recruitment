import {
  ArrowDownUp,
  ArrowUpDown,
  Award,
  BadgeIndianRupee,
  BriefcaseBusiness,
  Calculator,
  Calendar,
  ChartNoAxesCombined,
  CheckCircle,
  ChevronRight,
  CircleCheckBig,
  Clock,
  Coins,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Gift,
  Goal,
  Grid3X3,
  HandCoins,
  HelpCircle,
  Home,
  IndianRupee,
  ListTodo,
  ReceiptIndianRupee,
  SeparatorHorizontal,

  Sheet,
  SlidersHorizontal,
  Timer,
  User,
  Users,
  Wallet,
  Workflow,
  Telescope,
  Shield,
  Share2,
  SquarePlus,
  UserSearch,
  UserPlus,
  Upload,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { ROUTES } from "../../constants/routes";
import { useAppNotificationCounts } from "../../hooks/useAppNotificationCounts";
import { useSingleCompanyLogo } from "../../hooks/useCompanyLogo";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { useTodoPendingCount } from "../../hooks/useTodo";
import { Typography } from "./atoms/Typography";
import SidebarSkeleton from "./molecules/Skeletons/SidebarSkeleton";

interface SubSubMenuItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

interface SubMenuItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  subItems?: SubSubMenuItem[];
  permissionKey: string;
}

interface NavigationItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  permissionKey: string;
  subItems?: SubMenuItem[];
}

interface CollapsibleSidebarProps {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}

const CollapsibleSidebar: React.FC<CollapsibleSidebarProps> = ({
  isExpanded,
  setIsExpanded,
}) => {
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openSubDropdown, setOpenSubDropdown] = useState<string | null>(null);
  const { data: uiPermissions, isLoading: isUiPermissionsLoading } =
    useGetUiPermission();
  // const { data: companyLogo } = useCompanyLogo();
  const { data: currentEmployee } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });


  const currentEmployeeCompany = currentEmployee?.company;
  const { data: singleCompanyLogo } = useSingleCompanyLogo(

    currentEmployeeCompany || "",

  );

  const logoToShow = singleCompanyLogo?.company_logo || "logo not found";
  const originalCompanyName =
    currentEmployeeCompany || "Company name not found";
  const getTruncatedCompanyName = (name: string, maxLength: number = 20) => {
    if (name.length <= maxLength) {
      return name;
    }
    const words = name.split(" ");
    if (words.length > 1) {
      return words.map((word) => word.charAt(0).toUpperCase()).join("");
    }
    return name.charAt(0).toUpperCase() + ".";
  };

  const companyName = getTruncatedCompanyName(originalCompanyName);
  const { getCount, getSubModuleCount } = useAppNotificationCounts();
  const { data: todoPendingCount = 0 } = useTodoPendingCount();

  // Returns the badge count for a nav item — todo uses its own API, others use notification counts
  const getNavItemCount = (label: string): number => {
    if (label === "Todo") return todoPendingCount;
    return getCount(label);
  };

  const allNavigationItems: NavigationItem[] = [
    {
      icon: Home,
      label: "Dashboard",
      path: "/webapp/",
      permissionKey: "Dashboard",
    },
    {
      icon: Calendar,
      label: "Leaves & Holidays",
      path: "/webapp/leave-app",
      permissionKey: "Leaves and Holidays",
      subItems: [
        {
          name: "Leave Summary",
          icon: Calculator,
          href: "/webapp/leave-app/leaves/leave-balance",
          permissionKey: "Leave Summary",
        },
        {
          name: "My Requests",
          icon: User,
          href: "/webapp/leave-app/leaves/leave-requests/my",
          permissionKey: "My Requests",
        },
        {
          name: "Team Requests",
          icon: Users,
          href: "/webapp/leave-app/leaves/leave-requests/team",
          permissionKey: "Team Requests",
        },
        {
          name: "Holidays",
          icon: Calendar,
          href: "/webapp/leave-app/leaves/holidays",
          permissionKey: "Holidays",
        },
        {
          name: "Compensatory",
          icon: User,
          href: "/webapp/leave-app/compensatory-request",
          permissionKey: "Compensatory",
        },
      ],
    },
    {
      icon: User,
      label: "Attendance",
      path: "/webapp/attendance",
      permissionKey: "Attendance",
      subItems: [
        {
          name: "Attendance Summary",
          icon: CheckCircle,
          href: "/webapp/attendance/summary",
          permissionKey: "Attendance Summary",
        },
        {
          name: "My Attendance",
          icon: Calendar,
          href: "/webapp/attendance/emp-attendance",
          permissionKey: "My Attendance",
        },
        {
          name: "Team Attendance",
          icon: Users,
          href: "/webapp/attendance/team-attendance",
          permissionKey: "Team Attendance",
        },
        {
          name: "My Requests",
          icon: Clock,
          href: "/webapp/attendance/attendance-request",
          permissionKey: "My Requests",
        },
        {
          name: "Team Requests",
          icon: Users,
          href: "/webapp/attendance/team-attendance-requests",
          permissionKey: "Team Requests",
        },
        {
          name: "Planned Overtime",
          icon: Timer,
          href: "/webapp/attendance/my-overtime-requests",
          permissionKey: "Planned Overtime",
        },
        {
          name: "Team Overtime",
          icon: Users,
          href: "/webapp/attendance/team-overtime-requests",
          permissionKey: "Team Overtime",
        },
        {
          name: "All Shifts",
          icon: ArrowUpDown,
          href: "/webapp/shift-request/all-shifts-dashboard",
          permissionKey: "All Shifts",
        },
      ],
    },
    {
      icon: IndianRupee,
      label: "Compensation",
      path: "/webapp/salary-slip-app",
      permissionKey: "Compensation",
      subItems: [
        {
          name: "Pay Package",
          icon: IndianRupee,
          href: "/webapp/salary-slip-app/pay-package",
          permissionKey: "Pay Package",
        },
        {
          name: "IT Declaration",
          icon: BadgeIndianRupee,
          href: "/webapp/salary-slip-app/it-declaration-form",
          permissionKey: "IT Declaration",
        },
        {
          name: "Flexi Declaration",
          icon: BadgeIndianRupee,
          href: "/webapp/salary-slip-app/flexi-declaration-form",
          permissionKey: "Flexi Declaration",
        },

        {
          name: "Team IT Declaration",
          icon: Sheet,
          href: "/webapp/salary-slip-app/team-declaration-listview",
          permissionKey: "Team IT Declaration",
        },
        {
          name: "Tax Declaration Sheet",
          icon: Wallet,
          href: "/webapp/salary-slip-app/income-tax-sheet",
          permissionKey: "Tax Declaration Sheet",
        },

        {
          name: "Annual CTC",
          icon: Calculator,
          href: "/webapp/salary-slip-app/ctc-salary-breakdown?view=annual",
          permissionKey: "Annual CTC",
        },
        {
          name: "Invoice",
          icon: FileSpreadsheet,
          href: "/webapp/salary-slip-app/invoice-page",
          permissionKey: "Invoice",
        },
        {
          name: "Salary Slip",
          icon: CreditCard,
          href: "/webapp/salary-slip-app/salary-slip-list",
          permissionKey: "Salary Slip",
        },
        {
          name: "Salary Structure Assignment",
          icon: BadgeIndianRupee,
          href: "/webapp/salary-slip-app/salary-structure-assignment",
          permissionKey: "Salary Structure Assignment",
        },
        {
          name: "Extra Payment",
          icon: HandCoins,
          href: "/webapp/salary-slip-app/extra-payment",
          permissionKey: "Extra Payment",
        },
        {
          name: "My Loan Requests",
          icon: BadgeIndianRupee,
          href: "/webapp/salary-slip-app/my-loan-requests",
          permissionKey: "My Loan Requests",
        },
        {
          name: "Team Loan Requests",
          icon: Users,
          href: "/webapp/salary-slip-app/team-loan-requests",
          permissionKey: "Team Loan Requests",
        },
        {
          name: "My Advances",
          icon: IndianRupee,
          href: "/webapp/salary-slip-app/advances-list",
          permissionKey: "My Advances",
        },
        {
          name: "Team Advances",
          icon: Coins,
          href: "/webapp/salary-slip-app/team-advances-list",
          permissionKey: "Team Advances",
        },
        {
          name: "Perquisite",
          icon: IndianRupee,
          href: "/webapp/salary-slip-app/perquisite-list",
          permissionKey: "Perquisite",
        },
        {
          name: "Payroll Documents",
          icon: FileText,
          href: "/webapp/salary-slip-app/hr-payroll",
          permissionKey: "Payroll Documents",
        },
      ],
    },
    {
      icon: Gift,
      label: "Benefits",
      path: "/webapp/benefits-app",
      permissionKey: "Benefits",
      subItems: [
        {
          name: "My Benefits",
          icon: Gift,
          href: "/webapp/benefits-app/my-benefits",
          permissionKey: "My Benefits",
        },
        {
          name: "My Requests",
          icon: Users,
          href: "/webapp/benefits-app/my-requests",
          permissionKey: "My Requests",
        },
        {
          name: "Team Requests",
          icon: Users,
          href: "/webapp/benefits-app/my-team-requests",
          permissionKey: "Team Requests",
        },
        {
          name: "Benefit Slips",
          icon: Calculator,
          href: "/webapp/benefits-app/benefits-slips",
          permissionKey: "Benefit Slips",
        },
      ],
    },

    {
      icon: ReceiptIndianRupee,
      label: "Expenses",
      path: "/webapp/expenses-app",
      permissionKey: "Expenses",
      subItems: [
        {
          name: "Expense Claims",
          icon: IndianRupee,
          href: "/webapp/expenses-app/expenses-list",
          permissionKey: "Expense Claims",
        },
        {
          name: "Team Requests",
          icon: Users,
          href: "/webapp/expenses-app/team-requests",
          permissionKey: "Team Requests",
        },
        {
          name: "My Advances",
          icon: ArrowUpDown,
          href: "/webapp/expenses-app/my-advance-expense",
          permissionKey: "My Advances",
        },
        {
          name: "Team Advances",
          icon: ArrowUpDown,
          href: "/webapp/expenses-app/team-advance-expense",
          permissionKey: "Team Advances",
        },
        {
          name: "Expense Summary",
          icon: FileSpreadsheet,
          href: "/webapp/expenses-app/expense-summary",
          permissionKey: "ExpenseSummary",
        },
      ],
    },
    {
      icon: Workflow,
      label: "HR Process",
      path: "/webapp/flow-app",
      permissionKey: "HR Process",
      subItems: [
        {
          name: "Flow Requests",
          icon: ArrowDownUp,
          href: "/webapp/flow-app/flow-requests",
          permissionKey: "Flow Requests",
        },
        {
          name: "Onboarding",
          icon: ArrowDownUp,
          href: "/webapp/flow-app/onboarding",
          permissionKey: "Flow Requests",
        },
        {
          name: "Separation",
          icon: SeparatorHorizontal,
          href: "/webapp/flow-app/separation",
          permissionKey: "Separation",
        },
        {
          name: "Confirmation",
          icon: CircleCheckBig,
          href: "/webapp/flow-app/confirmation",
          permissionKey: "Confirmation",
        },
      ],
    },
    {
      icon: ChartNoAxesCombined,
      label: "Performance",
      path: "/webapp/performance-app",
      permissionKey: "Performance",
      subItems: [
        {
          name: "Overview",
          icon: Telescope,
          href: "/webapp/performance-app/overview",
          permissionKey: "Overview",
        },
        {
          name: "My Goals",
          icon: Goal,
          href: "/webapp/performance-app/my-goals",
          permissionKey: "My Goals",
        },
        {
          name: "My Team",
          icon: Users,
          href: "/webapp/performance-app/team-overview",
          permissionKey: "My Team",
          subItems: [
            {
              name: "Overview",
              icon: ChartNoAxesCombined,
              href: "/webapp/performance-app/team-overview",
            },
            {
              name: "Team Goals",
              icon: Goal,
              href: "/webapp/performance-app/team-goals",
            },
            {
              name: "Reviews",
              icon: CheckCircle,
              href: "/webapp/performance-app/team-reviews",
            },
            {
              name: "Calibration",
              icon: SlidersHorizontal,
              href: "/webapp/performance-app/team-calibration",
            },
            {
              name: "Check-Ins",
              icon: Clock,
              href: "/webapp/performance-app/team-check-ins",
            },

          ],
        },
        {
          name: "Review",
          icon: CheckCircle,
          href: "/webapp/performance-app",
          permissionKey: "Review",
          subItems: [
            {
              name: "Self Review",
              icon: User,
              href: "/webapp/performance-app/review",
            },
            {
              name: "Peer Nomination",
              icon: Award,
              href: "/webapp/performance-app/review/peer-nomination",
            },
          ],
        },
        {
          name: "Feedback",
          icon: Goal,
          href: "/webapp/performance-app/feedback",
          permissionKey: "Feedback",
        },

        {
          name: "Skills And Proficiency",
          icon: Goal,
          href: "/webapp/performance-app/skills",
          permissionKey: "Skills And Proficiency",
        },

        {
          name: "New Goal Plan",
          icon: Goal,
          href: "/webapp/performance-app/new-goal-plan",
          permissionKey: "New Goal Plan",
        },
        {
          name: "Performance Review",
          icon: ChartNoAxesCombined,
          href: "/webapp/performance-app/performance-review",
          permissionKey: "Performance Review",
        },
        {
          name: "Cycle",
          icon: ChartNoAxesCombined,
          href: "/webapp/performance-app/appraisal-cycle-wizard",
          permissionKey: "Appraisal Cycle Wizard",

        },
        {
          name: "Calibrator",
          icon: SlidersHorizontal,
          href: "/webapp/performance-app/calibrator",
          permissionKey: "Appraisal Cycle Wizard",
          subItems: [
            {
              name: "Session",
              icon: Users,
              href: "/webapp/performance-app/calibrator/session"
            },
            {
              name: "9-Box Grid",
              icon: Grid3X3,
              href: "/webapp/performance-app/calibrator/box-grid"
            }
          ]
        },


      ],
    },

    {
      icon: Users,
      label: "Employee Directory",
      path: "/webapp/employees-directory",
      permissionKey: "Employee Directory",
    },
    {
      icon: UserSearch,
      label: "Recruitment",
      path: "/webapp/recruitment",
      permissionKey: "Recruitments",
      subItems: [
        {
          name: "Requisitions",
          icon: FileText,
          href: "/webapp/recruitment/requisition",
          permissionKey: "Requisitions",
        },
        {
          name: "Refer",
          icon: UserPlus,
          href: "/webapp/recruitment/refer",
          permissionKey: "Referrals",
        },
        {
          name: "My Referrals",
          icon: Share2,
          href: "/webapp/recruitment/referrals",
          permissionKey: "My Referrals",
        },
        {
          name: "IJP Openings",
          icon: BriefcaseBusiness,
          href: "/webapp/recruitment/ijp-openings",
          permissionKey: "IJP Openings",
        },
        {
          name: "IJP Jobs Applied",
          icon: CircleCheckBig,
          href: "/webapp/recruitment/ijp-applied",
          permissionKey: "IJP Jobs Applied",
        },
      ],
    },
    {
      icon: Shield,
      label: "Policies",
      path: "/webapp/policies-app",
      permissionKey: "Policies",
    },
    {
      icon: Award,
      label: "Recognition",
      path: "/webapp/recognition",
      permissionKey: "Recognition",
      subItems: [
        {
          name: "Dashboard",
          icon: Home,
          href: "/webapp/recognition/vibe/dashboard",
          permissionKey: "Recognition",
        },
        {
          name: "My Appreciations History",
          icon: FileText,
          href: "/webapp/recognition/vibe/my-appreciations-history",
          permissionKey: "Recognition",
        },
        {
          name: "Feed",
          icon: Telescope,
          href: "/webapp/recognition/vibe/feed",
          permissionKey: "Recognition",
        },
        {
          name: "Appreciations-Leaderboard",
          icon: ChartNoAxesCombined,
          href: "/webapp/recognition/vibe/appreciations-leaderboard",
          permissionKey: "Recognition",
        },
        {
          name: "Awards-Live Programs & Winners",
          icon: Award,
          href: "/webapp/recognition/vibe/awards-live",
          permissionKey: "Recognition",
        },
        {
          name: "Awards-History",
          icon: FileText,
          href: "/webapp/recognition/vibe/awards-history",
          permissionKey: "Recognition",
        },
        {
          name: "Awards-Nomination Workflows",
          icon: Workflow,
          href: "/webapp/recognition/vibe/nomination-workflows",
          permissionKey: "Recognition",
        },
        {
          name: "Earned Points Summary",
          icon: Coins,
          href: "/webapp/recognition/vibe/earned-points",
          permissionKey: "Recognition",
        },
        {
          name: "Admin Dashboard",
          icon: Grid3X3,
          href: "/webapp/recognition/vibe/admin-dashboard",
          permissionKey: "Recognition",
        },
      ],
    },
    {
      icon: SquarePlus,
      label: "Employee Onboarding",
      path: "/webapp/employee-onboarding",
      permissionKey: "Employee Onboarding",
    },
    {
      icon: FileText,
      label: "My Documents",
      path: "/webapp/employee-documents",
      permissionKey: "Employee Documents",
    },
    {
      icon: ListTodo,
      label: "Todo",
      path: ROUTES.TODO,
      permissionKey: "Todo",
    },
    {
      icon: Upload,
      label: "Scheduled Imports",
      path: "/webapp/scheduled-imports",
      permissionKey: "Scheduled Imports",
    },
    {
      icon: HelpCircle,
      label: "Help Desk",
      path: "/webapp/helpdesk",
      permissionKey: "Help Desk",
    },
    {
      icon: Share2,
      label: "Work Connect",
      path: "/work-connect",
      permissionKey: "Work Connect",
    },
  ];

  const navigationItems = useMemo(() => {
    if (!uiPermissions || uiPermissions.length === 0) {
      return allNavigationItems;
    }

    return allNavigationItems
      .map((item) => {
        const appPermission = uiPermissions.find(
          (perm) => perm.app_name === item.permissionKey,
        );

        if (!appPermission || !appPermission.enabled) {
          return null;
        }

        if (!item.subItems || item.subItems.length === 0) {
          return item;
        }

        // Recognition's sub-sections are all gated by the single "Recognition"
        // app permission (no per-page entries in the backend), so once the app
        // is enabled we keep all of its sub-items as-is.
        if (item.permissionKey === "Recognition") {
          return item;
        }

        const filteredSubItems = item.subItems.filter((subItem) => {
          const pagePermission = appPermission.pages?.find(
            (page) => page.page_name === subItem.permissionKey,
          );
          return pagePermission ? pagePermission.enabled : false;
        });

        if (filteredSubItems.length === 0) {
          return null;
        }

        return {
          ...item,
          subItems: filteredSubItems,
        };
      })
      .filter((item): item is NavigationItem => item !== null);
  }, [uiPermissions]);

  const isSubSubItemActive = (subSubItem: SubSubMenuItem) => {
    if (location.pathname === subSubItem.href) {
      return true;
    }

    if (
      subSubItem.href === "/webapp/performance-app/review" &&
      location.pathname.startsWith(
        "/webapp/performance-app/review/peer-nomination",
      )
    ) {
      return false;
    }

    if (location.pathname.startsWith(subSubItem.href)) {
      const remainingPath = location.pathname.substring(subSubItem.href.length);
      return remainingPath === "" || remainingPath.startsWith("/");
    }
    return false;
  };

  const isSubItemActive = (subItem: SubMenuItem) => {
    if (
      subItem.subItems?.some((subSubItem) => isSubSubItemActive(subSubItem))
    ) {
      return true;
    }
    if (subItem.href) {
      const [path, query] = subItem.href.split("?", 2);

      if (query) {
        return location.pathname === path && location.search === `?${query}`;
      }

      if (path === "/webapp/shift-request/all-shifts-dashboard") {
        const shiftRoutes = [
          "/webapp/shift-request/all-shifts-dashboard",
          "/webapp/shift-request/my-shift-assignment",
          "/webapp/shift-request/shift-change-request",
          "/webapp/shift-request/team-shift",
        ];
        return shiftRoutes.some(
          (route) =>
            location.pathname === route ||
            location.pathname.startsWith(route + "/"),
        );
      }

      if (location.pathname === path) {
        return true;
      }

      if (location.pathname.startsWith(path)) {
        const remainingPath = location.pathname.substring(path.length);
        return remainingPath === "" || remainingPath.startsWith("/");
      }
    }
    return false;
  };

  const isItemActive = (item: NavigationItem) => {
    if (item.label === "Dashboard") {
      return (
        location.pathname === "/webapp/" || location.pathname === "/webapp"
      );
    }

    if (
      item.subItems &&
      item.subItems.some((subItem) => isSubItemActive(subItem))
    ) {
      return true;
    }

    if (location.pathname === item.path) {
      return true;
    }

    if (item.path && location.pathname.startsWith(item.path)) {
      const remainingPath = location.pathname.substring(item.path.length);
      return remainingPath === "" || remainingPath.startsWith("/");
    }

    return false;
  };

  const handleParentClick = (itemLabel: string, hasSubItems: boolean) => {
    if (hasSubItems) {
      if (openDropdown === itemLabel) {
        setOpenDropdown(null);
        setOpenSubDropdown(null);
      } else {
        setOpenDropdown(itemLabel);
        setOpenSubDropdown(null);
      }
      setIsExpanded(true);
    }
  };

  const handleSubItemClick = (subItemName: string, hasSubSubItems: boolean) => {
    if (hasSubSubItems) {
      if (openSubDropdown === subItemName) {
        setOpenSubDropdown(null);
      } else {
        setOpenSubDropdown(subItemName);
      }
    }
  };

  const handleMouseLeave = () => {
    setIsExpanded(false);

    const activeParent = navigationItems.find((item) =>
      item.subItems?.some((subItem) => isSubItemActive(subItem)),
    );

    if (!activeParent) {
      setOpenDropdown(null);
    }

    setOpenSubDropdown(null);
  };

  useEffect(() => {
    const activeParent = navigationItems.find((item) =>
      item.subItems?.some((subItem) => isSubItemActive(subItem)),
    );

    setOpenDropdown(activeParent?.label || null);
  }, [location.pathname, navigationItems]);

  if (isUiPermissionsLoading) {
    return <SidebarSkeleton isExpanded={isExpanded} />;
  }

  return (
    <>
      <style>
        {`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
      <aside
        className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 shadow-sm overflow-y-auto scrollbar-hide transition-all duration-300 ease-in-out z-20 ${isExpanded ? "w-64" : "w-20"
          }`}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex flex-col h-full">
          <div
            className="px-4 bg-white py-3 border-b border-gray-200"
            style={{ height: "73px" }}
          >
            <Link to="/webapp/">
              <div className="flex items-center  gap-3 h-full">
                <img
                  src={typeof logoToShow === "string" ? logoToShow : ""}
                  alt="companyLogo"
                  className="w-12 h-12 rounded-full  flex-shrink-0"
                />
                <div
                  className={`transition-all duration-300 flex flex-col justify-center ${isExpanded ? "opacity-100" : "opacity-0 -translate-x-2"
                    }`}
                >
                  <Typography
                    variant="subheading"
                    color="title"
                    className="whitespace-nowrap leading-tight"
                    title={originalCompanyName}
                  >
                    {companyName}
                  </Typography>
                  <Typography
                    variant="bodySmall"
                    color="body2"
                    className="whitespace-nowrap"
                  >
                    Employee Portal
                  </Typography>
                </div>
              </div>
            </Link>
          </div>
          <div className="flex-1 p-4 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isAnySubItemActive = item.subItems?.some((subItem) =>
                isSubItemActive(subItem),
              );
              const isItemDirectlyActive =
                isItemActive(item) && !isAnySubItemActive;
              const isDropdownOpen = openDropdown === item.label;

              let parentItemClasses = "";
              if (isExpanded) {
                if (isAnySubItemActive) {
                  parentItemClasses = "bg-primary text-white";
                } else if (isItemDirectlyActive && !hasSubItems) {
                  parentItemClasses = "bg-primary-50 text-primary-600";
                } else if (isDropdownOpen) {
                  parentItemClasses = "bg-primary-50 text-primary-600";
                } else {
                  parentItemClasses =
                    "text-text-body1 hover:bg-primary-50 hover:text-primary-600";
                }
              } else {
                if (
                  isAnySubItemActive ||
                  (isItemDirectlyActive && !hasSubItems)
                ) {
                  parentItemClasses = "bg-primary-500 text-white";
                } else {
                  parentItemClasses =
                    "text-text-body1 hover:bg-primary-50 hover:text-primary-600";
                }
              }

              return (
                <div key={item.label} className="relative">
                  {hasSubItems ? (
                    <div
                      onClick={() => handleParentClick(item.label, true)}
                      className={`flex items-center justify-between w-full h-12 px-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${parentItemClasses}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <Icon className="h-5 w-5" />
                          {!isExpanded && getNavItemCount(item.label) > 0 && (
                            <span className="absolute -top-0.5 -right-1 min-w-[16px] size-4 p-2 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center">
                              {getNavItemCount(item.label)}
                            </span>
                          )}
                        </div>
                        <span
                          className={`transition-all duration-300 ${isExpanded
                            ? "opacity-100"
                            : "opacity-0 -translate-x-2"
                            }`}
                        >
                          <Typography
                            variant="bodySmall"
                            className="font-medium whitespace-nowrap"
                            color="inherit"
                          >
                            {item.label}
                          </Typography>
                        </span>
                        {isExpanded && getNavItemCount(item.label) > 0 && (
                          <span className="ml-auto min-w-[22px] size-5 p-2 rounded-full bg-error-50 text-error text-xs font-semibold flex items-center justify-center">
                            {getNavItemCount(item.label)}
                          </span>
                        )}
                      </div>
                      {isExpanded && (
                        <ChevronRight
                          className={`h-4 w-4 transition-transform duration-200  ${isDropdownOpen || isAnySubItemActive
                            ? "rotate-90"
                            : ""
                            }`}
                        />
                      )}
                    </div>
                  ) : (
                    <Link
                      to={item.path}
                      className={`flex items-center justify-between w-full h-12 px-3 rounded-lg text-sm font-medium transition-all duration-200 no-underline ${isItemDirectlyActive
                        ? "bg-primary-500 text-white hover:text-white"
                        : "text-text-body1 hover:bg-primary-50 hover:text-primary-600"
                        }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <Icon className="h-5 w-5" />
                          {!isExpanded && getNavItemCount(item.label) > 0 && (
                            <span className="absolute -top-0.5 -right-1 min-w-[16px] size-4 p-2 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center">
                              {getNavItemCount(item.label)}
                            </span>
                          )}
                        </div>
                        <span
                          className={`transition-all duration-300 ${isExpanded
                            ? "opacity-100"
                            : "opacity-0 -translate-x-2"
                            }`}
                        >
                          <Typography
                            variant="bodySmall"
                            className="font-medium whitespace-nowrap"
                            color="inherit"
                          >
                            {item.label}
                          </Typography>
                        </span>
                        {isExpanded && getNavItemCount(item.label) > 0 && (
                          <span className="ml-auto min-w-[22px] size-5 p-2 rounded-full bg-error-50 text-error text-xs font-semibold flex items-center justify-center">
                            {getNavItemCount(item.label)}
                          </span>
                        )}
                      </div>
                    </Link>
                  )}
                  {hasSubItems &&
                    (isDropdownOpen || isAnySubItemActive) &&
                    isExpanded && (
                      <div className="overflow-hidden transition-all duration-300 ease-in-out">
                        <div className="py-1 space-y-0">
                          {item.subItems?.map((subItem) => {
                            const SubIcon = subItem.icon;
                            const hasSubSubItems =
                              subItem.subItems && subItem.subItems.length > 0;
                            const isSubActive = isSubItemActive(subItem);
                            const isSubDropdownOpen =
                              openSubDropdown === subItem.name;
                            const isAnySubSubItemActive =
                              subItem.subItems?.some((subSubItem) =>
                                isSubSubItemActive(subSubItem),
                              );

                            const subItemCount = getSubModuleCount(
                              item.label,
                              subItem.name,
                            );

                            return (
                              <div key={subItem.name}>
                                {hasSubSubItems ? (
                                  <div
                                    onClick={() =>
                                      handleSubItemClick(subItem.name, true)
                                    }
                                    className={`flex items-center justify-between w-full h-8 pl-12 pr-3 text-sm rounded-lg transition-colors duration-150 cursor-pointer whitespace-nowrap  ${isSubActive || isSubDropdownOpen
                                      ? "bg-primary-50 text-primary-600"
                                      : "text-text-body1 hover:bg-primary-50 hover:text-primary-600"
                                      }`}
                                  >
                                    <div className="flex items-center space-x-2">
                                      <SubIcon className="h-3.5 w-3.5 opacity-70" />
                                      <span
                                        className={`transition-all duration-300 whitespace-nowrap  ${isExpanded
                                          ? "opacity-100 translate-x-0"
                                          : "opacity-0 -translate-x-2"
                                          }`}
                                      >
                                        <Typography
                                          variant="bodySmall"
                                          color="inherit"
                                          className="font-medium whitespace-nowrap"
                                        >
                                          {subItem.name}
                                        </Typography>
                                      </span>
                                    </div>
                                    <ChevronRight
                                      className={`h-3 w-3 transition-transform duration-200 ${isSubDropdownOpen ||
                                        isAnySubSubItemActive
                                        ? "rotate-90"
                                        : ""
                                        }`}
                                    />
                                  </div>
                                ) : (
                                  <Link
                                    to={subItem.href || "#"}
                                    className={`
                                              group flex items-center w-full h-8 p-4 text-sm no-underline whitespace-nowrap
                                              relative left-5 border-l border-gray-400 transition-colors duration-300
                                              ${isSubActive
                                        ? "text-primary"
                                        : "text-text-body1 hover:text-primary-600 hover:bg-primary-50"
                                      }
                                  `}
                                  >
                                    {/* dot */}
                                    <span
                                      className={`
                                      absolute left-[-5px] top-1/2 -translate-y-1/2
                                      h-2 w-2 rounded-full bg-primary
                                      transition-all duration-400 ease-out
                                      ${isSubActive ? "scale-100 opacity-100" : "scale-0 opacity-0"}
                                    `}
                                    />

                                    {/* vertical bar */}
                                    <span
                                      className={`
                                      absolute left-[-1.5px] top-0
                                      h-full w-[2px] bg-primary
                                      origin-center
                                      rounded-md
                                      transition-opacity duration-400 ease-out
                                      ${isSubActive ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0"}
                                    `}
                                    />
                                    <div className="flex items-center justify-start space-x-2 w-full">
                                      {/* <SubIcon className="h-3.5 w-3.5 opacity-70" /> */}
                                      <div className="flex items-center transition-all duration-300 whitespace-nowrap overflow-hidden">
                                        <span
                                          className={`transition-all duration-300 whitespace-nowrap ${isExpanded
                                            ? "opacity-100 translate-x-0"
                                            : "opacity-0 -translate-x-2"
                                            }`}
                                        >
                                          <Typography
                                            variant="bodySmall"
                                            color="inherit"
                                            className="font-medium whitespace-nowrap"
                                          >
                                            {subItem.name}
                                          </Typography>
                                        </span>
                                      </div>

                                      {/* Badge for sub-item */}
                                      {isExpanded && subItemCount > 0 && (
                                        <span
                                          className={`transition-all duration-300 ${isExpanded ? "opacity-100" : "opacity-0"} min-w-[20px] size-5 rounded-full bg-error-50 text-error text-[10px] font-bold flex items-center justify-center mr-6`}
                                        >
                                          {subItemCount}
                                        </span>
                                      )}
                                    </div>
                                  </Link>
                                )}
                                {hasSubSubItems &&
                                  (isSubDropdownOpen ||
                                    isAnySubSubItemActive) &&
                                  isExpanded && (
                                    <div className="overflow-hidden transition-all duration-300 ease-in-out">
                                      <div className="py-1 space-y-1">
                                        {subItem.subItems?.map((subSubItem) => {
                                          const SubSubIcon = subSubItem.icon;
                                          const isSubSubActive =
                                            isSubSubItemActive(subSubItem);

                                          return (
                                            <Link
                                              key={subSubItem.name}
                                              to={subSubItem.href}
                                              className={`flex items-center w-full h-7 pl-14 pr-3 text-xs rounded-lg transition-colors duration-150 no-underline whitespace-nowrap ${isSubSubActive
                                                ? "bg-primary-500 text-white hover:text-white"
                                                : "text-text-body1 hover:bg-primary-50 hover:text-primary-600"
                                                }`}
                                            >
                                              <div className="flex items-center space-x-2">
                                                <SubSubIcon className="h-3 w-3 opacity-70" />
                                                <span
                                                  className={`font-medium transition-all duration-300 whitespace-nowrap ${isExpanded
                                                    ? "opacity-100 translate-x-0"
                                                    : "opacity-0 -translate-x-2"
                                                    }`}
                                                >
                                                  <Typography
                                                    variant="bodySmall"
                                                    color="inherit"
                                                    className="font-medium whitespace-nowrap"
                                                  >
                                                    {subSubItem.name}
                                                  </Typography>
                                                </span>
                                              </div>
                                            </Link>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
};

export default CollapsibleSidebar;
