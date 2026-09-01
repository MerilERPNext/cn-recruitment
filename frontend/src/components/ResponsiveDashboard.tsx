import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MobileDashboard from "../components/MobileDashboard/MobileDashboard";
import DesktopDashboard from "./DesktopDashboard";
import { useScreenSize } from "../hooks/useScreenSize";
import { useTargetUser } from "../context/ViewedUserContext";
import { useAttendanceSettings } from "../hooks/useAttendance";
import { useGetUiPermission } from "../hooks/userUiPermission";
import { getImpersonationFallbackRoute } from "../utils/impersonationUtils";

const ResponsiveDashboard: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const { isViewingOtherUser } = useTargetUser();
  const { data: attendanceSettings } = useAttendanceSettings();
  const { data: uiPermissions } = useGetUiPermission();
  const navigate = useNavigate();

  const isDashboardHidden =
    Boolean(attendanceSettings?.show_dashboard_self_only) &&
    isViewingOtherUser;

  useEffect(() => {
    if (isDashboardHidden) {
      const fallbackRoute = getImpersonationFallbackRoute(uiPermissions);
      navigate(fallbackRoute, { replace: true });
    }
  }, [isDashboardHidden, uiPermissions, navigate]);

  if (isDashboardHidden) {
    return null;
  }

  return isDesktop ? <DesktopDashboard /> : <MobileDashboard />;
};

export default ResponsiveDashboard;
