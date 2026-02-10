import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import RequestLeave from "./RequestLeave";
import RequestLeaveModal from "./RequestLeaveModal";
import HeaderBar from "../HeaderBar";
import { LeaveRequestRefreshProvider } from "./LeaveRequestRefreshContext";
import {
  useRequestLeaveModal,
  RequestLeaveModalProvider,
} from "./RequestLeaveModalContext";
import NavigationTabs, { Tab } from "../NavigationTab";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize";
import FormDialog from "../shared/FormDialog";
import Button from "../shared/atoms/Button";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { isActionEnabled } from "../../utils/uiPermission";

type TabName =
  | "leave-balance"
  | "holidays"
  | "my-requests"
  | "team-requests"
  | "compensatory";

const tabRoutes: Record<TabName, string> = {
  "leave-balance": "/webapp/leave-app/leaves/leave-balance",
  holidays: "/webapp/leave-app/leaves/holidays",
  "my-requests": "/webapp/leave-app/leaves/leave-requests/my",
  "team-requests": "/webapp/leave-app/leaves/leave-requests/team",
  compensatory: "/webapp/leave-app/compensatory-request",
};

const LeaveAppInner: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabName>("leave-balance");

  const { data: userUiPermission } = useGetUiPermission("Leaves and Holidays");
  const canRequestLeave = isActionEnabled(
    userUiPermission,
    "request_leave",
    "My Requests",
  );

  const tabs: Tab[] = useMemo(
    () => [
      { key: "leave-balance", label: "Leave Balance" },
      { key: "holidays", label: "Holidays" },
      { key: "my-requests", label: "My Requests" },
      { key: "team-requests", label: "Team Requests" },
      {
        key: "compensatory",
        label: "Compensatory",
      },
    ],
    [],
  );

  const { showModal, openModal, closeModal } = useRequestLeaveModal();

  const isHolidaysActive = activeTab === "holidays";

  const isViewAllActive = location.pathname.includes("/actioned");

  useEffect(() => {
    const matchedTab = (Object.keys(tabRoutes) as TabName[]).find((tab) =>
      location.pathname.startsWith(tabRoutes[tab]),
    );

    if (matchedTab) {
      setActiveTab(matchedTab);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === "/webapp/leave-app") {
      navigate(tabRoutes["leave-balance"], { replace: true });
    }
    if (location.pathname === "/webapp/leave-app/leaves/leave-requests") {
      navigate(tabRoutes["my-requests"], { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [showModal]);

  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
    navigate(tabRoutes[tab]);
  };

  const mobileLayout = (
    <div className="flex flex-col min-h-screen bg-white">
      <style>{`
         .scrollbar-hidden {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .scrollbar-hidden::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <HeaderBar
          title={"Leaves & Holidays"}
          onBack={() => navigate("/webapp")}
        />
        <NavigationTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tab) => handleTabChange(tab as TabName)}
        />
      </header>

      <main className="z-100 flex-grow overflow-y-auto p-1">
        <Outlet />
      </main>

      {!showModal &&
        activeTab !== "holidays" &&
        !isViewAllActive &&
        canRequestLeave && (
          <div className="sticky bottom-0 bg-white rounded-md shadow-lg py-2 px-4 w-full z-50">
            <div className="max-w-4xl mx-auto flex">
              <button
                onClick={() => openModal()}
                className="flex-1 py-3 rounded-lg bg-primary text-white font-medium hover:bg-blue-700 transition-colors"
              >
                + Request Leave
              </button>
            </div>
          </div>
        )}

      <FormDialog
        isOpen={showModal}
        onClose={closeModal}
        title="Request Leave"
        size="lg"
      >
        <RequestLeave onSuccess={closeModal} onCancel={closeModal} />
      </FormDialog>
    </div>
  );

  const actionButton =
    !isHolidaysActive && canRequestLeave ? (
      <Button
        size="lg"
        className="hover:bg-blue-700"
        onClick={() => openModal()}
      >
        + Request Leave
      </Button>
    ) : null;

  const desktopLayout = (
    <DesktopLayoutWrapper title="Leaves & Holidays" actionButton={actionButton}>
      <Outlet />
      <RequestLeaveModal
        isOpen={showModal}
        onClose={closeModal}
        onSuccess={closeModal}
      />
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

const LeaveApp: React.FC = () => {
  return (
    <LeaveRequestRefreshProvider>
      <RequestLeaveModalProvider>
        <LeaveAppInner />
      </RequestLeaveModalProvider>
    </LeaveRequestRefreshProvider>
  );
};

export default LeaveApp;
