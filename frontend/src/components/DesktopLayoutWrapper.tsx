/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useScreenSize } from "../hooks/useScreenSize";
import { LogOut, ChevronDown, User, Dock, RotateCcwKey } from "lucide-react";
import defaultProfile from "../assets/face-rec.png";
import CollapsibleSidebar from "./shared/CollapsibleSidebar";
import NotificationBell from "./Notification/NotificationBell";
import { useLoggedInUser } from "../hooks/useLoggedInUser";
import { useCurrentEmployeeAllDetails } from "../hooks/useEmployee";
import { ROUTES } from "../constants/routes";
import useCurrentUser from "../hooks/useCurrentUser";
import useLogout from "../hooks/useLogout";
import { useRequestPasswordReset } from "../hooks/useResetPassword";
import { toast } from "react-hot-toast";
import { errorResponseFormater } from "../utils/errorResponseFormater";
import ViewingAsBanner from "./ViewingAsBanner";
import { useTargetUser } from "../context/ViewedUserContext";
import SearchMembers from "./shared/SearchMembers";
import Button from "./shared/atoms/Button";
import { Typography } from "./shared/atoms/Typography";

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
  const { mutateAsync: logout } = useLogout();
  // Force static badge count for UI demo
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const { data: userId } = useLoggedInUser();
  const { data: currentEmployee, isLoading: currentEmpIsLoading } =
    useCurrentEmployeeAllDetails(userId || "");
  const { clearTargetEmployee } = useTargetUser();

  const { data: currentUser } = useCurrentUser();
  const canRedirectToDesk = currentUser?.roles?.some((role) =>
    ["System User", "Payroll Manager", "System Manager"].includes(role.role)
  );
  // logout logic
  const logoutHandler = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };
  // reset password logic can be added here
  const loginUserEmail = currentUser?.email || "";
  const mutation = useRequestPasswordReset();
  const handleReset = () => {
    const email = loginUserEmail;
    mutation.mutate(email, {
      onSuccess: (data) => {
        toast.success("Password reset email sent successfully!");
        console.log("Response:", data);
      },
      onError: (error: any) => {
        const formatedError = errorResponseFormater(
          error,
          "Failed to send password reset email!"
        );
        toast.error(formatedError);
      },
    });
  };

  const currentUserIsAdmin = currentUser?.roles?.some(
    (role) => "Administrator" == role.role
  );

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
  const contentMarginLeft = isSidebarExpanded ? "left-64" : "left-20";
  const contentWidthLeft = isSidebarExpanded ? "16rem" : "5rem";

  return (
    <div className="h-screen bg-app flex">
      {/* Collapsible Sidebar */}
      <CollapsibleSidebar
        isExpanded={isSidebarExpanded}
        setIsExpanded={setIsSidebarExpanded}
      />

      {/* Main Content */}
      <div
        className={`flex-1 ${contentMarginLeft}  flex flex-col h-screen transition-all duration-300 ease-in-out relative`}
        style={{ maxWidth: `calc(100% - ${contentWidthLeft})` }}
      >
        {/* Header */}
        <div
          className="bg-gradient-to-r from-primary-500 via-primary-400 to-primary-500 border-b border-gray-200 px-8 py-[0.3rem] flex items-center justify-between sticky top-0 z-[11] flex-shrink-0"
          style={{ height: "73px", maxHeight: "73px" }}
        >
          <div>
            <Typography variant="h3" component="h1" color="white">
              {getPageTitle()}
            </Typography>
            <Typography
              variant="label"
              color="white"
              className="opacity-90 block"
            >
              Manage your {getPageTitle().toLowerCase()}
            </Typography>
          </div>
          {location.pathname !== ROUTES.SEARCH_MEMBERS && <SearchMembers />}
          <div className="flex items-center gap-4 flex-shrink-0">
            <button
              onClick={handleNotificationClick}
              className="relative p-2 hover:bg-primary-400/20 rounded-lg transition-colors"
            >
              <NotificationBell />
            </button>

            <div className="relative" ref={profileDropdownRef}>
              {currentUserIsAdmin ? (
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-3 hover:bg-primary-400/20 rounded-lg p-2 transition-colors"
                >
                  <div className="text-right">
                    <Typography variant="body" color="white">
                      {currentUser?.username}
                    </Typography>
                    <Typography variant="label" color="white">
                      Employee ID: {currentEmployee?.employee}
                    </Typography>
                  </div>
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20">
                    <img
                      src={currentUser?.user_image || defaultProfile}
                      alt="User avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-white transition-transform ${showProfileDropdown ? "rotate-180" : ""
                      }`}
                  />
                </button>
              ) : currentEmpIsLoading || !currentEmployee?.employee ? (
                <div className="flex w-30 animate-pulse gap-2 items-center">
                  <div className="h-4 bg-primary-400/20 rounded w-20  flex-1"></div>
                  <div className="h-6 w-6 bg-primary-400/20 rounded-full "></div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="flex items-center gap-3 hover:bg-primary-400/20 rounded-lg p-2 transition-colors"
                  >
                    <div className="text-right">
                      <Typography
                        variant="bodyMedium"
                        color="white"
                        className="block outline-none"
                      >
                        {currentEmployee?.employee_name ||
                          currentEmployee?.first_name}
                      </Typography>
                      <Typography
                        variant="label"
                        color="white"
                        className="opacity-80 block"
                      >
                        Employee ID: {currentEmployee?.employee}
                      </Typography>
                    </div>
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20">
                      <img
                        src={currentEmployee?.image || defaultProfile}
                        alt="User avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-white transition-transform ${showProfileDropdown ? "rotate-180" : ""
                        }`}
                    />
                  </button>
                </>
              )}

              {/* Profile Dropdown */}
              {showProfileDropdown && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[9999]">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-14 h-14 flex-shrink-0 rounded-full overflow-hidden border border-gray-300">
                        <img
                          src={currentEmployee?.image || defaultProfile}
                          alt="User avatar"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <Typography
                          variant="subheading"
                          color="title"
                          className="truncate block"
                        >
                          {currentEmployee?.employee_name ||
                            currentEmployee?.first_name ||
                            "Temp User"}
                        </Typography>
                        <Typography
                          variant="bodySmall"
                          color="secondary"
                          className="break-words block"
                        >
                          {currentEmployee?.company_email ||
                            currentEmployee?.personal_email ||
                            "Temp Email"}
                        </Typography>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <Button
                      variant="subtle"
                      size="md"
                      fullWidth
                      contentAlign="start"
                      onClick={() => {
                        clearTargetEmployee();
                        navigate(`/webapp/employee-profile`);
                        setShowProfileDropdown(false);
                      }}
                    >
                      <User className="w-4 h-4" />
                      My Profile
                    </Button>
                    {canRedirectToDesk && (
                      <Button
                        variant="subtle"
                        size="md"
                        fullWidth
                        contentAlign="start"
                        onClick={() => {
                          window.location.href = "/app/home";
                        }}
                      >
                        <Dock className="w-4 h-4" />
                        Switch to Admin
                      </Button>
                    )}
                    <Button
                      variant="subtle"
                      size="md"
                      fullWidth
                      onClick={handleReset}
                      contentAlign="start"
                      disabled={mutation.isPending}
                    >
                      {mutation.isPending ? (
                        "Sending..."
                      ) : (
                        <>
                          <RotateCcwKey className="w-4 h-4" />
                          Reset Password
                        </>
                      )}
                    </Button>

                    <hr className="my-2 border-gray-100" />
                    <Button
                      variant="subtle"
                      size="md"
                      fullWidth
                      contentAlign="start"
                      onClick={async () => {
                        await logoutHandler();
                        setShowProfileDropdown(false);
                      }}
                      bgColor="error"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Viewing As Banner */}
        <ViewingAsBanner />

        {/* Page Content */}
        <div className="flex-1 overflow-hidden relative bg-app">
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
