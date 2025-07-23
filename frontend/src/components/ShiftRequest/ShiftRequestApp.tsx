import React, { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

type TabName =
  | "My Shift Assignment"
  | "Team Shift"
  | "My Shift Requests"
  | "Shift Change Request";

const tabRoutes: Record<TabName, string> = {
  "My Shift Assignment": "/webapp/shift-request/my-shift-assignment",
  "Team Shift": "/webapp/shift-request/team-shift",
  "My Shift Requests": "/webapp/shift-request/shift-list",
  "Shift Change Request": "/webapp/shift-request/shift-change-request",
};

const ShiftRequestApp: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabName>("My Shift Assignment");

  // Refs for each tab
  const tabRefs = useRef<Record<TabName, HTMLButtonElement | null>>({
    "My Shift Assignment": null,
    "Team Shift": null,
    "My Shift Requests": null,
    "Shift Change Request": null,
  });

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
    if (location.pathname === "/webapp/shift-request") {
      const savedTab = sessionStorage.getItem("activeTab") as TabName | null;
      const fallback = "My Shift Assignment";

      const redirectTab = savedTab && tabRoutes[savedTab] ? savedTab : fallback;
      navigate(tabRoutes[redirectTab], { replace: true });
    }
  }, [location.pathname, navigate]);

  // Scroll active tab into view when it changes
  useEffect(() => {
    const activeRef = tabRefs.current[activeTab];
    if (activeRef) {
      activeRef.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeTab]);

  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
    sessionStorage.setItem("activeTab", tab);
    navigate(tabRoutes[tab]);
  };

  return (
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

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="flex items-center justify-center p-2">
          <h1 className="text-xl font-semibold text-slate-900">{activeTab}</h1>
        </div>

        {/* Tabs */}
        <nav className="px-2 flex overflow-x-auto scrollbar-hidden">
          {(Object.keys(tabRoutes) as TabName[]).map((tab) => (
            <button
              key={tab}
              ref={(el) => {
                tabRefs.current[tab] = el;
              }}
              onClick={() => handleTabChange(tab)}
              className={`inline-block whitespace-nowrap px-4 py-3 border-b-2 border-t-0 border-l-0 border-r-0 bg-transparent text-sm font-medium rounded-none outline-none focus:outline-none focus:ring-0 ${
                activeTab === tab
                  ? "border-b-[3px] border-b-[var(--primary-color)] text-[var(--primary-color)]"
                  : "border-b-transparent text-[var(--text-secondary)]"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </header>

      <main className="p-4 z-100 flex-grow overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default ShiftRequestApp;
