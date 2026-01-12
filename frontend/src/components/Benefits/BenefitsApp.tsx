import React, { useEffect, useState } from "react";
import NavigationTabs, { Tab } from "../NavigationTab";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useScreenSize } from "../../hooks/useScreenSize";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import HeaderBar from "../HeaderBar";

type TabName =
  | "My Benefits"
  | "My Requests"
  | "Benefits Slips"
  | "Team Requests";

const tabRoutes: Record<TabName, string> = {
  "My Benefits": "/webapp/benefits-app/my-benefits",
  "My Requests": "/webapp/benefits-app/my-requests",
  "Team Requests": "/webapp/benefits-app/my-team-requests",
  "Benefits Slips": "/webapp/benefits-app/benefits-slips",
};

const BenefitsApp: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const [activeTab, setActiveTab] = useState<TabName>("My Benefits");
  const navigate = useNavigate();
  const tabs: Tab[] = (Object.keys(tabRoutes) as TabName[]).map((key) => ({
    key,
    label: key,
  }));
  const location = useLocation();

  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
    navigate(tabRoutes[tab]);
  };

  useEffect(() => {
    const matchedTab = (Object.keys(tabRoutes) as TabName[]).find((tab) =>
      location.pathname.startsWith(tabRoutes[tab])
    );

    if (matchedTab) {
      setActiveTab(matchedTab);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === "/webapp/benefits-app") {
      const fallback = "My Benefits";
      setActiveTab(fallback);
      navigate(tabRoutes[fallback], { replace: true });
    }
  }, [location.pathname, navigate]);

  const mobileLayout = (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <HeaderBar title={"Benefits"} onBack={() => navigate("/webapp")} />
        <NavigationTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tab) => handleTabChange(tab as TabName)}
        />
      </header>
      <main className="z-10 p-4 flex-grow">
        <Outlet />
      </main>
    </div>
  );

  const desktopLayout = (
    <DesktopLayoutWrapper title="Benefits">
      <div className="flex flex-col h-full">
        <div className="flex-1 p-4 overflow-y-auto relative">
          <Outlet />
        </div>
      </div>
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default BenefitsApp;