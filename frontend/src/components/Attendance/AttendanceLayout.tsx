import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import NavigationTabs, { Tab } from "../NavigationTab";
import HeaderBar from "../HeaderBar";
import { LeaveRequestRefreshProvider } from "../Leaves/LeaveRequestRefreshContext";
import { RequestLeaveModalProvider } from "../Leaves/RequestLeaveModalContext";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize";

const AttendanceLayout: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const tabs: Tab[] = useMemo(
    () => [
      { label: "Attendance", key: "summary" },
      { label: "My Attendance Details", key: "emp-attendance" },
      { label: "Team Attendance", key: "team-attendance" },
      { label: "My Attendance Requests", key: "attendance-request" },
      { label: "Team Attendance Requests", key: "team-attendance-requests" },
    ],
    []
  );
  const location = useLocation();
  const navigate = useNavigate();

  const getCurrentTab = () => {
    const pathSegments = location.pathname.split("/");
    const lastSegment = pathSegments[pathSegments.length - 1];
    return tabs.find((tab) => tab.key === lastSegment) || tabs[0];
  };

  const [activeTab, setActiveTab] = useState(getCurrentTab);

  useEffect(() => {
    const currentTab = getCurrentTab();
    setActiveTab(currentTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleTabChange = (tab: (typeof tabs)[number]) => {
    setActiveTab(tab);
    navigate(`/webapp/attendance/${tab.key}`);
  };

  const mobileLayout = (
    <div className="min-h-screen bg-white">
      {/* Fixed Header */}
      <HeaderBar title={activeTab.label} onBack={() => navigate("/webapp")} />
      <div className="sticky top-[58px] z-50 border-t border-gray-200">
        <NavigationTabs
          tabs={tabs}
          activeTab={activeTab?.key}
          onTabChange={(tab) => {
            handleTabChange(tabs.find((item) => item.key === tab) as Tab);
          }}
        />
      </div>
      {/* Page Content (with top padding to avoid overlap) */}
      <div className="">
        <LeaveRequestRefreshProvider>
          <RequestLeaveModalProvider>
            <Outlet />
          </RequestLeaveModalProvider>
        </LeaveRequestRefreshProvider>
      </div>
    </div>
  );

  const desktopLayout = (
    <DesktopLayoutWrapper title="Attendance">
      <div className="flex flex-col h-full">
        {/* Modern Tab Navigation for Web */}
        <div className="bg-gray-100 border-b border-gray-200 px-8 py-6 flex-shrink-0">
          {/* Navigation Pills */}
          <div className="flex flex-wrap gap-3">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab)}
                className={`relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 transform hover:scale-105 ${
                  activeTab?.key === tab.key
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-md hover:shadow-lg border border-gray-200'
                }`}
              >
                <span className="relative z-10">
                  {tab.label === "Attendance" }
                  {tab.label === "My Attendance Details" }
                  {tab.label === "Team Attendance" }
                  {tab.label === "My Attendance Requests" }
                  {tab.label === "Team Attendance Requests"}
                  {tab.label}
                </span>
                {activeTab?.key === tab.key && (
                  <div className="absolute inset-0  rounded-xl opacity-10"></div>
                )}
              </button>
            ))}
          </div>

          {/* Quick Status Indicator */}
          {/* <div className="flex items-center justify-end mt-4">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Live Tracking</span>
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Synced</span>
              </div>
            </div>
          </div> */}
        </div>
        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <LeaveRequestRefreshProvider>
            <RequestLeaveModalProvider>
              <Outlet />
            </RequestLeaveModalProvider>
          </LeaveRequestRefreshProvider>
        </div>
      </div>
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default AttendanceLayout;
