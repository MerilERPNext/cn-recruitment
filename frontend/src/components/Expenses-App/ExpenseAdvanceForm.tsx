import { useScreenSize } from "../../hooks/useScreenSize";
import HeaderBar from "../HeaderBar";
import { useNavigate } from "react-router-dom";
import React from "react";

const ExpenseAdvanceForm: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();

  const DesktopLayout = () => (
    <div>
      <div>Desktop Layout</div>
    </div>
  );

  const MobileLayout = () => (
    <div>
      <HeaderBar
        title="New Expense Advance"
        onBack={() => navigate("/webapp/expenses-app/advance-expense-list")}
      />
      Mobile Layout
    </div>
  );

  return isDesktop ? <DesktopLayout /> : <MobileLayout />;
};

export default ExpenseAdvanceForm;
