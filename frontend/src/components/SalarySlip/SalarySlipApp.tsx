import React, { useEffect, useState, createContext } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import HeaderBar from "../HeaderBar";
import NavigationTabs, { Tab } from "../NavigationTab";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize";
import CreateLoanDialog from "./Loan/component/CreateLoanDailog";
import Button from "../shared/atoms/Button";

type TabName =
  | "Annual CTC"
  | "Salary Slip"
  | "Tax Declaration"
  | "IT Declaration"
  | "My Loan Requests"
  | "Team Loan Requests"
  | "My Advances"
  | "Team Advances"
  | "Pay Package"
  | "Extra Payments"
  | "Payroll Documents";

type ViewMode = "annual"; // ❌ removed monthly

const tabRoutes: Record<TabName, string> = {
  "Annual CTC": "/webapp/salary-slip-app/ctc-salary-breakdown",
  "Salary Slip": "/webapp/salary-slip-app/salary-slip-list",
  "Tax Declaration": "/webapp/salary-slip-app/income-tax-sheet",
  "IT Declaration": "/webapp/salary-slip-app/it-declaration-form",
  "My Loan Requests": "/webapp/salary-slip-app/my-loan-requests",
  "Team Loan Requests": "/webapp/salary-slip-app/team-loan-requests",
  "My Advances": "/webapp/salary-slip-app/advances-list",
  "Team Advances": "/webapp/salary-slip-app/team-advances-list",
  "Pay Package": "/webapp/salary-slip-app/benefits-list",
  "Extra Payments": "/webapp/salary-slip-app/extra-payment",
  "Payroll Documents": "/webapp/salary-slip-app/hr-payroll",
};

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(
  undefined
);

const SalarySlipApp: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabName>("Annual CTC");

  // Only ANNUAL mode now
  const [viewMode] = useState<ViewMode>("annual");

  // Loan dialog state
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
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === "/webapp/salary-slip-app") {
      navigate(tabRoutes["Annual CTC"], { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleTabChange = (tabKey: string) => {
    const tab = tabKey as TabName;
    setActiveTab(tab);
    sessionStorage.setItem("activeTab", tab);
    navigate(tabRoutes[tab]);
  };

  // Mobile layout
  const mobileLayout = (
    <ViewModeContext.Provider value={{ viewMode, setViewMode: () => { } }}>
      <div className="flex flex-col min-h-screen bg-white">
        <style>{`
          :root {
            --primary-color: #0c7ff2;
            --secondary-color: #60758a;
          }
        `}</style>

        <header className="sticky top-0 z-50 bg-white shadow-sm">
          <HeaderBar title={activeTab} onBack={() => navigate("/webapp")} />

          <NavigationTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </header>

        <main className="p-4 z-100 flex-grow overflow-y-auto">
          <Outlet />
        </main>

        {activeTab === "My Loan Requests" && (
          <footer className="fixed bottom-0 left-0 w-full border-t bg-white shadow-md p-2">
            <Button
              fullWidth
              size="lg"
              bgColor="blue-600"
              className="hover:bg-blue-700"
              onClick={() => setIsLoanDialogOpen(true)}
            >
              + Create Loan
            </Button>
          </footer>
        )}

        <CreateLoanDialog
          isOpen={isLoanDialogOpen}
          onClose={() => setIsLoanDialogOpen(false)}
        />
      </div>
    </ViewModeContext.Provider>
  );

  // Desktop layout
  const desktopLayout = (
    <ViewModeContext.Provider value={{ viewMode, setViewMode: () => { } }}>
      <DesktopLayoutWrapper title="Compensation">
        <div className="flex flex-col h-full bg-gray-50">
          <div className="flex-1 overflow-y-auto px-8 py-4">
            <Outlet />
          </div>
        </div>
      </DesktopLayoutWrapper>
    </ViewModeContext.Provider>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default SalarySlipApp;