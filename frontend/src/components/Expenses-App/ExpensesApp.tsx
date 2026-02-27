import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { useScreenSize } from "../../hooks/useScreenSize";
import { isActionEnabled } from "../../utils/uiPermission";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import HeaderBar from "../HeaderBar";
import NavigationTabs, { Tab } from "../NavigationTab";
import Button from "../shared/atoms/Button";
import ExpenseAdvanceForm from "./ExpenseAdvance/ExpenseAdvanceForm";
import ExpenseFormModal from "./ExpenseFormModal";

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
    null,
  );

  const { data: userUiPermission } = useGetUiPermission("Expenses");

  const canAddExpense = isActionEnabled(
    userUiPermission,
    "expense_claim_request",
    "Expense Claims",
  );

  const [activeTab, setActiveTab] = useState<TabName>("Expenses");

  const tabs: Tab[] = useMemo(() => {
    const allTabs: { key: TabName; label: string; permissionKey: string }[] = [
      { key: "Expenses", label: "Expenses", permissionKey: "Expense Claims" },
      { key: "Team", label: "Team", permissionKey: "Team Requests" },
      {
        key: "My Advances",
        label: "My Advances",
        permissionKey: "My Advances",
      },
      {
        key: "Team Advances",
        label: "Team Advances",
        permissionKey: "Team Advances",
      },
    ];

    if (!userUiPermission || userUiPermission.length === 0) {
      return allTabs.map(({ key, label }) => ({ key, label }));
    }

    const expensesPermission = userUiPermission.find(
      (perm) => perm.app_name === "Expenses",
    );

    if (!expensesPermission || !expensesPermission.enabled) {
      return [];
    }

    return allTabs
      .filter((tab) => {
        const pagePermission = expensesPermission.pages?.find(
          (page) => page.page_name === tab.permissionKey,
        );
        return pagePermission && pagePermission.enabled;
      })
      .map(({ key, label }) => ({ key, label }));
  }, [userUiPermission]);

  useEffect(() => {
    const matchedTab = (Object.keys(tabRoutes) as TabName[]).find((tab) =>
      location.pathname.startsWith(tabRoutes[tab]),
    );

    if (matchedTab) {
      setActiveTab(matchedTab);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === "/webapp/expenses-app" && tabs.length > 0) {
      const firstTab = tabs[0].key as TabName;
      navigate(tabRoutes[firstTab], { replace: true });
    }
  }, [location.pathname, navigate, tabs]);

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

  const isSharedExpenses = location.pathname.includes("shared-expenses");

  const mobileLayout = (
    <div className="flex flex-col min-h-screen">
      {!isSharedExpenses && (
        <div className="sticky top-0 z-50 bg-white border-b">
          <HeaderBar title={activeTab} onBack={() => navigate("/webapp")} />
          <NavigationTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </div>
      )}

      <main
        className={`z-100 flex-grow ${isSharedExpenses ? "h-full overflow-hidden" : "overflow-y-auto p-2"}`}
      >
        <Outlet />
      </main>
      {!isSharedExpenses && shouldShowActionButton() && (
        <div className="sticky mt-auto bottom-0 bg-white border-t shadow-lg py-4 px-4 w-full">
          <div className="max-w-4xl mx-auto flex space-x-4">
            <Button
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
    <Button size="lg" onClick={handleAddNew} className="hover:bg-blue-700">
      {activeTab === "Expenses" && "+ Add Expense"}
      {activeTab === "My Advances" && "+ Request Advances"}
    </Button>
  ) : null;

  const desktopLayout = (
    <DesktopLayoutWrapper title="Expenses" actionButton={actionButton}>
      <Outlet />
      {renderExpenseFormModal()}
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default ExpensesApp;
