import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import HeaderBar from "../HeaderBar";

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
    if (activeTab === "Expenses")
      navigate("/webapp/expenses-app/expenses-list/new-expense-type");
  };

  useEffect(() => {
    if (location.pathname === "/webapp/expenses-app") {
      const savedTab = sessionStorage.getItem("activeTab") as TabName | null;
      const fallback = "Expenses";

      const redirectTab = savedTab && tabRoutes[savedTab] ? savedTab : fallback;
      navigate(tabRoutes[redirectTab], { replace: true });
    }
  }, [location.pathname, navigate]);

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

      <HeaderBar title="Expenses" onBack={() => navigate(-1)} />

      {/* Tab Content */}
      <main className="p-4 z-100 flex-grow overflow-y-auto">
        <Outlet />
      </main>

      {activeTab === "Expenses" && (
        <button
          onClick={handleAddNew}
          className="bg-black text-white w-16 h-16 rounded-full hover:bg-gray-800 fixed bottom-20 right-4 z-50 flex items-center justify-center text-xl sm:text-3xl sm:font-semibold"
        >
          +
        </button>
      )}
    </div>
  );
};

export default ExpensesApp;
