import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MobileDashboard from "../components/MobileDashboard/MobileDashboard";
import DesktopDashboard from "./DesktopDashboard";
import { useScreenSize } from "../hooks/useScreenSize";
import { useTargetUser } from "../context/ViewedUserContext";
import { useImpersonationSettings } from "../hooks/useImpersonationSettings";
import { useGetUiPermission } from "../hooks/userUiPermission";
import { getImpersonationFallbackRoute } from "../utils/impersonationUtils";

const ResponsiveDashboard: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const { isViewingOtherUser } = useTargetUser();
  const { data: impersonationSettings } = useImpersonationSettings();
  const { data: uiPermissions } = useGetUiPermission();
  const navigate = useNavigate();

  const isDashboardHidden =
    isViewingOtherUser && !impersonationSettings?.show_dashboard;

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
