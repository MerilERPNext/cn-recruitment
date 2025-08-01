import React, { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import HeaderBar from "../HeaderBar";

type TabName = "Expenses";

const tabRoutes: Record<TabName, string> = {
  Expenses: "/webapp/expenses-app/expenses-list",
};

const ExpensesApp: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/webapp/expenses-app") {
      const savedTab = sessionStorage.getItem("activeTab") as TabName | null;
      const fallback = "Expenses";

      const redirectTab = savedTab && tabRoutes[savedTab] ? savedTab : fallback;
      navigate(tabRoutes[redirectTab], { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleAddNew = () => {
    navigate("/webapp/expenses-app/expenses-list/new-expense-type");
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

      <HeaderBar title="Expenses" onBack={() => navigate(-1)} />

      {/* Tab Content */}
      <main className="p-4 z-100 flex-grow overflow-y-auto">
        <Outlet />
      </main>

      <div className="sticky mt-auto bottom-0 bg-white border-t shadow-lg py-4 px-4 w-full">
        <div className="max-w-4xl mx-auto flex space-x-4">
          <button
            onClick={handleAddNew}
            className="flex-1 py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          >
            + Add Expense
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpensesApp;
