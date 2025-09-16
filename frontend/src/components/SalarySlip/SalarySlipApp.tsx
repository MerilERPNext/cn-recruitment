import React, { useEffect, useState, createContext, useContext } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import HeaderBar from "../HeaderBar";
import NavigationTabs, { Tab } from "../NavigationTab";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize"; 
import CreateLoanDialog from "./Loan/component/CreateLoanDailog";

type TabName = 
 'Salary Slip' 
|'CTC Breakdown'
| 'Loan'
| 'Advances'
| 'Payroll Documents'

type ViewMode = 'annual' | 'monthly';

const tabRoutes: Record<TabName, string> = {
  "CTC Breakdown": "/webapp/salary-slip-app/ctc-salary-breakdown",
  "Salary Slip": "/webapp/salary-slip-app/salary-slip-list",
  "Loan": "/webapp/salary-slip-app/loan",
  "Advances": "/webapp/salary-slip-app/advances-list",
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
  const [activeTab, setActiveTab] = useState<TabName>("CTC Breakdown");
  const [viewMode, setViewMode] = useState<ViewMode>("annual");

  // 🔹 Added state for CreateLoanDialog
  const [isLoanDialogOpen, setIsLoanDialogOpen] = useState(false);

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

    // Handle view mode from URL query parameters (for sidebar navigation)
    const urlParams = new URLSearchParams(location.search);
    const viewParam = urlParams.get('view') as ViewMode;
    if (viewParam === 'annual' || viewParam === 'monthly') {
      setViewMode(viewParam);
    }
  }, [location.pathname, location.search]);

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
                  {/* ✅ Annual / Monthly Toggle */}
                  {activeTab === "CTC Breakdown" && (
        <div className="flex justify-center gap-3 px-4 py-2 bg-white border-b">
          <button
            className={`flex-1 py-2 rounded-lg font-medium transition ${
              viewMode === "annual"
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700"
            }`}
            onClick={() => setViewMode("annual")}
          >
            Annual CTC
          </button>
          <button
            className={`flex-1 py-2 rounded-lg font-medium transition ${
              viewMode === "monthly"
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700"
            }`}
            onClick={() => setViewMode("monthly")}
          >
            Monthly CTC
          </button>
        </div>
      )}
      </header>

      <main className="p-4 z-100 flex-grow overflow-y-auto">
        <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
          <Outlet />
        </ViewModeContext.Provider>
      </main>

      {/* ✅ Loan Footer Button */}
      {activeTab === "Loan" && (
        <footer className="fixed bottom-0 left-0 w-full border-t bg-white shadow-md p-2">
          <button
            className="w-full bg-black text-white rounded-lg p-3 hover:bg-gray-900 transition-colors"
            onClick={() => setIsLoanDialogOpen(true)} // 🔹 Open dialog
            aria-label="Create Loan"
          >
            + Create Loan
          </button>
        </footer>
      )}

      {/* ✅ Loan Dialog */}
      <CreateLoanDialog
  isOpen={isLoanDialogOpen}
  onClose={() => {
    try {
      setIsLoanDialogOpen(false);
    } catch (error) {
      console.error("Error closing loan dialog:", error);
    }
  }}
/>
    </div>
  );

  const desktopLayout = (
    <DesktopLayoutWrapper title="Compensation">
      <div className="flex flex-col h-full bg-gray-50 ">
        <div className="flex-1 overflow-y-auto px-8 py-4">
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
