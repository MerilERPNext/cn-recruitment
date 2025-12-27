import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import HeaderBar from "../HeaderBar";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize";
import ExpenseFormModal from "./ExpenseFormModal";
import NavigationTabs, { Tab } from "../NavigationTab";
import ExpenseAdvanceForm from "./ExpenseAdvance/ExpenseAdvanceForm";
import Button from "../shared/atoms/Button";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { isActionEnabled } from "../../utils/uiPermission";

type TabName = "Expenses" | "Team" | "My Advances" | "Team Advances";

const tabRoutes: Record<TabName, string> = {
  Expenses: "/webapp/expenses-app/expenses-list",
  Team: "/webapp/expenses-app/team-requests",
  "My Advances": "/webapp/expenses-app/my-advance-expense",
  "Team Advances": "/webapp/expenses-app/team-advance-expense",
};

const ExpensesApp: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentExpenseForm, setCurrentExpenseForm] = useState<string | null>(
    null
  );

  const { data: userUiPermission } = useGetUiPermission("Expenses");

  const canAddExpense = isActionEnabled(
    userUiPermission,
    "expense_claim_request",
    "Expense Claims"
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

  const isFormActive = location.pathname === "/webapp/expenses-app/add-expense";
  const isTeamRequests =
    location.pathname === "/webapp/expenses-app/team-requests";
  const isTeamRequestsAll =
    location.pathname === "/webapp/expenses-app/team-requests/all";

  const shouldShowActionButton = () => {
    if (!canAddExpense) return false;
    if (isFormActive || isTeamRequests || isTeamRequestsAll) return false;
    return activeTab === "Expenses" || activeTab === "My Advances";
  };

  const handleAddNew = () => {
    if (activeTab === "Expenses") {
      navigate("/webapp/expenses-app/add-expense");
    } else if (activeTab === "My Advances") {
      navigate("/webapp/expenses-app/new-expense-advance");
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

      <div className="sticky top-0 z-50 bg-white border-b">
        <HeaderBar title={activeTab} onBack={() => navigate("/webapp")} />
        <NavigationTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>

      <main className="p-4 z-100 flex-grow overflow-y-auto">
        <Outlet />
      </main>
      {shouldShowActionButton() && (
        <div className="sticky mt-auto bottom-0 bg-white border-t shadow-lg py-4 px-4 w-full">
          <div className="max-w-4xl mx-auto flex space-x-4">
            <Button
              bgColor="blue-600"
              size="lg"
              onClick={handleAddNew}
              className="hover:bg-blue-700 flex-1"
            >
              {activeTab === "Expenses" && "+ Add Expense"}
              {activeTab === "My Advances" && "+ Request Advances"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const actionButton = shouldShowActionButton() ? (
    <Button
      bgColor="blue-600"
      size="lg"
      onClick={handleAddNew}
      className="hover:bg-blue-700"
    >
      {activeTab === "Expenses" && "+ Add Expense"}
      {activeTab === "My Advances" && "+ Request Advances"}
    </Button>
  ) : null;

  const desktopLayout = (
    <DesktopLayoutWrapper title="Expenses" actionButton={actionButton}>
      <div className="flex flex-col h-full bg-white">
        <div className="flex-1 overflow-y-auto">
          <Outlet />
          {renderExpenseFormModal()}
        </div>
      </div>
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default ExpensesApp;
