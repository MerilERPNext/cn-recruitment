import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import EmployeeOnbordingList from "./component/OnboardingListView";
import { Outlet, useLocation } from "react-router-dom";

export default function Onboarding() {
  const location = useLocation();

  const isChildRoute = location.pathname.includes("onboarding-field-approval");

  return (
    <DesktopLayoutWrapper title="Employee Onboarding">
      <div className="flex w-full flex-col items-center justify-center">
        {!isChildRoute && <EmployeeOnbordingList />}
        <Outlet />
      </div>
    </DesktopLayoutWrapper>
  );
}