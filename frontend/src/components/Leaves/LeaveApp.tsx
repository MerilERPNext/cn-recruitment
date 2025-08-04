import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import RequestLeave from "./RequestLeave";
import HeaderBar from "../HeaderBar";
import { Toaster } from "react-hot-toast";
import { LeaveRequestRefreshProvider } from "./LeaveRequestRefreshContext";
import {
  useRequestLeaveModal,
  RequestLeaveModalProvider,
} from "./RequestLeaveModalContext";

type TabName = "Leave Balance" | "Requests Status" | "Holidays";
type SubTabName = "My Requests" | "Team Requests";

const tabRoutes: Record<TabName, string> = {
  "Leave Balance": "/webapp/leave-app/leaves/leave-balance",
  Holidays: "/webapp/leave-app/leaves/holidays",
  "Requests Status": "/webapp/leave-app/leaves/leave-requests",
};

const subTabRoutes: Record<SubTabName, string> = {
  "My Requests": "/webapp/leave-app/leaves/leave-requests/my",
  "Team Requests": "/webapp/leave-app/leaves/leave-requests/team",
};

const LeaveAppInner: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabName>("Leave Balance");
  const [activeSubTab, setActiveSubTab] = useState<SubTabName>("My Requests");

  const { showModal, openModal, closeModal } = useRequestLeaveModal();

  const isLeaveRequestsActive = activeTab === "Requests Status";

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
      navigate(tabRoutes["Leave Balance"], { replace: true });
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
    if (tab === "Requests Status") {
      navigate(subTabRoutes[activeSubTab]);
    } else {
      navigate(tabRoutes[tab]);
    }
  };

  const handleSubTabChange = (subTab: SubTabName) => {
    setActiveSubTab(subTab);
    navigate(subTabRoutes[subTab]);
  };

  return (
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

        <nav className="px-2 flex overflow-x-auto scrollbar-hidden">
          {(Object.keys(tabRoutes) as TabName[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`flex-1 py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "border-b-blue-500 text-blue-500"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

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

      {!showModal && activeTab === "Requests Status" && (
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

      {showModal && (
        <div className="fixed inset-0 z-[60] bg-white overflow-y-auto">
          <div className="max-w-md min-h-screen mx-auto">
            <RequestLeave onSuccess={closeModal} onCancel={closeModal} />
          </div>
        </div>
      )}

      <Toaster />
    </div>
  );
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
