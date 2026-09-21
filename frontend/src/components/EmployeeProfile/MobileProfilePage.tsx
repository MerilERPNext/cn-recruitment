import {
  ChevronRight,
  CreditCard,
  HelpCircle,
  Loader2,
  LogOut,
  RotateCcwKey,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import defaultProfile from "../../assets/user.png";
import { useTargetUser } from "../../context/ViewedUserContext";
import {
  useCurrentEmployeeDetails,
  useGetEmployeeDetailsByEmpIdForProfile,
} from "../../hooks/useEmployee";
import useLogout from "../../hooks/useLogout";
import ChangePassword from "../ChangePassword/ChangePassword";
import Button from "../shared/atoms/Button";

type QuickAction = {
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
};

/* PW Brand Gradient Banner with subtle decorative curve lines */
const ThemePatternBanner = () => (
  <div className="relative h-28 w-full overflow-hidden bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500">
    <svg
      className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
      viewBox="0 0 400 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      <path
        d="M-40,15 C50,85 140,5 240,65 C340,125 430,35 480,75"
        stroke="white"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M-40,35 C50,105 140,20 240,80 C340,140 430,50 480,90"
        stroke="white"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M-40,55 C50,125 140,40 240,100 C340,160 430,70 480,110"
        stroke="white"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="340" cy="20" r="60" fill="white" fillOpacity="0.08" />
      <circle cx="60" cy="110" r="50" fill="white" fillOpacity="0.08" />
    </svg>
  </div>
);

const MobileProfilePage = () => {
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleReset = () => {
    setShowChangePasswordModal(true);
  };

  const quickActions: QuickAction[] = [
    {
      label: "Helpdesk",
      icon: (
        <HelpCircle className="w-5 h-5 text-gray-500 group-hover:text-primary-600 transition-colors" />
      ),
      href: "/webapp/helpdesk",
    },
    {
      label: "Virtual ID Card",
      icon: (
        <CreditCard className="w-5 h-5 text-gray-500 group-hover:text-primary-600 transition-colors" />
      ),
      href: "/webapp/id-card",
    },
    {
      label: "Policies",
      icon: (
        <ShieldCheck className="w-5 h-5 text-gray-500 group-hover:text-primary-600 transition-colors" />
      ),
      href: "/webapp/policies-app",
    },
    {
      label: "Reset Password",
      icon: (
        <RotateCcwKey className="w-5 h-5 text-gray-500 group-hover:text-primary-600 transition-colors" />
      ),
      onClick: handleReset,
    },
  ];

  const navigate = useNavigate();
  const { targetEmployeeId } = useTargetUser();
  const { data: currentUser, isLoading: isCurrentUserLoading } =
    useCurrentEmployeeDetails({ logged_in_employee_details: true });

  const employeeId =
    targetEmployeeId ||
    (isCurrentUserLoading ? null : currentUser?.employee) ||
    "";

  const { data: empData, isLoading: isEmpDataLoading } =
    useGetEmployeeDetailsByEmpIdForProfile(employeeId);

  const user = empData?.employee;
  const department =
    user?.department_display || user?.department_name || user?.department;
  const empCode = user?.employee || user?.name || user?.employee_id;
  const location = user?.branch_display || user?.branch_name || user?.branch;

  const { mutateAsync: logout } = useLogout();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logoutHandler = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const win = window as any;
      if (win?.isApp && win?.nativeInterface?.execute) {
        await win.nativeInterface.execute("logout");
        alert("Logged out");
      } else {
        await logout();
      }
      sessionStorage.removeItem("viewed_employee_id");
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="bg-app min-h-screen text-text-title font-brand pb-10">
      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Section 1: Profile Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Theme Brand Banner */}
          <ThemePatternBanner />

          {/* Profile Body */}
          <div className="px-5 pb-5 pt-0 flex flex-col items-center text-center">
            {/* Avatar (Overlapping banner) */}
            <div className="relative -mt-11 mb-2">
              <img
                src={!imageError && user?.image ? user.image : defaultProfile}
                alt={user?.employee_name || "Employee"}
                className="w-20 h-20 rounded-full border-4 border-white shadow-md object-cover bg-white"
                onError={() => setImageError(true)}
              />
            </div>

            {/* Employee Name */}
            <h2 className="text-lg font-bold text-text-title tracking-tight leading-snug">
              {user?.employee_name ||
                (isEmpDataLoading ? "Loading..." : "Employee")}
            </h2>

            {/* Employee ID */}
            {empCode && (
              <p className="text-xs font-semibold text-text-body2 mt-0.5 tracking-wider uppercase">
                {empCode}
              </p>
            )}

            {/* Department */}
            {department && (
              <p className="text-xs font-semibold text-text-body2 mt-0.5 tracking-wider">
                {department}
              </p>
            )}

            {/* Location */}
            {location && (
              <p className="text-xs text-text-body2 mt-1.5 px-3 line-clamp-1 truncate max-w-xs">
                {location}
              </p>
            )}

            {/* Theme Primary View Profile Button */}
            <Button
              variant="contain"
              bgColor="primary"
              className="w-full mt-4 py-2.5 rounded-xl text-sm font-medium shadow-sm hover:shadow transition-all"
              onClick={() => navigate("/webapp/employee-profile")}
            >
              View Profile
            </Button>
          </div>
        </div>

        {/* Section 2: Quick Actions Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100">
          {quickActions.map((action) => {
            const content = (
              <div className="flex items-center justify-between px-4 py-3.5 hover:bg-primary-50/40 active:bg-primary-50/80 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="shrink-0">{action.icon}</span>
                  <span className="text-sm font-medium text-text-body1 group-hover:text-primary-700 transition-colors truncate">
                    {action.label}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors shrink-0 ml-2" />
              </div>
            );

            if (action?.href) {
              return (
                <Link key={action.label} to={action.href} className="block">
                  {content}
                </Link>
              );
            }

            return (
              <div key={action.label} onClick={action.onClick}>
                {content}
              </div>
            );
          })}

          {/* Logout Option */}
          <div
            onClick={logoutHandler}
            className={`flex items-center justify-between px-4 py-3.5 hover:bg-error-50/50 active:bg-error-50 transition-colors cursor-pointer group ${
              isLoggingOut ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <span className="text-error shrink-0">
                {isLoggingOut ? (
                  <Loader2 className="w-5 h-5 animate-spin text-error" />
                ) : (
                  <LogOut className="w-5 h-5" />
                )}
              </span>
              <span className="text-sm font-medium text-error truncate">
                {isLoggingOut ? "Logging out..." : "Logout"}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-error transition-colors shrink-0 ml-2" />
          </div>
        </div>

        {/* Change Password Modal */}
        <ChangePassword
          isOpen={showChangePasswordModal}
          onClose={() => setShowChangePasswordModal(false)}
        />
      </div>
    </div>
  );
};

export default MobileProfilePage;
