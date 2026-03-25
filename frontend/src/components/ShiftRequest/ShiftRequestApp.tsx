import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useScreenSize } from "../../hooks/useScreenSize";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import HeaderBar from "../HeaderBar";
import NavigationTabs, { Tab } from "../NavigationTab";
import RequestShiftChangeButton from "./RequestShiftChangeButton";

import { useGetUiPermission } from "../../hooks/userUiPermission";
import { useShiftRouting } from "../../hooks/useShiftRouting";
import Button from "../shared/atoms/Button";
import ShiftRequestFormModal from "./ShiftRequestFormModal";

type TabName =
  | "My Shift Assignment"
  | "Team Shift Assignment"
  | "My Shift Requests"
  | "Team Shift Requests";

const tabRoutes: Record<TabName, string> = {
  "My Shift Assignment": "/webapp/shift-request/my-shift-assignment",
  "Team Shift Assignment": "/webapp/shift-request/team-shift",
  "My Shift Requests": "/webapp/shift-request/shift-list",
  "Team Shift Requests": "/webapp/shift-request/shift-change-request",
};

const ShiftRequestApp: React.FC = () => {
  useShiftRouting();
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabName>("My Shift Assignment");
  const [showShiftRequestModal, setShowShiftRequestModal] = useState(false);

  const tabs: Tab[] = (Object.keys(tabRoutes) as TabName[]).map((key) => ({
    key,
    label: key,
  }));

  const { data: attendnacePermission, isLoading: attendancePermissionLoading } =
    useGetUiPermission("Attendance");
  const { data: ShiftAppPermission, isLoading: ShiftAppPermissionLoading } =
    useGetUiPermission("My Shift Assignment");

  const showShiftChangeButton = useMemo(() => {
    const For = { Desktop: false, Mobile: false };
    if (!attendancePermissionLoading) {
      For.Desktop = Boolean(
        attendnacePermission?.[0]?.pages?.find(
          (page) =>
            page.page_name === "All Shifts" &&
            page?.actions?.find(
              (action) =>
                action.action_name === "request_shift_change" && action.enabled,
            ),
        ) ?? false,
      );
    }

    if (!ShiftAppPermissionLoading) {
      For.Mobile = Boolean(
        ShiftAppPermission?.[0]?.pages?.find(
          (page) =>
            page.page_name === "My Shift Assignment" &&
            page?.actions?.find(
              (action) =>
                action.action_name === "request_shift_change" && action.enabled,
            ),
        ) ?? false,
      );
    }
    return For;
  }, [
    attendnacePermission,
    ShiftAppPermission,
    ShiftAppPermissionLoading,
    attendancePermissionLoading,
  ]);

  useEffect(() => {
    const matchedTab = (Object.keys(tabRoutes) as TabName[]).find((tab) =>
      location.pathname.startsWith(tabRoutes[tab]),
    );

    if (matchedTab) {
      setActiveTab(matchedTab);
    }
  }, [location.pathname]);

  useEffect(() => {
    // for handling copy/pasting link when model is open with requestId as query param from largescreen to small screen
    if (location.pathname === "/webapp/shift-request/all-shifts-dashboard") {
      const queryParams = new URLSearchParams(location.search);
      const requestId = queryParams.get("requestId");
      if (requestId) {
        navigate(
          `/webapp/shift-request/shift-change-request?requestId=${requestId}`,
          { replace: true },
        );
      }
    }
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
    setShowShiftRequestModal(true);
  };

  const handleCloseShiftModal = () => {
    setShowShiftRequestModal(false);
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

      {showShiftChangeButton.Mobile && activeTab === "My Shift Assignment" && (
        <RequestShiftChangeButton onClick={handleShiftForm} />
      )}
      {showShiftRequestModal && (
        <ShiftRequestFormModal isOpen={showShiftRequestModal} onClose={handleCloseShiftModal} />
      )}
    </div>
  );

  // Create the action button for desktop - positioned bottom-right by DesktopLayoutWrapper
  const actionButton = showShiftChangeButton.Desktop && (
    <Button size="lg" onClick={handleShiftForm}>
      + Request Shift Change
    </Button>
  );

  const desktopLayout = (
    <DesktopLayoutWrapper title="Shifts" actionButton={actionButton}>
      <Outlet />
      {showShiftRequestModal && (
        <ShiftRequestFormModal isOpen={showShiftRequestModal} onClose={handleCloseShiftModal} />
      )}
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default ShiftRequestApp;
