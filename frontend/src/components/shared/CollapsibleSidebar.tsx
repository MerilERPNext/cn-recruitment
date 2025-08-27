import React, { useState, } from "react";
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
  PlusCircle,
  Clock,
  Users,
  CheckCircle,
} from "lucide-react";
import logo from "../../assets/logo.png";

interface SubMenuItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
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
          name: "Payroll Documents",
          icon: FileText,
          href: "/webapp/salary-slip-app/hr-payroll",
        },
      ],
    },
    {
      icon: ArrowUpDown,
      label: "Shifts",
      path: "/webapp/shift-request",
      subItems: [
        {
          name: "My Shifts",
          icon: Clock,
          href: "/webapp/shift-request/my-shift-assignment",
        },
        {
          name: "Team Shift",
          icon: Users,
          href: "/webapp/shift-request/team-shift",
        },
        {
          name: "Shift Requests",
          icon: PlusCircle,
          href: "/webapp/shift-request/shift-list",
        },
        {
          name: "Shift Change Request",
          icon: ArrowUpDown,
          href: "/webapp/shift-request/shift-change-request",
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

    if (location.pathname.startsWith(item.path)) {
      const remainingPath = location.pathname.substring(item.path.length);
      return remainingPath === "" || remainingPath.startsWith("/");
    }

    return false;
  };
 
  const isSubItemActive = (subItem: SubMenuItem) => {
    if (subItem.href.includes("ctc-salary-breakdown")) {
      const [subItemPath, subItemQuery] = subItem.href.split("?");
      return (
        location.pathname === subItemPath &&
        location.search === `?${subItemQuery}`
      );
    }

    // General logic for other sub-items: exact path match
    if (location.pathname === subItem.href) {
      return true;
    }

    // Fallback: check if the current path starts with the sub-item's href.
    // This handles cases like `/webapp/attendance/summary/detail` matching `/webapp/attendance/summary`.
    // It also ensures it doesn't match partially (e.g., `/webapp/leave-app` should not match `/webapp/leave-application`).
    if (location.pathname.startsWith(subItem.href)) {
      const remainingPath = location.pathname.substring(subItem.href.length);
      return remainingPath === "" || remainingPath.startsWith("/");
    }

    return false;
  };

  /**
   * Handles clicking on a parent navigation item.
   * If the item has sub-items, it toggles the `openDropdown` state for that item.
   */
  const handleParentClick = (itemLabel: string, hasSubItems: boolean) => {
    if (hasSubItems) {
      if (openDropdown === itemLabel) {
        setOpenDropdown(null); // Close the dropdown if it's already open
      } else {
        setOpenDropdown(itemLabel); // Open the clicked dropdown
      }
      // Ensure the main sidebar expands when a dropdown is clicked,
      // but this click does not prevent auto-collapse on mouseleave.
      setIsExpanded(true);
    }
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 shadow-lg overflow-y-auto transition-all duration-300 ease-in-out z-20 ${
        isExpanded ? "w-64" : "w-20" // Sidebar width based on expansion state
      }`}
      // Desktop specific hover behavior for the main sidebar
      onMouseEnter={() => setIsExpanded(true)} // Expand the sidebar on hover entry
      onMouseLeave={() => {
        // Always collapse the sidebar on mouse leave for desktop view
        setIsExpanded(false);
        // Also close any open dropdowns when the main sidebar collapses
        setOpenDropdown(null);
      }}
    >
      <div className="flex flex-col h-full">
        {/* Logo Section */}
        <div
          className="px-4 py-3 border-b border-gray-200"
          style={{ height: "73px" }}
        >
          <div className="flex items-center gap-3 h-full">
            {/* Using the placeholder logo */}
            <img src={logo} alt="PayWise" className="w-8 h-8 flex-shrink-0" />
            <div
              className={`transition-all duration-300 ${
                isExpanded ? "opacity-100" : "opacity-0 -translate-x-2"
              }`}
            >
              <h2 className="font-semibold text-gray-900 whitespace-nowrap">
                PayWise
              </h2>
              <p className="text-sm text-gray-500 whitespace-nowrap">
                Employee Portal
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 p-4 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const hasSubItems = item.subItems && item.subItems.length > 0;
            // Check if any sub-item within this parent is currently active
            const isAnySubItemActive = item.subItems?.some((subItem) =>
              isSubItemActive(subItem)
            );
            // Check if this specific navigation item's path is active, but only if it's a standalone link
            // or if it's the parent of active sub-items (handled by isAnySubItemActive).
            const isItemDirectlyActive =
              isItemActive(item) && !isAnySubItemActive;
            // Check if this specific dropdown is currently open due to a user click
            const isDropdownOpen = openDropdown === item.label;

            // Determine the CSS classes for the parent navigation item's background and text color.
            let parentItemClasses = "";
            if (isExpanded) {
              // In expanded mode:
              // Parent should be black only if it's directly active (and has no active sub-items).
              // If the dropdown is open (isDropdownOpen), it should show a gray effect, not black.
              if (isItemDirectlyActive && !hasSubItems) {
                parentItemClasses = "bg-gray-900 text-white"; // Black for directly active standalone links
              } else if (isDropdownOpen) {
                parentItemClasses = "bg-gray-100 text-gray-900"; // Gray effect for open dropdown
              } else {
                parentItemClasses =
                  "text-gray-700 hover:bg-gray-100 hover:text-gray-900"; // Default styling
              }
            } else {
              // In collapsed mode:
              // Parent should be black if any sub-item is active, or its dropdown is open, or it's directly active.
              // This ensures the icon is highlighted.
              if (
                isAnySubItemActive ||
                isDropdownOpen ||
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
                  // Render a div that acts as a clickable parent for sub-items
                  <div
                    onClick={() => handleParentClick(item.label, true)} // Attach click handler
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
                            : "opacity-0 -translate-x-2" // Text visibility
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                    {isExpanded && ( // Only show chevron if sidebar is expanded
                      <ChevronRight
                        className={`h-4 w-4 transition-transform duration-200 ${
                          isDropdownOpen || isAnySubItemActive
                            ? "rotate-90"
                            : "" // Rotate if dropdown is open or sub-item is active
                        }`}
                      />
                    )}
                  </div>
                ) : (
                  // Render a direct Link component for items without sub-items
                  <Link
                    to={item.path}
                    className={`flex items-center justify-between w-full h-12 px-3 rounded-lg text-sm font-medium transition-all duration-200 no-underline ${
                      isItemDirectlyActive // Use isItemDirectlyActive for standalone links
                        ? "bg-gray-900 text-white hover:text-white" // Black background for active direct link
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900" // Default styling
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
                            : "opacity-0 -translate-x-2" // Text visibility
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                  </Link>
                )}

                {/* Sub-navigation items */}
                {/* Render sub-items if the parent has them AND either its dropdown is open OR a sub-item is active AND the sidebar is expanded */}
                {hasSubItems &&
                  (isDropdownOpen || isAnySubItemActive) &&
                  isExpanded && (
                    <div className="overflow-hidden transition-all duration-300 ease-in-out">
                      <div className="py-1 space-y-1">
                        {item.subItems?.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isSubActive = isSubItemActive(subItem);

                          return (
                            <Link
  key={subItem.name}
  to={subItem.href}
  className={`flex items-center w-full h-8 pl-12 pr-3 text-sm rounded-lg transition-colors duration-150 no-underline whitespace-nowrap ${
    isSubActive
      ? "bg-gray-900 text-white hover:text-white" // Active sub-item
      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900" // Default
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
  );
};

export default CollapsibleSidebar;
