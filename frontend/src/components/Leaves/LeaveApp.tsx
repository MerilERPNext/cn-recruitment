import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import RequestLeave from "./RequestLeave";

type TabName = "Leave Balance" | "Leave Requests" | "Holidays";
type SubTabName = "My Requests" | "Team Requests";

const tabRoutes: Record<TabName, string> = {
  "Leave Requests": "/webapp/leave-app/leaves/leave-requests",
  "Leave Balance": "/webapp/leave-app/leaves/leave-balance",
  "Holidays": "/webapp/leave-app/leaves/holidays",
};

const subTabRoutes: Record<SubTabName, string> = {
  "My Requests": "/webapp/leave-app/leaves/leave-requests/my",
  "Team Requests": "/webapp/leave-app/leaves/leave-requests/team",
};

const LeaveApp: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabName>("Leave Requests");
  const [activeSubTab, setActiveSubTab] = useState<SubTabName>("My Requests");
  const [showRequestLeave, setShowRequestLeave] = useState(false);

  const isLeaveRequestsActive = activeTab === "Leave Requests";

  useEffect(() => {
    const matchedTab = (Object.keys(tabRoutes) as TabName[]).find((tab) =>
      location.pathname.startsWith(tabRoutes[tab])
    );

    if (matchedTab) {
      setActiveTab(matchedTab);
    }

    // Handle sub-tabs for Leave Requests
    if (location.pathname.includes("/leave-requests/")) {
      const matchedSubTab = (Object.keys(subTabRoutes) as SubTabName[]).find((subTab) =>
        location.pathname.startsWith(subTabRoutes[subTab])
      );
      if (matchedSubTab) {
        setActiveSubTab(matchedSubTab);
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === "/webapp/leave-app") {
      navigate(tabRoutes["Leave Requests"], { replace: true });
    }
    if (location.pathname === "/webapp/leave-app/leaves/leave-requests") {
      navigate(subTabRoutes["My Requests"], { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
    if (tab === "Leave Requests") {
      navigate(subTabRoutes[activeSubTab]);
    } else {
      navigate(tabRoutes[tab]);
    }
  };

  const handleSubTabChange = (subTab: SubTabName) => {
    setActiveSubTab(subTab);
    navigate(subTabRoutes[subTab]);
  };

  const handleBackNavigation = () => {
    navigate("/webapp");
  };

  const handleRequestLeaveClick = () => {
    setShowRequestLeave(true);
  };

  const handleCloseRequestLeave = () => {
    setShowRequestLeave(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="flex items-center p-4">
          <button
            onClick={handleBackNavigation}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-slate-900 absolute left-1/2 transform -translate-x-1/2">
            Leaves
          </h1>
        </div>

        {/* Main Tabs */}
        <nav className="px-4 flex border-b border-gray-200">
          {(Object.keys(tabRoutes) as TabName[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`flex-1 px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "border-black text-black"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* Sub Tabs for Leave Requests */}
        {isLeaveRequestsActive && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
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

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full max-w-md mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Footer - Request Leave Button */}
      <footer className="bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-md mx-auto p-4">
          <button
            onClick={handleRequestLeaveClick}
            className="w-full bg-black hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Request Leave
          </button>
        </div>
      </footer>

      {/* Request Leave Modal */}
      {showRequestLeave && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="flex items-center p-4">
              <button
                onClick={handleCloseRequestLeave}
                className="p-2 -ml-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-slate-900 absolute left-1/2 transform -translate-x-1/2">
                Request Leave
              </h1>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="max-w-md mx-auto">
              <RequestLeave onSuccess={handleCloseRequestLeave} />
            </div>
          </main>
        </div>
      )}
    </div>
  );
};

export default LeaveApp;
