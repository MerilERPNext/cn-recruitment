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

type TabName = "Expenses";

const tabRoutes: Record<TabName, string> = {
  Expenses: "/webapp/expenses-app/expenses-list",
};

const ExpensesApp: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const location = useLocation();
  const [showExpenseTypeSelection, setShowExpenseTypeSelection] = useState(false);
  const [currentExpenseForm, setCurrentExpenseForm] = useState<string | null>(null);

  useEffect(() => {
    if (location.pathname === "/webapp/expenses-app") {
      const savedTab = sessionStorage.getItem("activeTab") as TabName | null;
      const fallback = "Expenses";

      const redirectTab = savedTab && tabRoutes[savedTab] ? savedTab : fallback;
      navigate(tabRoutes[redirectTab], { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleAddNew = () => {
    if (isDesktop) {
      setShowExpenseTypeSelection(true);
    } else {
      navigate("/webapp/expenses-app/expenses-list/new-expense-type");
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

  const desktopLayout = (
    <DesktopLayoutWrapper title="Expenses">
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-8 relative">
          {showExpenseTypeSelection ? (
            <NewExpenseType
              onClose={handleClose}
              onSelectExpenseType={handleExpenseTypeSelect}
              isModal={true}
            />
          ) : (
            <>
              <Outlet />
              {/* Floating Add Button for Desktop */}
              <div className="absolute bottom-8 right-8">
                <button
                  onClick={handleAddNew}
                  className="py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors shadow-lg"
                >
                  + Add Expense
                </button>
              </div>
            </>
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
