import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  ClockIcon,
  BookOpen,
  AlertCircle,
  Users,
  Folder,
  CheckCircle,
  RotateCcw,
} from 'lucide-react';
import logo from '../../assets/logo.png';

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
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

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
        { name: "Apply Leave", icon: PlusCircle, href: "/webapp/leave-app/leaves/leave-requests/my" },
        { name: "Leave History", icon: ClockIcon, href: "/webapp/leave-app/leaves/leave-requests/my" },
        { name: "Holiday Calendar", icon: Calendar, href: "/webapp/leave-app/leaves/holidays" },
        { name: "Leave Balance", icon: Calculator, href: "/webapp/leave-app/leaves/leave-balance" },
      ],
    },
    { 
      icon: User, 
      label: "Attendance", 
      path: "/webapp/attendance",
      subItems: [
        { name: "Attendance", icon: CheckCircle, href: "/webapp/attendance/summary" },
        { name: "Calendar Views", icon: Calendar, href: "/webapp/attendance/emp-attendance" },
        { name: "My Attendance Requests", icon: Clock, href: "/webapp/attendance/attendance-request" },
        { name: "Team Attendance Requests", icon: Users, href: "/webapp/attendance/team-attendance-requests" },
        { name: "Request Overtime", icon: RotateCcw, href: "/webapp/attendance/overtime" },
      ],
    },
    { 
      icon: DollarSign, 
      label: "Compensation", 
      path: "/webapp/salary-slip-app",
      subItems: [
        { name: "CTC Breakdown", icon: Calculator, href: "/webapp/salary-slip-app/ctc-salary-breakdown" },
        { name: "Salary Slip", icon: CreditCard, href: "/webapp/salary-slip-app/salary-slip-list" },
        { name: "Payroll Documents", icon: FileText, href: "/webapp/salary-slip-app/hr-payroll" },
      ],
    },
    { 
      icon: ArrowUpDown, 
      label: "Shifts", 
      path: "/webapp/shift-request",
      subItems: [
        { name: "My Shifts", icon: Clock, href: "/webapp/shift-request/my-shift-assignment" },
        { name: "Team Shift", icon: Users, href: "/webapp/shift-request/team-shift" },
        { name: "Shift Requests", icon: PlusCircle, href: "/webapp/shift-request/shift-list" },
        { name: "Shift Change Request", icon: ArrowUpDown, href: "/webapp/shift-request/shift-change-request" },
      ],
    },
    { 
      icon: Receipt, 
      label: "Expenses", 
      path: "/webapp/expenses-app",
      subItems: [
        { name: "Expenses List", icon: Receipt, href: "/webapp/expenses-app/expenses-list" },
        { name: "General Expense Claim", icon: PlusCircle, href: "/webapp/expenses-app/general-expense-claim" },
        { name: "Daily Allowance Claim", icon: Calendar, href: "/webapp/expenses-app/daily-allowance-claim" },
        { name: "Mileage Expense Claim", icon: Folder, href: "/webapp/expenses-app/mileage-expense-claim" },
      ],
    },
    { 
      icon: Shield, 
      label: "Policies", 
      path: "/webapp/policies-app",
      subItems: [
        { name: "Policy Categories", icon: Folder, href: "/webapp/policies-app" },
        { name: "Policies List", icon: BookOpen, href: "/webapp/policies-app/policies-list" },
        { name: "Safety Guidelines", icon: Shield, href: "/webapp/policies-app" },
        { name: "Code of Conduct", icon: AlertCircle, href: "/webapp/policies-app" },
      ],
    },
  ];

  const isItemActive = (item: NavigationItem) => {
    if (item.path === "/webapp/") {
      return location.pathname === "/webapp/";
    }
    return location.pathname.startsWith(item.path);
  };

  const isSubItemActive = (subItem: SubMenuItem) => {
    return location.pathname === subItem.href || location.pathname.startsWith(subItem.href);
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 shadow-lg overflow-y-auto transition-all duration-300 ease-in-out z-20 ${
        isExpanded ? "w-64" : "w-20"
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => {
        setIsExpanded(false);
        setHoveredItem(null);
      }}
    >
      <div className="flex flex-col h-full">
        {/* Logo Section */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <img src={logo} alt="PayWise" className="w-8 h-8 flex-shrink-0" />
            <div className={`transition-all duration-300 ${isExpanded ? "opacity-100" : "opacity-0 -translate-x-2"}`}>
              <h2 className="font-semibold text-gray-900 whitespace-nowrap">PayWise</h2>
              <p className="text-sm text-gray-500 whitespace-nowrap">Employee Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 p-4 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item);
            const isHovered = hoveredItem === item.label;
            const hasSubItems = item.subItems && item.subItems.length > 0;

            return (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => setHoveredItem(item.label)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <Link
                  to={item.path}
                  className={`flex items-center justify-between w-full h-12 px-3 rounded-lg text-sm font-medium transition-all duration-200 no-underline ${
                    isActive
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
                        isExpanded ? "opacity-100" : "opacity-0 -translate-x-2"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                  {hasSubItems && isExpanded && (
                    <ChevronRight
                      className={`h-4 w-4 transition-transform duration-200 ${
                        isHovered ? "rotate-90" : ""
                      }`}
                    />
                  )}
                </Link>

                {/* Sub-navigation items */}
                {hasSubItems && isHovered && isExpanded && (
                  <div className="overflow-hidden transition-all duration-300 ease-in-out">
                    <div className="py-1 space-y-1">
                      {item.subItems?.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = isSubItemActive(subItem);
                        
                        return (
                          <Link
                            key={subItem.name}
                            to={subItem.href}
                            className={`flex items-center w-full h-8 pl-12 pr-3 text-sm rounded-lg transition-colors duration-150 no-underline ${
                              isSubActive
                                ? "bg-gray-800 text-white hover:text-white"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <SubIcon className="h-3.5 w-3.5 opacity-70" />
                              <span
                                className={`font-medium transition-all duration-300 ${
                                  isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
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
