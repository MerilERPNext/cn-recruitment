import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useScreenSize } from "../hooks/useScreenSize";
import { LogOut, ChevronDown, User, Search } from "lucide-react";
import defaultProfile from "../assets/face-rec.png";
import CollapsibleSidebar from "./shared/CollapsibleSidebar";
import { useFrappeAuth } from "frappe-react-sdk";
import NotificationBell from "./Notification/NotificationBell";
import { useLoggedInUser } from "../hooks/useLoggedInUser";
import { useCurrentEmployeeAllDetails } from "../hooks/useEmployee";
import { ROUTES } from "../constants/routes";

interface DesktopLayoutWrapperProps {
  children: React.ReactNode;
  title?: string;
  actionButton?: React.ReactNode;
}

const DesktopLayoutWrapper: React.FC<DesktopLayoutWrapperProps> = ({
  children,
  title,
  actionButton,
}) => {
  const { isDesktop } = useScreenSize();
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useFrappeAuth();
  // Force static badge count for UI demo
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const { data: userId } = useLoggedInUser();
  const { data: currentEmployee, isLoading: currentEmpIsLoading } =
    useCurrentEmployeeAllDetails(userId || "");

  // logout logic
  const logoutHandler = async () => {
    try {
      await logout();
      // Full reload karne ke liye
      window.location.href = "/login";
      // ya
      // window.location.replace("/login#login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Handle click outside profile dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setShowProfileDropdown(false);
      }
    };

    if (showProfileDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileDropdown]);

  // If not desktop, render children as-is (mobile layout)
  if (!isDesktop) {
    return <>{children}</>;
  }

  const navigationItems = [
    {
      label: "Dashboard",
      path: "/webapp/",
      active: location.pathname === "/webapp/",
    },
    {
      label: "Leaves & Holidays",
      path: "/webapp/leave-app",
      active: location.pathname.startsWith("/webapp/leave-app"),
    },
    {
      label: "Attendance",
      path: "/webapp/attendance",
      active: location.pathname.startsWith("/webapp/attendance"),
    },
    {
      label: "Compensation",
      path: "/webapp/salary-slip-app",
      active: location.pathname.startsWith("/webapp/salary-slip-app"),
    },
    {
      label: "Shifts",
      path: "/webapp/shift-request",
      active: location.pathname.startsWith("/webapp/shift-request"),
    },
    {
      label: "Expenses",
      path: "/webapp/expenses-app",
      active: location.pathname.startsWith("/webapp/expenses-app"),
    },
    {
      label: "Policies",
      path: "/webapp/policies-app",
      active: location.pathname.startsWith("/webapp/policies-app"),
    },
  ];

  const getPageTitle = () => {
    if (title) return title;

    const activeItem = navigationItems.find((item) => item.active);
    return activeItem?.label || "Dashboard";
  };

  const handleNotificationClick = () => {
    navigate("/webapp/notification-log");
  };

  // Calculate dynamic margin based on sidebar width
  const contentMarginLeft = isSidebarExpanded ? "ml-64" : "ml-20";

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Collapsible Sidebar */}
      <CollapsibleSidebar
        isExpanded={isSidebarExpanded}
        setIsExpanded={setIsSidebarExpanded}
      />

      {/* Main Content */}
      <div
        className={`flex-1 ${contentMarginLeft} flex flex-col h-screen transition-all duration-300 ease-in-out`}
      >
        {/* Header */}
        <div
          className="bg-white border-b border-gray-200 px-8 py-3 flex items-center justify-between sticky top-0 z-10 flex-shrink-0"
          style={{ height: "73px" }}
        >
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {getPageTitle()}
            </h1>
            <p className="text-xs text-gray-600">
              Manage your {getPageTitle().toLowerCase()}
            </p>
          </div>
          {location.pathname !== ROUTES.SEARCH_MEMBERS && (
            <div className="relative">
              <input
                type="text"
                placeholder="Search members..."
                onClick={() => navigate(ROUTES.SEARCH_MEMBERS)}
                className="w-full pl-10 pr-4 py-1 min-w-[28rem] cursor-pointer bg-gray-200 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder-gray-500"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          )}
          <div className="flex items-center gap-4">
            <button
              onClick={handleNotificationClick}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <NotificationBell />
            </button>

            <div className="relative" ref={profileDropdownRef}>
              {currentEmpIsLoading || !currentEmployee?.employee ? (
                <div className="flex w-30 animate-pulse gap-2 items-center">
                  <div className="h-4 bg-gray-300 rounded w-20  flex-1"></div>
                  <div className="h-6 w-6 bg-gray-300 rounded-full "></div>
                </div>
              ) : (
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 text-right">
                      {currentEmployee?.employee_name ||
                        currentEmployee?.first_name}
                    </p>
                    <p className="text-xs text-gray-500 text-right">
                      Employee ID: {currentEmployee?.employee}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-300">
                    <img
                      src={currentEmployee?.image || defaultProfile}
                      alt="User avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${
                      showProfileDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>
              )}

              {/* Profile Dropdown */}
              {showProfileDropdown && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 flex-shrink-0 rounded-full overflow-hidden border border-gray-300">
                        <img
                          src={currentEmployee?.image || defaultProfile}
                          alt="User avatar"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {currentEmployee?.employee_name ||
                            currentEmployee?.first_name ||
                            "Temp User"}
                        </p>
                        <p className="text-xs text-gray-500 break-words whitespace-normal">
                          {currentEmployee?.company_email ||
                            currentEmployee?.personal_email ||
                            "Temp Email"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="py-2">
                    <button
                      onClick={() => {
                        const employeeId = currentEmployee?.employee;
                        if (employeeId) {
                          navigate(`/webapp/employee-profile/${employeeId}`);
                        }
                        setShowProfileDropdown(false);
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <User className="w-4 h-4" />
                      My Profile
                    </button>

                    <hr className="my-2 border-gray-100" />
                    <button
                      onClick={async () => {
                        await logoutHandler();
                        setShowProfileDropdown(false);
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-hidden relative">
          {children}

          {/* Action Button positioned in bottom right */}
          {actionButton && (
            <div className="fixed bottom-6 right-6 z-30">{actionButton}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesktopLayoutWrapper;
