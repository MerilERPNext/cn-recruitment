import React, { createContext, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import HeaderBar from "../HeaderBar";
import NavigationTabs, { Tab } from "../NavigationTab";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize";
import Button from "../shared/atoms/Button";

type TabName =
  | "Pay Package"
  | "Annual CTC"
  | "Invoice Slip"
  | "Salary Slip"
  | "Tax Declaration"
  | "IT Declaration"
  | "My Loan Requests"
  | "Team Loan Requests"
  | "My Advances"
  | "Team Advances"
  | "Extra Payments"
  | "Perquisite"
  | "Payroll Documents";

type ViewMode = "annual"; // ❌ removed monthly

const tabRoutes: Record<TabName, string> = {
  "Pay Package": "/webapp/salary-slip-app/pay-package",
  "Annual CTC": "/webapp/salary-slip-app/ctc-salary-breakdown",
  "Invoice Slip": "/webapp/salary-slip-app/invoice-page",
  "Salary Slip": "/webapp/salary-slip-app/salary-slip-list",
  "Tax Declaration": "/webapp/salary-slip-app/income-tax-sheet",
  "IT Declaration": "/webapp/salary-slip-app/it-declaration-form",
  "My Loan Requests": "/webapp/salary-slip-app/my-loan-requests",
  "Team Loan Requests": "/webapp/salary-slip-app/team-loan-requests",
  "My Advances": "/webapp/salary-slip-app/advances-list",
  "Team Advances": "/webapp/salary-slip-app/team-advances-list",
  "Perquisite": "/webapp/salary-slip-app/perquisite-list", 
  "Extra Payments": "/webapp/salary-slip-app/extra-payment",
  "Payroll Documents": "/webapp/salary-slip-app/hr-payroll",
  
};

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(
  undefined,
);

const SalarySlipApp: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabName>("Annual CTC");

  // Only ANNUAL mode now
  const [viewMode] = useState<ViewMode>("annual");

  // Action button config from sub-pages
  const [actionButtonConfig, setActionButtonConfig] = useState<{
    label: string;
    onClick: () => void;
    disabled?: boolean;
  } | null>(null);

  // Track if a modal is open (to hide the floating button)
  const [isModalOpen, setIsModalOpen] = useState(false);

  const tabs: Tab[] = (Object.keys(tabRoutes) as TabName[]).map((key) => ({
    key,
    label: key,
  }));

  useEffect(() => {
    const matchedTab = (Object.keys(tabRoutes) as TabName[]).find((tab) =>
      location.pathname.startsWith(tabRoutes[tab]),
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

        <main className={`p-2 z-100 flex-grow overflow-y-auto ${actionButtonConfig ? 'pb-20' : ''}`}>
          <Outlet context={{ setActionButtonConfig, setIsModalOpen }} />
        </main>

        {actionButtonConfig && !isModalOpen && (
          <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-lg z-50 p-2">
            <Button
              fullWidth
              size="lg"
              bgColor="primary"
              onClick={actionButtonConfig.onClick}
              disabled={actionButtonConfig.disabled}
            >
              {actionButtonConfig.label}
            </Button>
          </div>
        )}
      </div>
    </ViewModeContext.Provider>
  );

  // Desktop layout
  const actionButton = actionButtonConfig ? (
    <Button
      size="lg"
      bgColor="primary"
      onClick={actionButtonConfig.onClick}
      disabled={actionButtonConfig.disabled}
    >
      {actionButtonConfig.label}
    </Button>
  ) : null;

  const desktopLayout = (
    <DesktopLayoutWrapper title="Compensation" actionButton={actionButton}>
      <Outlet context={{ setActionButtonConfig, setIsModalOpen }} />
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default SalarySlipApp;
