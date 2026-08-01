import { useScreenSize } from "../../hooks/useScreenSize";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import HeaderBar from "../HeaderBar";
import TimesheetCreate from "./TimesheetCreate/TimesheetCreate";

const TimesheetApp = () => {
  const { isDesktop } = useScreenSize();

  // DesktopLayout
  if (isDesktop) {
    return (
      <DesktopLayoutWrapper title="Timesheets">
        <div className="flex flex-col h-full bg-app project-theme-wrapper">
          <TimesheetCreate />
        </div>
      </DesktopLayoutWrapper>
    );
  }

  // MobileLayout
  return (
    <div className="flex flex-col h-screen bg-gray-60 project-theme-wrapper">
      <div className="sticky top-0 z-50 bg-white border-b">
        <HeaderBar title="Timesheets" />
      </div>

      <main className="flex-1 overflow-y-auto px-4 pt-2">
        <TimesheetCreate />
      </main>
    </div>
  );
};

export default TimesheetApp;
