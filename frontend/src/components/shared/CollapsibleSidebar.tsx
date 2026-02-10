import type React from "react";
import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Calendar,
  User,
  IndianRupee,
  ArrowUpDown,
  ReceiptIndianRupee,
  Shield,
  ChevronRight,
  CreditCard,
  Calculator,
  FileText,
  Clock,
  Users,
  CheckCircle,
  Wallet,
  TimerIcon,
  ListTodo,
  HelpCircle,
  Workflow,
  SeparatorHorizontal,
  CircleCheckBig,
  ArrowDownUp,
  ChartNoAxesCombined,
  Telescope,
  Goal,
  Gift,
  HandCoins,
  Coins,
  BadgeIndianRupee,
  FileSpreadsheet,
  Sheet,
  BriefcaseBusiness,
} from "lucide-react";

import { useCompanyLogo } from "../../hooks/useCompanyLogo";
import { useCurrentEmployee } from "../../hooks/useEmployee";
import { ROUTES } from "../../constants/routes";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { useAppNotificationCounts } from "../../hooks/useAppNotificationCounts";
import { Typography } from "./atoms/Typography";

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

  const { data: companyLogo } = useCompanyLogo();
  const { data: currentEmployee } = useCurrentEmployee();
  const { data: uiPermissions } = useGetUiPermission();

  const currentEmployeeCompany = currentEmployee?.company;
  const matchedCompany =
    Array.isArray(companyLogo) &&
    companyLogo.length > 0 &&
    currentEmployeeCompany
      ? companyLogo.find(
          (company) => company.company_name === currentEmployeeCompany,
        )
      : companyLogo?.[0];
  const logoToShow = matchedCompany?.company_logo || "logo not found";
  const originalCompanyName =
    matchedCompany?.company_name ||
    currentEmployeeCompany ||
    "Company name not found";
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
  const { getCount } = useAppNotificationCounts();

  // const getNotificationCount = (sidebarLabel: string) => {
  //   if (!notificationData?.apps) return 0;

  //   const backendTitles = NOTIFICATION_TITLE_MAP[sidebarLabel];

  //   if (!backendTitles) return 0;

  //   return notificationData.apps
  //     .filter((app) => backendTitles.includes(app.title))
  //     .reduce((sum, app) => sum + (app.count ?? 0), 0);
  // };

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
          name: "Leave Balance",
          icon: Calculator,
          href: "/webapp/leave-app/leaves/leave-balance",
        },
        {
          name: "My Requests",
          icon: User,
          href: "/webapp/leave-app/leaves/leave-requests/my",
        },
        {
          name: "Team Requests",
          icon: Users,
          href: "/webapp/leave-app/leaves/leave-requests/team",
        },
        {
          name: "Holidays",
          icon: Calendar,
          href: "/webapp/leave-app/leaves/holidays",
        },
        {
          name: "Compensatory",
          icon: User,
          href: "/webapp/leave-app/compensatory-request",
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
        },
        {
          name: "My Attendance",
          icon: Calendar,
          href: "/webapp/attendance/emp-attendance",
        },
        {
          name: "Team Attendance",
          icon: Users,
          href: "/webapp/attendance/team-attendance",
        },
        {
          name: "My Requests",
          icon: Clock,
          href: "/webapp/attendance/attendance-request",
        },
        {
          name: "Team Requests",
          icon: Users,
          href: "/webapp/attendance/team-attendance-requests",
        },
        {
          name: "Planned Overtime",
          icon: TimerIcon,
          href: "/webapp/attendance/my-overtime-requests",
        },
        {
          name: "Team Overtime",
          icon: Users,
          href: "/webapp/attendance/team-overtime-requests",
        },
        {
          name: "All Shifts",
          icon: ArrowUpDown,
          href: "/webapp/shift-request/all-shifts-dashboard",
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
        },
        {
          name: "IT Declaration",
          icon: BadgeIndianRupee,
          href: "/webapp/salary-slip-app/it-declaration-form",
        },
        {
          name: "Team IT Declaration",
          icon: Sheet,
          href: "/webapp/salary-slip-app/team-it-declaration-form",
        },
        {
          name: "Tax Declaration Sheet",
          icon: Wallet,
          href: "/webapp/salary-slip-app/income-tax-sheet",
        },

        {
          name: "Annual CTC",
          icon: Calculator,
          href: "/webapp/salary-slip-app/ctc-salary-breakdown?view=annual",
        },
        {
          name: "Invoice",
          icon: FileSpreadsheet,
          href: "/webapp/salary-slip-app/invoice-page",
        },
        {
          name: "Salary Slip",
          icon: CreditCard,
          href: "/webapp/salary-slip-app/salary-slip-list",
        },
        {
          name: "Extra Payment",
          icon: HandCoins,
          href: "/webapp/salary-slip-app/extra-payment",
        },
        {
          name: "My Loan Requests",
          icon: BadgeIndianRupee,
          href: "/webapp/salary-slip-app/my-loan-requests",
        },
        {
          name: "Team Loan Requests",
          icon: Users,
          href: "/webapp/salary-slip-app/team-loan-requests",
        },
        {
          name: "My Advances",
          icon: IndianRupee,
          href: "/webapp/salary-slip-app/advances-list",
        },
        {
          name: "Team Advances",
          icon: Coins,
          href: "/webapp/salary-slip-app/team-advances-list",
        },
        {
          name: "Perquisite",
          icon: IndianRupee,
          href: "/webapp/salary-slip-app/perquisite-list",
        },
        {
          name: "Payroll Documents",
          icon: FileText,
          href: "/webapp/salary-slip-app/hr-payroll",
        },
      ],
    },
    {
      icon: Gift,
      label: "Benefits",
      path: "/webapp/benefits-app",
      permissionKey: "Benefit",
      subItems: [
        {
          name: "My Benefits",
          icon: Gift,
          href: "/webapp/benefits-app/my-benefits",
        },
        {
          name: "My Requests",
          icon: Users,
          href: "/webapp/benefits-app/my-requests",
        },
        {
          name: "Team Requests",
          icon: Users,
          href: "/webapp/benefits-app/my-team-requests",
        },
        {
          name: "Benefit Slips",
          icon: Calculator,
          href: "/webapp/benefits-app/benefits-slips",
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
        },
        {
          name: "Team Requests",
          icon: Users,
          href: "/webapp/expenses-app/team-requests",
        },
        {
          name: "My Advances",
          icon: ArrowUpDown,
          href: "/webapp/expenses-app/my-advance-expense",
        },
        {
          name: "Team Advances",
          icon: ArrowUpDown,
          href: "/webapp/expenses-app/team-advance-expense",
        },
      ],
    },
    {
      icon: Workflow,
      label: "HR Processes",
      path: "/webapp/flow-app",
      permissionKey: "HR Processes",
      subItems: [
        {
          name: "Flow Requests",
          icon: ArrowDownUp,
          href: "/webapp/flow-app/flow-requests",
        },
        {
          name: "Separation",
          icon: SeparatorHorizontal,
          href: "/webapp/flow-app/separation",
        },
        {
          name: "Confirmation",
          icon: CircleCheckBig,
          href: "/webapp/flow-app/confirmation",
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
        },
        {
          name: "New Goal Plan",
          icon: Goal,
          href: "/webapp/performance-app/new-goal-plan",
        },
        {
          name: "Performance Review",
          icon: ChartNoAxesCombined,
          href: "/webapp/performance-app/performance-review",
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
      icon: BriefcaseBusiness,
      label: "Recruitment",
      path: "/webapp/recruitment/",
      permissionKey: "Recruitment",
      subItems: [
        {
          name: "Overview",
          icon: Telescope,
          href: "/webapp/recruitment/overview",
        },
        {
          name: "Requisitions",
          icon: FileText,
          href: "/webapp/recruitment/requisition",
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
      icon: ListTodo,
      label: "Todo",
      path: ROUTES.TODO,
      permissionKey: "Todo",
    },
    {
      icon: HelpCircle,
      label: "Help Desk",
      path: "/webapp/helpdesk",
      permissionKey: "Help Desk",
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

        const filteredSubItems = item.subItems.filter((subItem) => {
          const pagePermission = appPermission.pages?.find(
            (page) => page.page_name === subItem.name,
          );
          return pagePermission && pagePermission.enabled;
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
        className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 shadow-sm overflow-y-auto scrollbar-hide transition-all duration-300 ease-in-out z-20 ${
          isExpanded ? "w-64" : "w-20"
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
                  className={`transition-all duration-300 flex flex-col justify-center ${
                    isExpanded ? "opacity-100" : "opacity-0 -translate-x-2"
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
                          {!isExpanded && getCount(item.label) > 0 && (
                            <span className="absolute -top-0.5 -right-1 min-w-[16px] size-4 p-2 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center">
                              {getCount(item.label)}
                            </span>
                          )}
                        </div>
                        <span
                          className={`transition-all duration-300 ${
                            isExpanded
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
                        {isExpanded && getCount(item.label) > 0 && (
                          <span className="ml-auto min-w-[22px] size-5 p-2 rounded-full bg-error-50 text-error text-xs font-semibold flex items-center justify-center">
                            {getCount(item.label)}
                          </span>
                        )}
                      </div>
                      {isExpanded && (
                        <ChevronRight
                          className={`h-4 w-4 transition-transform duration-200  ${
                            isDropdownOpen || isAnySubItemActive
                              ? "rotate-90"
                              : ""
                          }`}
                        />
                      )}
                    </div>
                  ) : (
                    <Link
                      to={item.path}
                      className={`flex items-center justify-between w-full h-12 px-3 rounded-lg text-sm font-medium transition-all duration-200 no-underline ${
                        isItemDirectlyActive
                          ? "bg-primary-500 text-white hover:text-white"
                          : "text-text-body1 hover:bg-primary-50 hover:text-primary-600"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span
                          className={`transition-all duration-300 ${
                            isExpanded
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

                            return (
                              <div key={subItem.name}>
                                {hasSubSubItems ? (
                                  <div
                                    onClick={() =>
                                      handleSubItemClick(subItem.name, true)
                                    }
                                    className={`flex items-center justify-between w-full h-8 pl-12 pr-3 text-sm rounded-lg transition-colors duration-150 cursor-pointer whitespace-nowrap  ${
                                      isSubActive || isSubDropdownOpen
                                        ? "bg-primary-50 text-primary-600"
                                        : "text-text-body1 hover:bg-primary-50 hover:text-primary-600"
                                    }`}
                                  >
                                    <div className="flex items-center space-x-2">
                                      <SubIcon className="h-3.5 w-3.5 opacity-70" />
                                      <span
                                        className={`transition-all duration-300 whitespace-nowrap  ${
                                          isExpanded
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
                                      className={`h-3 w-3 transition-transform duration-200 ${
                                        isSubDropdownOpen ||
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
                                              ${
                                                isSubActive
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
                                      transition-transform transition-opacity duration-400 ease-out
                                      ${isSubActive ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0"}
                                    `}
                                    />
                                    <div className="flex items-center justify-start space-x-2">
                                      {/* <SubIcon className="h-3.5 w-3.5 opacity-70" /> */}
                                      <span
                                        className={`transition-all duration-300 whitespace-nowrap ${
                                          isExpanded
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
                                              className={`flex items-center w-full h-7 pl-14 pr-3 text-xs rounded-lg transition-colors duration-150 no-underline whitespace-nowrap ${
                                                isSubSubActive
                                                  ? "bg-primary-500 text-white hover:text-white"
                                                  : "text-text-body1 hover:bg-primary-50 hover:text-primary-600"
                                              }`}
                                            >
                                              <div className="flex items-center space-x-2">
                                                <SubSubIcon className="h-3 w-3 opacity-70" />
                                                <span
                                                  className={`font-medium transition-all duration-300 whitespace-nowrap ${
                                                    isExpanded
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
