import React, { useEffect, useState, createContext, useContext } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import HeaderBar from "../HeaderBar";
import NavigationTabs, { Tab } from "../NavigationTab";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize"; 

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
  const { isDesktop } = useScreenSize();
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

  const mobileLayout = (
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

        {activeTab === "CTC Breakdown" && (
          <div className="px-4 py-2">
            <div className="flex bg-white border rounded-lg p-1 justify-center w-full">
              <button
                onClick={() => setViewMode('annual')}
                className={`px-4 py-2 w-[50%] rounded-lg font-medium transition-colors ${
                  viewMode === 'annual'
                    ? 'bg-black text-white'
                    : 'bg-white  text-gray-700 hover:bg-gray-100'
                }`}
              >
                Annual CTC
              </button>
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-4 py-2 w-[50%] rounded-lg font-medium transition-colors ${
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

  const desktopLayout = (
    <DesktopLayoutWrapper title="Compensation">
      <div className="flex flex-col h-full">
        <div className="bg-gray-100 border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`relative px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                  activeTab === tab.key
                    ? 'bg-black text-white shadow-lg'
                    : ' text-gray-700  hover:text-gray-900 shadow-md hover:shadow-lg '
                }`}
              >
                <span className="relative z-10">{tab.label}</span>
                {activeTab === tab.key && (
                  <div className="absolute inset-0 bg-blue-600 rounded-xl opacity-10"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "CTC Breakdown" && (
          <div className="px-6 py-3 bg-white border-b border-gray-200">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 font-medium">View Mode:</span>
                <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                  <button
                    onClick={() => setViewMode('annual')}
                    className={`px-6 py-1 rounded-lg font-semibold transition-all duration-200 ${
                      viewMode === 'annual'
                        ? 'bg-black text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Annual CTC
                  </button>
                  <button
                    onClick={() => setViewMode('monthly')}
                    className={`px-6 py-1 rounded-lg font-semibold transition-all duration-200 ${
                      viewMode === 'monthly'
                        ? 'bg-black text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Monthly Salary
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Current Period</span>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Updated</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-8">
          <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
            <Outlet />
          </ViewModeContext.Provider>
        </div>
      </div>
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default SalarySlipApp;