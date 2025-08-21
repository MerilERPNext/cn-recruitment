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
        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex-shrink-0">
          <NavigationTabs
            tabs={tabs}
            activeTab={activeTab?.key}
            onTabChange={(tab) => {
              handleTabChange(tabs.find((item) => item.key === tab) as Tab);
            }}
          />
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
