import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import RequestLeave from "./RequestLeave";
import RequestLeaveModal from "./RequestLeaveModal";
import HeaderBar from "../HeaderBar";
import { Toaster } from "react-hot-toast";
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

      <Toaster />
    </div>
  );

  const desktopLayout = (
    <DesktopLayoutWrapper title="Leaves & Holidays">
      <div className="flex flex-col h-full">
        <div className="bg-gray-100 border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key as TabName)}
                  className={`relative px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                    activeTab === tab.key
                      ? "bg-black text-white shadow-lg"
                      : "bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-md hover:shadow-lg border border-gray-200"
                  }`}
                >
                  <span className="relative z-10">{tab.label}</span>
                  {activeTab === tab.key && (
                    <div className="absolute inset-0  rounded-lg opacity-10"></div>
                  )}
                </button>
              ))}
            </div>

            {/* Request Leave Button - Desktop Only (Blue) */}
            <button
              onClick={() => openModal()}
              className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              + Request Leave
            </button>
          </div>
        </div>

        {/* Request Type Card - Outside gray area */}
        {isLeaveRequestsActive && (
          <div className="px-6 py-3 bg-white border-b border-gray-200">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 font-medium">Request Type:</span>
                <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                  {(Object.keys(subTabRoutes) as SubTabName[]).map((subTab) => (
                    <button
                      key={subTab}
                      onClick={() => handleSubTabChange(subTab)}
                      className={`px-6 py-1 rounded-lg font-semibold transition-all duration-200 ${
                        activeSubTab === subTab
                          ? "bg-black text-white shadow-md"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      {subTab === "My Requests" ? "My Requests" : "Team Requests"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Approved</span>
                </div>
              </div>
            </div>
          </div>
        )}

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
      <Toaster />
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