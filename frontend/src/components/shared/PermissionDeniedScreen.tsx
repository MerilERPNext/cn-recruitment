import React, { useState } from "react";
import { ShieldX, Mail, LogOut, Loader2 } from "lucide-react";
import { Typography } from "./atoms/Typography";
import useLogout from "../../hooks/useLogout";

interface PermissionDeniedScreenProps {
  onRetry?: () => void;
}

const PermissionDeniedScreen: React.FC<PermissionDeniedScreenProps> = ({ onRetry }) => {
  const { mutateAsync: logout } = useLogout();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logoutHandler = async () => {
    setIsLoggingOut(true);
    try {
      if (window.isApp) {
        await window.nativeInterface?.execute("logout");
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
    <div className="min-h-screen flex items-center justify-center bg-surface p-6">
      <div
        className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-lg border border-primary-50"
        style={{ animation: "ndFadeUp 0.6s ease-out both" }}
      >
        {/* Icon */}
        <div
          className="relative inline-flex mb-6"
          style={{ animation: "ndFloat 3s ease-in-out infinite" }}
        >
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-error-50 border border-error-100 text-error">
            <ShieldX size={40} strokeWidth={1.5} />
          </div>
          {/* Decorative dots */}
          <span
            className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-error-200"
            style={{ animation: "ndOrbit 3s ease-in-out infinite" }}
          />
          <span
            className="absolute -bottom-1 -left-2 w-1.5 h-1.5 rounded-full bg-secondary-300"
            style={{ animation: "ndOrbit 3s ease-in-out infinite 1s" }}
          />
          <span
            className="absolute top-1/2 -right-3 w-1 h-1 rounded-full bg-primary-300"
            style={{ animation: "ndOrbit 3s ease-in-out infinite 0.5s" }}
          />
        </div>

        {/* Title */}
        <Typography variant="h3" color="title" className="mb-3">
          Access Denied
        </Typography>

        {/* Message */}
        <Typography
          variant="bodySmall"
          color="body2"
          align="center"
          className="mb-6 max-w-sm mx-auto leading-relaxed"
        >
          You do not have permission to access any page in this application.
          Please contact your system administrator to get the necessary
          permissions.
        </Typography>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-5" />

        {/* Contact hint */}
        <div className="flex items-center justify-center gap-2 text-text-disabled mb-6">
          <Mail size={14} strokeWidth={2} />
          <Typography variant="caption" color="body2">
            Reach out to your HR or IT admin for assistance
          </Typography>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          {/* Retry button */}
          <button
            className="inline-flex items-center justify-center px-8 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-600 rounded-xl border-none cursor-pointer transition-all duration-200 shadow-md shadow-primary-300/25 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-300/35 active:translate-y-0"
            onClick={onRetry || (() => window.location.reload())}
          >
            Try Again
          </button>

          {/* Logout button */}
          <button
            className={`inline-flex items-center justify-center gap-2 px-8 py-2.5 text-sm font-semibold rounded-xl border cursor-pointer transition-all duration-200 shadow-sm hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed ${
              isLoggingOut
                ? "bg-error text-white border-transparent"
                : "text-error bg-error-50 hover:bg-error-100 border-error-100"
            }`}
            onClick={logoutHandler}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <Loader2 size={16} className="animate-spin text-white" />
            ) : (
              <LogOut size={16} strokeWidth={2} />
            )}
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionDeniedScreen;
