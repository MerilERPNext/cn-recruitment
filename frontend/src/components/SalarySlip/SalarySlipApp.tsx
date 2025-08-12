import React, { useEffect, useState, createContext, useContext } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import HeaderBar from "../HeaderBar";
import NavigationTabs, { Tab } from "../NavigationTab"; 

type TabName = 
 'Salary Slip' 
|'CTC Breakdown'
| 'Payroll Documents'

type ViewMode = 'annual' | 'monthly';

const tabRoutes: Record<TabName, string> = {
  "CTC Breakdown": "/webapp/salary-slip-app/ctc-salary-breakdown",
  "Salary Slip": "/webapp/salary-slip-app/salary-slip-list",
  "Payroll Documents": "/webapp/salary-slip-app/hr-payroll", 
};

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useViewMode = () => {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within ViewModeProvider');
  }
  return context;
};

const SalarySlipApp: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabName>("Salary Slip");
  const [viewMode, setViewMode] = useState<ViewMode>("annual");

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
      sessionStorage.setItem("activeTab", matchedTab);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === "/webapp/salary-slip-app") {
      navigate(tabRoutes["CTC Breakdown"], { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleTabChange = (tabKey: string) => {
    const tab = tabKey as TabName;
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

      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <HeaderBar title={activeTab} onBack={() => navigate("/webapp")} />
        <NavigationTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
        
        {/* Annual/Monthly Toggle - Only show on CTC Breakdown page */}
        {activeTab === "CTC Breakdown" && (
          <div className="px-4 py-4">
            <div className="flex bg-white border rounded-lg p-1 justify-center w-full">
              <button
                onClick={() => setViewMode('annual')}
                className={`px-6 py-2 w-[50%] rounded-lg font-medium transition-colors ${
                  viewMode === 'annual'
                    ? 'bg-black text-white'
                    : 'bg-white  text-gray-700 hover:bg-gray-100'
                }`}
              >
                Annual CTC
              </button>
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-6 py-2 w-[50%] rounded-lg font-medium transition-colors ${
                  viewMode === 'monthly'
                    ? 'bg-black text-white'
                    : 'bg-white  text-gray-700 hover:bg-gray-100'
                }`}
              >
                Monthly Salary
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="p-4 z-100 flex-grow overflow-y-auto">
        <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
          <Outlet />
        </ViewModeContext.Provider>
      </main>
    </div>
  );
};

export default SalarySlipApp;