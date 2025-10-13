import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import HeaderBar from "../HeaderBar";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize";
import NewExpenseType from "./NewExpenseType";
import ExpenseFormModal from "./ExpenseFormModal";
import GeneralExpenseClaimModal from "./GeneralExpenseClaimModal";
import MileageExpenseClaimModal from "./MileageExpenseClaimModal";
import DailyAllowanceClaimModal from "./DailyAllowanceClaimModal";
import NavigationTabs, { Tab } from "../NavigationTab";
import ExpenseAdvanceForm from "./ExpenseAdvanceForm";

type TabName = "Expenses" | "Advances";

const tabRoutes: Record<TabName, string> = {
  Expenses: "/webapp/expenses-app/expenses-list",
  Advances: "/webapp/expenses-app/advance-expense-list",
};

const ExpensesApp: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const location = useLocation();
  const [showExpenseTypeSelection, setShowExpenseTypeSelection] =
    useState(false);
  const [currentExpenseForm, setCurrentExpenseForm] = useState<string | null>(
    null
  );

  const [activeTab, setActiveTab] = useState<TabName>("Expenses");
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
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === "/webapp/expenses-app") {
      const fallback = "Expenses";
      setActiveTab(fallback);
      navigate(tabRoutes[fallback], { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleTabChange = (tabKey: string) => {
    const tab = tabKey as TabName;
    setActiveTab(tab);
    navigate(tabRoutes[tab]);
  };

  const handleAddNew = () => {
    if (activeTab === "Expenses") {
      if (isDesktop) {
        setShowExpenseTypeSelection(true);
      } else {
        navigate("/webapp/expenses-app/expenses-list/new-expense-type");
      }
    } else if (activeTab === "Advances") {
      navigate("/webapp/expenses-app/new-expense-advance");
    }
  };

  const handleClose = () => {
    setShowExpenseTypeSelection(false);
  };

  const handleExpenseTypeSelect = (type: string) => {
    setShowExpenseTypeSelection(false);
    if (isDesktop) {
      // Show form in modal for desktop
      setCurrentExpenseForm(type);
    } else {
      // Navigate to the appropriate expense claim form for mobile
      if (type === "General Expense") {
        navigate("/webapp/expenses-app/general-expense-claim");
      } else if (type === "Mileage Expense") {
        navigate("/webapp/expenses-app/mileage-expense-claim");
      } else if (type === "Daily Allowance") {
        navigate("/webapp/expenses-app/daily-allowance-claim");
      }
    }
  };

  const handleCloseExpenseForm = () => {
    setCurrentExpenseForm(null);
  };

  const renderExpenseFormModal = () => {
    if (!currentExpenseForm) return null;

    let title = "";
    let FormComponent = null;

    switch (currentExpenseForm) {
      case "General Expense":
        title = "General Expense Claim";
        FormComponent = GeneralExpenseClaimModal;
        break;
      case "Mileage Expense":
        title = "Mileage Expense Claim";
        FormComponent = MileageExpenseClaimModal;
        break;
      case "Daily Allowance":
        title = "Daily Allowance Claim";
        FormComponent = DailyAllowanceClaimModal;
        break;
      case "Advance":
        title = "New Expense Advance";
        FormComponent = ExpenseAdvanceForm;
        break;
      default:
        return null;
    }

    return (
      <ExpenseFormModal
        isOpen={!!currentExpenseForm}
        onClose={handleCloseExpenseForm}
        title={title}
      >
        <FormComponent onClose={handleCloseExpenseForm} />
      </ExpenseFormModal>
    );
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

      <HeaderBar title={activeTab} onBack={() => navigate("/webapp")} />
      <NavigationTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

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
            {activeTab === "Expenses" ? "+ Add Expense" : "+ Add Advance"}
          </button>
        </div>
      </div>
    </div>
  );

  // Create the action button for desktop - positioned bottom-right by DesktopLayoutWrapper
  const actionButton = !showExpenseTypeSelection ? (
    <button
      onClick={handleAddNew}
      className="py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors shadow-lg"
    >
      {activeTab === "Expenses" ? "+ Add Expense" : "+ Add Advance"}
    </button>
  ) : null;

  const desktopLayout = (
    <DesktopLayoutWrapper title="Expenses" actionButton={actionButton}>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-8">
          {showExpenseTypeSelection ? (
            <NewExpenseType
              onClose={handleClose}
              onSelectExpenseType={handleExpenseTypeSelect}
              isModal={true}
            />
          ) : (
            <Outlet />
          )}

          {/* Render expense form modal for desktop */}
          {renderExpenseFormModal()}
        </div>
      </div>
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default ExpensesApp;
