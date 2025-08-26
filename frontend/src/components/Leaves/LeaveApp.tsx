import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import RequestLeave from "./RequestLeave";
import RequestLeaveModal from "./RequestLeaveModal";
import HeaderBar from "../HeaderBar";
import { LeaveRequestRefreshProvider } from "./LeaveRequestRefreshContext";
import {
  useRequestLeaveModal,
  RequestLeaveModalProvider,
} from "./RequestLeaveModalContext";
import NavigationTabs, { Tab } from "../NavigationTab";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize";
import FormDialog from "../shared/FormDialog";

type TabName = "leave-balance" | "requests-status" | "holidays";
type SubTabName = "My Requests" | "Team Requests";

const tabRoutes: Record<TabName, string> = {
  "leave-balance": "/webapp/leave-app/leaves/leave-balance",
  holidays: "/webapp/leave-app/leaves/holidays",
  "requests-status": "/webapp/leave-app/leaves/leave-requests",
};

const subTabRoutes: Record<SubTabName, string> = {
  "My Requests": "/webapp/leave-app/leaves/leave-requests/my",
  "Team Requests": "/webapp/leave-app/leaves/leave-requests/team",
};

const LeaveAppInner: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabName>("leave-balance");
  const [activeSubTab, setActiveSubTab] = useState<SubTabName>("My Requests");



  const tabs: Tab[] = useMemo(
    () => [
      { key: "leave-balance", label: "Leave Balance" },
      { key: "holidays", label: "Holidays" },
      { key: "requests-status", label: "Request Status" },
    ],
    []
  );

  const { showModal, openModal, closeModal } = useRequestLeaveModal();

  const isLeaveRequestsActive = activeTab === "requests-status";

  useEffect(() => {
    const matchedTab = (Object.keys(tabRoutes) as TabName[]).find((tab) =>
      location.pathname.startsWith(tabRoutes[tab])
    );

    if (matchedTab) {
      setActiveTab(matchedTab);
    }

    if (location.pathname.includes("/leave-requests/")) {
      const matchedSubTab = (Object.keys(subTabRoutes) as SubTabName[]).find(
        (subTab) => location.pathname.startsWith(subTabRoutes[subTab])
      );
      if (matchedSubTab) {
        setActiveSubTab(matchedSubTab);
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === "/webapp/leave-app") {
      navigate(tabRoutes["leave-balance"], { replace: true });
    }
    if (location.pathname === "/webapp/leave-app/leaves/leave-requests") {
      navigate(subTabRoutes["My Requests"], { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [showModal]);

 

  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
    if (tab === "requests-status") {
      navigate(subTabRoutes[activeSubTab]);
    } else {
      navigate(tabRoutes[tab]);
    }
  };

  const handleSubTabChange = (subTab: SubTabName) => {
    setActiveSubTab(subTab);
    navigate(subTabRoutes[subTab]);
  };

  const mobileLayout = (
    <div className="flex flex-col min-h-screen bg-white">
      <style>{`
         .scrollbar-hidden {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .scrollbar-hidden::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <HeaderBar
          title={"Leaves & Holidays"}
          onBack={() => navigate("/webapp")}
        />
        <NavigationTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tab) => handleTabChange(tab as TabName)}
        />

        {isLeaveRequestsActive && (
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <div className="flex bg-white rounded-lg p-1 border border-gray-200">
              {(Object.keys(subTabRoutes) as SubTabName[]).map((subTab) => (
                <button
                  key={subTab}
                  onClick={() => handleSubTabChange(subTab)}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    activeSubTab === subTab
                      ? "bg-black text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {subTab}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="z-100 flex-grow overflow-y-auto">
        <Outlet />
      </main>

      {!showModal && activeTab === "requests-status" && (
        <div className="sticky bottom-0 bg-white rounded-md shadow-lg py-4 px-4 w-full z-50">
          <div className="max-w-4xl mx-auto flex">
            <button
              onClick={() => openModal()}
              className="flex-1 py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
            >
              + Request Leave
            </button>
          </div>
        </div>
      )}

      <FormDialog
        isOpen={showModal}
        onClose={closeModal}
        title="Request Leave"
        size="lg"
      >
        <RequestLeave onSuccess={closeModal} onCancel={closeModal} />
      </FormDialog>
    </div>
  );

  // Create the action button for desktop - positioned bottom-right by DesktopLayoutWrapper
  const actionButton = (
    <button
      onClick={() => openModal()}
      className="py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors shadow-lg"
    >
      + Request Leave
    </button>
  );

  const desktopLayout = (
    <DesktopLayoutWrapper title="Leaves & Holidays" actionButton={actionButton}>
      <div className="flex flex-col h-full">
        {/* Page Content */}
        <div className="flex-1 overflow-y-auto relative">
          <Outlet />
        </div>

        <RequestLeaveModal
          isOpen={showModal}
          onClose={closeModal}
          onSuccess={closeModal}
        />
      </div>
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

const LeaveApp: React.FC = () => {
  return (
    <LeaveRequestRefreshProvider>
      <RequestLeaveModalProvider>
        <LeaveAppInner />
      </RequestLeaveModalProvider>
    </LeaveRequestRefreshProvider>
  );
};

export default LeaveApp;
