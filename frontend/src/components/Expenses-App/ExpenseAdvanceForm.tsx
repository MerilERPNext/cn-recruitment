import { useScreenSize } from "../../hooks/useScreenSize";
import HeaderBar from "../HeaderBar";

const ExpenseAdvanceForm = () => {
  const { isDesktop } = useScreenSize();
  const desktopLayout = (
    <div>
      <div>Desktop Layout</div>
    </div>
  );
  const mobileLayout = (
    <div>
      <HeaderBar
        title="New Expense Advance"
        onBack={() => window.history.back()}
      />
      Mobile Layout
    </div>
  );
  return isDesktop ? desktopLayout : mobileLayout;
};

export default ExpenseAdvanceForm;
