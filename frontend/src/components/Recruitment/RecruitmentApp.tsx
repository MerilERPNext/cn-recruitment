import React, { useMemo, useState, useEffect } from "react";
import HeaderBar from "../HeaderBar";
import { useNavigate, Outlet, useLocation } from "react-router";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize";
import Button from "../shared/atoms/Button";
import NavigationTabs, { Tab } from "../NavigationTab";

type TabName = "Overview" | "Requisition";

const tabRoutes: Record<TabName, string> = {
  Overview: "/webapp/recruitment/overview",
  Requisition: "/webapp/recruitment/requisition",
};

const RecruitmentApp: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabName>("Overview");

  const tabs: Tab[] = (Object.keys(tabRoutes) as TabName[]).map((key) => ({
    key,
    label: key,
  }));

  useEffect(() => {
    const matchedTab = (Object.keys(tabRoutes) as TabName[]).find((tab) =>
      location.pathname.startsWith(tabRoutes[tab])
    );

    if (matchedTab) {
      setActiveTab(matchedTab);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === "/webapp/recruitment") {
      const fallback = "Overview";
      setActiveTab(fallback);
      navigate(tabRoutes[fallback], { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleTabChange = (tabKey: string) => {
    const tab = tabKey as TabName;
    setActiveTab(tab);
    navigate(tabRoutes[tab]);
  };

  const isFormPage = location.pathname === "/webapp/recruitment/requisition/new";

  const shouldShowActionButton = () => {
    if (isFormPage) return false;
    return true;
  };

  const handleAddNew = () => {
    navigate("/webapp/recruitment/requisition/new");
  };

  const title = useMemo(() => {
    const path = location.pathname;

    const routeTitles: Record<string, string> = {
      "/webapp/recruitment/overview": "Overview",
      "/webapp/recruitment/requisition": "Requisition",
      "/webapp/recruitment/requisition/new": "New Requisition",
    };

    return routeTitles[path] || "Recruitment";
  }, [location.pathname]);

  const mobileLayout = (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-50 bg-white border-b">
        <HeaderBar title={title} onBack={() => navigate("/webapp")} />
        {!isFormPage && (
          <NavigationTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        )}
      </div>

      <main className="p-4 z-100 flex-grow overflow-y-auto">
        <Outlet />
      </main>

      {shouldShowActionButton() && (
        <div className="sticky mt-auto bottom-0 bg-white border-t shadow-lg py-4 px-4 w-full">
          <div className="max-w-4xl mx-auto flex space-x-4">
            <Button
              size="lg"
              onClick={handleAddNew}
              className="hover:bg-blue-700 flex-1"
            >
              + Raise Requisition Request
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const actionButton = shouldShowActionButton() ? (
    <Button size="lg" onClick={handleAddNew} className="hover:bg-blue-700">
      + New Requisition
    </Button>
  ) : null;

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
