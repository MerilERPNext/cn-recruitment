import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import RequestLeave from "./RequestLeave";

type TabName = "Leave Balance" | "Leave Requests" | "Holidays";

const tabRoutes: Record<TabName, string> = {
  "Leave Requests": "/webapp/leave-app/leaves/leave-requests",
  "Leave Balance": "/webapp/leave-app/leaves/leave-balance",
  "Holidays": "/webapp/leave-app/leaves/holidays",
};

const LeaveApp: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabName>("Leave Requests");
  const [showRequestLeave, setShowRequestLeave] = useState(false);


  useEffect(() => {
    const matchedTab = (Object.keys(tabRoutes) as TabName[]).find((tab) =>
      location.pathname.startsWith(tabRoutes[tab])
    );

    if (matchedTab) {
      setActiveTab(matchedTab);
      sessionStorage.setItem("activeTab", matchedTab);
    }
  }, [location.pathname]);


  useEffect(() => {
    if (location.pathname === "/webapp/leave-app") {
      navigate(tabRoutes["Leave Requests"], { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
    sessionStorage.setItem("activeTab", tab);
    navigate(tabRoutes[tab]);
  };

  const handleRequestLeaveClick = () => {
    setShowRequestLeave(true);
  };

  const handleCloseRequestLeave = () => {
    setShowRequestLeave(false);
  };

  const handleBackNavigation = () => {

    navigate("/webapp");
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="flex items-center p-2 relative">
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
          <h1 className="text-xl font-semibold text-slate-900 absolute left-1/2 transform -translate-x-1/2">{activeTab}</h1>
        </div>

        <nav className="px-2 flex">
          {(Object.keys(tabRoutes) as TabName[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`flex-1 px-4 py-3 border-b-2 text-sm font-medium whitespace-nowrap ${activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500"
                }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-grow">
        <Outlet />
      </main>


      <footer className="sticky bottom-0 z-50 bg-white border-t border-gray-200 shadow-lg">
        <button
          onClick={handleRequestLeaveClick}
          className="w-full border-t hover:bg-blue-700 text-black font-medium py-3 px-4 transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
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
      </footer>


      {showRequestLeave && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col">

          <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200">
            <div className="flex items-center p-4">
              <button
                onClick={handleCloseRequestLeave}
                className="mr-3 p-2 -ml-2 text-gray-600 hover:text-gray-800 transition-colors"
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
              <h1 className="text-xl font-semibold text-slate-900">Request Leave</h1>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <RequestLeave onSuccess={handleCloseRequestLeave} />
          </main>
        </div>
      )}
    </div>
  );
};

export default LeaveApp;
