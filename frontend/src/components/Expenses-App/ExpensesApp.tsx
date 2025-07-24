import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

type TabName = "Expenses";

const tabRoutes: Record<TabName, string> = {
  Expenses: "/webapp/expenses-app/expenses-list",
};

const ExpensesApp: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabName>("Expenses");

  // Detect tab based on current route
  useEffect(() => {
    const matchedTab = (Object.keys(tabRoutes) as TabName[]).find((tab) =>
      location.pathname.startsWith(tabRoutes[tab])
    );

    if (matchedTab) {
      setActiveTab(matchedTab);
      sessionStorage.setItem("activeTab", matchedTab);
    }
  }, [location.pathname]);

  const handleAddNew = () => {
    if (activeTab === 'Expenses') navigate('/webapp/expenses-app/expenses-list/new-expense-type');
  }

  useEffect(() => {
    if (location.pathname === "/webapp/expenses-app") {
      const savedTab = sessionStorage.getItem("activeTab") as TabName | null;
      const fallback = "Expenses";

      const redirectTab = savedTab && tabRoutes[savedTab] ? savedTab : fallback;
      navigate(tabRoutes[redirectTab], { replace: true });
    }
  }, [location.pathname, navigate]);

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
              onClick={() => handleTabChange(tab)}
              className={`px-4 py-3 border-b-2 border-t-0 border-l-0 border-r-0 bg-transparent text-sm font-medium rounded-none outline-none focus:outline-none focus:ring-0 ${
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

      {/* Tab Content */}
      <main className="p-4 z-100 flex-grow overflow-y-auto">
        <Outlet />
      </main>

      {(activeTab === 'Expenses') && (
        <button
          onClick={handleAddNew}
          className="bg-[var(--primary-color)] text-white px-4 py-2 rounded-full hover:bg-blue-700 fixed bottom-20 right-4 z-50"
        >
          +
        </button>
      )}
    </div>
  );
};

export default ExpensesApp;
