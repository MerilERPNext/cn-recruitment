import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import HeaderBar from "../HeaderBar";
import RequestShiftChangeButton from "./RequestShiftChangeButton";
import NavigationTabs, { Tab } from "../NavigationTab";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize";

type TabName =
  | "My Shift Assignment"
  | "Team Shift Assignment"
  | "My Shift Requests"
  | "Shift Change Request";

const tabRoutes: Record<TabName, string> = {
  "My Shift Assignment": "/webapp/shift-request/my-shift-assignment",
  "Team Shift Assignment": "/webapp/shift-request/team-shift",
  "My Shift Requests": "/webapp/shift-request/shift-list",
  "Shift Change Request": "/webapp/shift-request/shift-change-request",
};

const ShiftRequestApp: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabName>("My Shift Assignment");

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
    if (location.pathname === "/webapp/shift-request") {
      const savedTab = localStorage.getItem("activeTab") as TabName | null;
      const fallback = "My Shift Assignment";

      const redirectTab = savedTab && tabRoutes[savedTab] ? savedTab : fallback;
      navigate(tabRoutes[redirectTab], { replace: true });
    }
  }, [location.pathname, navigate]);


  const handleTabChange = (tabKey: string) => {
    const tab = tabKey as TabName;
    setActiveTab(tab);
    navigate(tabRoutes[tab]);
  };

  const handleShiftForm = () => {
    navigate(`/webapp/shift-request/shift-change-form`);
  };

  const mobileLayout = (
    <div className="flex flex-col min-h-screen bg-white">
      <style>{`
        :root {
          --primary-color: #0c7ff2;
          --secondary-color: #60758a;
          --text-primary: #111418;
          --text-secondary: #60758a;
          --background-light: #ffffff;
          --background-medium: #f0f2f5;
          --border-light: #dbe0e6;
        }
        .scrollbar-hidden {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .scrollbar-hidden::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Header and Tabs */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <HeaderBar title={activeTab} onBack={() => navigate("/webapp")} />
        <NavigationTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </header>

      {/* Page Content */}
      <main className="p-4 z-100 flex-grow overflow-y-auto">
        <Outlet />
      </main>

      {activeTab === "My Shift Assignment" && (
        <RequestShiftChangeButton onClick={handleShiftForm} />
      )}
    </div>
  );

  const desktopLayout = (
    <DesktopLayoutWrapper title="Shifts">
      <div className="flex flex-col h-full">
        {/* Modern Tab Navigation for Web */}
        <div className="bg-gray-100 border-b border-gray-200 px-8 py-6 flex-shrink-0">
          {/* Navigation Cards */}
          <div className="flex gap-4 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key as TabName)}
                className={`relative px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                  activeTab === tab.key
                    ? 'bg-black text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-md hover:shadow-lg border border-gray-200'
                }`}
              >
                <span className="relative z-10">
                  {tab.label === "My Shift Assignment" }
                  {tab.label === "Team Shift Assignment"}
                  {tab.label === "My Shift Requests"}
                  {tab.label === "Shift Change Request"}
                  {tab.label}
                </span>
                {activeTab === tab.key && (
                  <div className="absolute inset-0 rounded-xl opacity-10"></div>
                )}
              </button>
            ))}
          </div>

          {/* Quick Action Hint */}
          {activeTab === "My Shift Assignment" && (
            <div className="flex items-center justify-end mt-4">
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span>💡 Use "Request Shift Change" button below</span>
              </div>
            </div>
          )}
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          <Outlet />

          {activeTab === "My Shift Assignment" && (
            <div className="absolute bottom-8 right-8">
              <button
                onClick={handleShiftForm}
                className="py-3 px-6 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors shadow-lg"
              >
                Request Shift Change
              </button>
            </div>
          )}
        </div>
      </div>
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default ShiftRequestApp;
