import type React from "react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Calendar,
  User,
  DollarSign,
  ArrowUpDown,
  Receipt,
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
} from "lucide-react";
import { useCompanyLogo } from "../../hooks/useCompanyLogo";

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

  const logoToShow =
    Array.isArray(companyLogo) && companyLogo.length > 0
      ? companyLogo[0].company_logo || "logo not found"
      : "Logo not found";

  const companyName =
    Array.isArray(companyLogo) && companyLogo.length > 0
      ? companyLogo[0].company_name
      : "Company name not found";
  console.log("Company Logo:", logoToShow, companyName);
  const navigationItems: NavigationItem[] = [
    {
      icon: Home,
      label: "Dashboard",
      path: "/webapp/",
    },
    {
      icon: Calendar,
      label: "Leaves & Holidays",
      path: "/webapp/leave-app",
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
      ],
    },
    {
      icon: User,
      label: "Attendance",
      path: "/webapp/attendance",
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
          href: "/webapp/attendance/planned-overtime-requests",
        },
        {
          name: "All Shifts",
          icon: ArrowUpDown,
          href: "/webapp/shift-request/all-shifts-dashboard",
        },
      ],
    },
    {
      icon: DollarSign,
      label: "Compensation",
      path: "/webapp/salary-slip-app",
      subItems: [
        {
          name: "Annual CTC",
          icon: Calculator,
          href: "/webapp/salary-slip-app/ctc-salary-breakdown?view=annual",
        },
        {
          name: "Monthly Salary",
          icon: Calculator,
          href: "/webapp/salary-slip-app/ctc-salary-breakdown?view=monthly",
        },
        {
          name: "Salary Slip",
          icon: CreditCard,
          href: "/webapp/salary-slip-app/salary-slip-list",
        },
        {
          name: "Loan",
          icon: Wallet,
          href: "/webapp/salary-slip-app/loan",
        },
        {
          name: "Payroll Documents",
          icon: FileText,
          href: "/webapp/salary-slip-app/hr-payroll",
        },
      ],
    },
    {
      icon: Receipt,
      label: "Expenses",
      path: "/webapp/expenses-app/expenses-list",
    },
    {
      icon: Shield,
      label: "Policies",
      path: "/webapp/policies-app",
    },
  ];

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
            location.pathname.startsWith(route + "/")
        );
      }

      // Check for exact match first
      if (location.pathname === path) {
        return true;
      }

      // Then check for prefix match with proper boundary
      if (location.pathname.startsWith(path)) {
        const remainingPath = location.pathname.substring(path.length);
        return remainingPath === "" || remainingPath.startsWith("/");
      }
    }
    return false;
  };

  const isItemActive = (item: NavigationItem) => {
    if (item.path === "/webapp/") {
      return location.pathname === "/webapp/";
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

    // Don't close dropdown if there's an active subItem that should keep it open
    const activeParent = navigationItems.find((item) =>
      item.subItems?.some((subItem) => isSubItemActive(subItem))
    );

    if (!activeParent) {
      setOpenDropdown(null);
    }

    setOpenSubDropdown(null);
  };

  useEffect(() => {
    const activeParent = navigationItems.find((item) =>
      item.subItems?.some((subItem) => isSubItemActive(subItem))
    );

    setOpenDropdown(activeParent?.label || null);
  }, [location.pathname]);

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
        className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 shadow-lg overflow-y-auto scrollbar-hide transition-all duration-300 ease-in-out z-20 ${
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
            className="px-4 py-3 border-b border-gray-200"
            style={{ height: "73px" }}
          >
            <div className="flex items-center  gap-3 h-full">
              <img
                src={typeof logoToShow === "string" ? logoToShow : ""}
                alt="PayWise"
                className="w-12 h-12 rounded-full  flex-shrink-0"
              />
              <div
                className={`transition-all duration-300 ${
                  isExpanded ? "opacity-100" : "opacity-0 -translate-x-2"
                }`}
              >
                <h2 className="font-semibold text-gray-900 whitespace-nowrap">
                  {companyName}
                </h2>
                <p className="text-sm text-gray-500 whitespace-nowrap">
                  Employee Portal
                </p>
              </div>
            </div>
          </div>
          <div className="flex-1 p-4 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isAnySubItemActive = item.subItems?.some((subItem) =>
                isSubItemActive(subItem)
              );
              const isItemDirectlyActive =
                isItemActive(item) && !isAnySubItemActive;
              const isDropdownOpen = openDropdown === item.label;

              let parentItemClasses = "";
              if (isExpanded) {
                if (isAnySubItemActive) {
                  parentItemClasses = "bg-gray-100 text-gray-900";
                } else if (isItemDirectlyActive && !hasSubItems) {
                  parentItemClasses = "bg-gray-900 text-white";
                } else if (isDropdownOpen) {
                  parentItemClasses = "bg-gray-100 text-gray-900";
                } else {
                  parentItemClasses =
                    "text-gray-700 hover:bg-gray-100 hover:text-gray-900";
                }
              } else {
                if (
                  isAnySubItemActive ||
                  (isItemDirectlyActive && !hasSubItems)
                ) {
                  parentItemClasses = "bg-gray-900 text-white";
                } else {
                  parentItemClasses =
                    "text-gray-700 hover:bg-gray-100 hover:text-gray-900";
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
                        </div>
                        <span
                          className={`font-medium whitespace-nowrap transition-all duration-300 ${
                            isExpanded
                              ? "opacity-100"
                              : "opacity-0 -translate-x-2"
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                      {isExpanded && (
                        <ChevronRight
                          className={`h-4 w-4 transition-transform duration-200 ${
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
                          ? "bg-gray-900 text-white hover:text-white"
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span
                          className={`font-medium whitespace-nowrap transition-all duration-300 ${
                            isExpanded
                              ? "opacity-100"
                              : "opacity-0 -translate-x-2"
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                    </Link>
                  )}
                  {hasSubItems &&
                    (isDropdownOpen || isAnySubItemActive) &&
                    isExpanded && (
                      <div className="overflow-hidden transition-all duration-300 ease-in-out">
                        <div className="py-1 space-y-1">
                          {item.subItems?.map((subItem) => {
                            const SubIcon = subItem.icon;
                            const hasSubSubItems =
                              subItem.subItems && subItem.subItems.length > 0;
                            const isSubActive = isSubItemActive(subItem);
                            const isSubDropdownOpen =
                              openSubDropdown === subItem.name;
                            const isAnySubSubItemActive =
                              subItem.subItems?.some((subSubItem) =>
                                isSubSubItemActive(subSubItem)
                              );

                            return (
                              <div key={subItem.name}>
                                {hasSubSubItems ? (
                                  <div
                                    onClick={() =>
                                      handleSubItemClick(subItem.name, true)
                                    }
                                    className={`flex items-center justify-between w-full h-8 pl-12 pr-3 text-sm rounded-lg transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                                      isSubActive || isSubDropdownOpen
                                        ? "bg-gray-100 text-gray-900"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                                  >
                                    <div className="flex items-center space-x-2">
                                      <SubIcon className="h-3.5 w-3.5 opacity-70" />
                                      <span
                                        className={`font-medium transition-all duration-300 whitespace-nowrap ${
                                          isExpanded
                                            ? "opacity-100 translate-x-0"
                                            : "opacity-0 -translate-x-2"
                                        }`}
                                      >
                                        {subItem.name}
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
                                    className={`flex items-center w-full h-8 pl-12 pr-3 text-sm rounded-lg transition-colors duration-150 no-underline whitespace-nowrap ${
                                      isSubActive
                                        ? "bg-gray-900 text-white hover:text-white"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                                  >
                                    <div className="flex items-center space-x-2">
                                      <SubIcon className="h-3.5 w-3.5 opacity-70" />
                                      <span
                                        className={`font-medium transition-all duration-300 whitespace-nowrap ${
                                          isExpanded
                                            ? "opacity-100 translate-x-0"
                                            : "opacity-0 -translate-x-2"
                                        }`}
                                      >
                                        {subItem.name}
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
                                                  ? "bg-gray-900 text-white hover:text-white"
                                                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
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
                                                  {subSubItem.name}
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
