import React, { useMemo } from "react";
import HeaderBar from "../HeaderBar";
import { useNavigate, Outlet, useLocation } from "react-router";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize";
import Button from "../shared/atoms/Button";

const RecruitmentApp: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const location = useLocation();
  const actionButton = (
    <Button
      size="lg"
      onClick={() => navigate("/webapp/recruitment/requisition/new")}
    >
      + New Requisition
    </Button>
  );

  const title = useMemo(() => {
    const path = location.pathname;

    const routeTitles: Record<string, string> = {
      "/webapp/policies-app": "Policy Category",
      "/webapp/policies-app/policies-list": "Policies",
    };

    return routeTitles[path] || "Recruitment";
  }, [location.pathname]);

  const mobileLayout = (
    <div className="flex flex-col min-h-screen">
      <HeaderBar title={title} onBack={() => navigate(-1)} />
      <main className="md:p-4 z-100 flex-grow overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );

  const desktopLayout = (
    <DesktopLayoutWrapper title="Recruitment" actionButton={actionButton}>
      <div className="px-2 py-4 overflow-y-auto h-full">
        <Outlet />
      </div>
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default RecruitmentApp;
