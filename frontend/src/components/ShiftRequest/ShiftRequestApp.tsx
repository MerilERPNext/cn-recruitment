import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import HeaderBar from "../HeaderBar";
import RequestShiftChangeButton from "./RequestShiftChangeButton";
import NavigationTabs, { Tab } from "../NavigationTab";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import ExpenseFormModal from "../Expenses-App/ExpenseFormModal";
import ShiftRequestFormModal from "./ShiftRequestFormModal";
import { useShiftRouting } from "../../hooks/useShiftRouting";

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
  const { isDesktop } = useShiftRouting();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabName>("My Shift Assignment");
  const [showShiftRequestModal, setShowShiftRequestModal] = useState(false);

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
    if (isDesktop) {
      setShowShiftRequestModal(true);
    } else {
      navigate(`/webapp/shift-request/shift-change-form`);
    }
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

      {activeTab === "My Shift Assignment" && (
        <RequestShiftChangeButton onClick={handleShiftForm} />
      )}
    </div>
  );

  const actionButton = (
    <button
      onClick={handleShiftForm}
      className="py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors shadow-lg"
    >
      + Request Shift Change
    </button>
  );

  const desktopLayout = (
    <DesktopLayoutWrapper title="Shifts" actionButton={actionButton}>
      <div className="flex flex-col h-full">
        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
        {/* Shift Request Modal for Desktop */}
        <ExpenseFormModal
          isOpen={showShiftRequestModal}
          onClose={handleCloseShiftModal}
          title="Request Shift Change"
        >
          <ShiftRequestFormModal onClose={handleCloseShiftModal} />
        </ExpenseFormModal>
      </div>
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default ShiftRequestApp;
