import React, { useEffect, useMemo, useState } from "react";
import NavigationTabs, { Tab } from "../NavigationTab";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useScreenSize } from "../../hooks/useScreenSize";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import HeaderBar from "../HeaderBar";
import { useGetUiPermission } from "../../hooks/userUiPermission";

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
  const location = useLocation();

  const { data: userUiPermission, isLoading: isLoadingPermission } = useGetUiPermission("Benefits");

  const tabs: Tab[] = useMemo(() => {
    const allTabs: { key: TabName; label: string; permissionKey: string }[] = [
      {
        key: "My Benefits",
        label: "My Benefits",
        permissionKey: "My Benefits",
      },
      {
        key: "My Requests",
        label: "My Requests",
        permissionKey: "My Requests",
      },
      {
        key: "Team Requests",
        label: "Team Requests",
        permissionKey: "Team Requests",
      },
      {
        key: "Benefits Slips",
        label: "Benefits Slips",
        permissionKey: "Benefit Slips",
      },
    ];

    if (!userUiPermission || userUiPermission.length === 0) {
      return allTabs.map(({ key, label }) => ({ key, label }));
    }

    const benefitsAppPermission = userUiPermission.find(
      (perm) => perm.app_name === "Benefits",
    );

    if (!benefitsAppPermission || !benefitsAppPermission.enabled) {
      return [];
    }

    return allTabs
      .filter((tab) => {
        const pagePermission = benefitsAppPermission.pages?.find(
          (page) => page.page_name === tab.permissionKey,
        );
        return pagePermission && pagePermission.enabled;
      })
      .map(({ key, label }) => ({ key, label }));
  }, [userUiPermission]);

  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
    navigate(tabRoutes[tab]);
  };

  useEffect(() => {
    const matchedTab = (Object.keys(tabRoutes) as TabName[]).find((tab) =>
      location.pathname.startsWith(tabRoutes[tab]),
    );

    if (matchedTab) {
      setActiveTab(matchedTab);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === "/webapp/benefits-app" && tabs.length > 0) {
      const firstTab = tabs[0].key as TabName;
      navigate(tabRoutes[firstTab], { replace: true });
    }
  }, [location.pathname, navigate, tabs]);

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
      <main className="z-10 p-2 flex-grow">
        <Outlet />
      </main>
    </div>
  );

  const desktopLayout = (
    <DesktopLayoutWrapper title="Benefits">
      <Outlet />
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default BenefitsApp;
