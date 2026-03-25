import React, { useEffect, useMemo, useState } from "react";
import NavigationTabs, { Tab } from "../NavigationTab";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useScreenSize } from "../../hooks/useScreenSize";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import InitiateFlow from "./Initiate/InitiateFlow";
import HeaderBar from "../HeaderBar";
import Button from "../shared/atoms/Button";
import { useGetUiPermission } from "../../hooks/userUiPermission";

type TabName = "Flow Requests" | "Confirmation" | "Separation";

const tabRoutes: Record<TabName, string> = {
  "Flow Requests": "/webapp/flow-app/flow-requests",
  Confirmation: "/webapp/flow-app/confirmation",
  Separation: "/webapp/flow-app/separation",
};

type SeprateRouteName = "Initiate Flow" | "Flow Request" | "SeparationWorkflow" | "Rejected Separation Request";
const NoDesktopLayoutRoute: string[] = [];

const FlowApp: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const [activeTab, setActiveTab] = useState<TabName>("Flow Requests");
  const navigate = useNavigate();
  const location = useLocation();
  const { data: userUiPermission } = useGetUiPermission("HR Process");

  const canInitiateFlow = useMemo(() => {
    const initiateFlowPage = userUiPermission?.[0]?.pages?.find(
      (item) => item.page_name === "Flow Requests",
    );
    const initiateAction = initiateFlowPage?.actions?.find(
      (action) => action.action_name === "initiate",
    );
    return !!initiateAction?.enabled;
  }, [userUiPermission]);

  const tabs: Tab[] = useMemo(() => {
    const allTabs: { key: TabName; label: string; permissionKey: string }[] = [
      {
        key: "Flow Requests",
        label: "Flow Requests",
        permissionKey: "Flow Requests",
      },
      {
        key: "Confirmation",
        label: "Confirmation",
        permissionKey: "Confirmation",
      },
      {
        key: "Separation",
        label: "Separation",
        permissionKey: "Separation",
      },
    ];

    if (!userUiPermission || userUiPermission.length === 0) {
      return allTabs.map(({ key, label }) => ({ key, label }));
    }

    const flowAppPermission = userUiPermission.find(
      (perm) => perm.app_name === "HR Process",
    );

    if (!flowAppPermission || !flowAppPermission.enabled) {
      return [];
    }

    return allTabs
      .filter((tab) => {
        const pagePermission = flowAppPermission.pages?.find(
          (page) => page.page_name === tab.permissionKey,
        );
        return pagePermission && pagePermission.enabled;
      })
      .map(({ key, label }) => ({ key, label }));
  }, [userUiPermission]);
  const [seprateRoute, setSeprateRoute] = useState<SeprateRouteName | null>(
    null,
  );
  const [showInitiateModel, setShowInitiateModel] = useState<boolean>(false);

  const showInitiateButton =
    activeTab === "Flow Requests" && !seprateRoute && canInitiateFlow;

  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
    navigate(tabRoutes[tab]);
  };

  const handleInitiate = () => {
    setSeprateRoute("Initiate Flow");
    navigate("/webapp/flow-app/initiate-flow");
  };

  const handleInitiateModel = () => {
    setShowInitiateModel(true);
  };

  useEffect(() => {
    const matchedTab = (Object.keys(tabRoutes) as TabName[]).find((tab) =>
      location.pathname.startsWith(tabRoutes[tab]),
    );

    if (matchedTab) {
      setActiveTab(matchedTab);
    }

    if (location.pathname === "/webapp/flow-app/initiate-flow") {
      setSeprateRoute("Initiate Flow");
    } else if (
      location.pathname.startsWith("/webapp/flow-app/separation-workflow/")
    ) {
      setSeprateRoute("SeparationWorkflow");
    } else if (location.pathname.startsWith("/webapp/flow-app/flow-request/")) {
      setSeprateRoute("Flow Request");
    } else if (location.pathname.startsWith("/webapp/flow-app/rejected-separation-request")) {
      setSeprateRoute("Rejected Separation Request");
    } else {
      setSeprateRoute(null);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === "/webapp/flow-app" && tabs.length > 0) {
      const firstTab = tabs[0].key as TabName;
      setActiveTab(firstTab);
      navigate(tabRoutes[firstTab], { replace: true });
    }
  }, [location.pathname, navigate, tabs]);

  const mobileLayout = (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        {!seprateRoute && (
          <>
            <HeaderBar
              title={"HR Process"}
              onBack={() => navigate("/webapp")}
            />
            <NavigationTabs
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={(tab) => handleTabChange(tab as TabName)}
            />
          </>
        )}
      </header>
      <main className="z-10 flex-grow p-2">
        <Outlet />
      </main>

      {showInitiateButton && (
        <div className="sticky z-10 mt-auto bottom-0 bg-white border-t shadow-lg py-4 px-4 w-full">
          <div className="max-w-4xl mx-auto flex space-x-4">
            <Button
              fullWidth
              onClick={handleInitiate}
              size="lg"
              bgColor="primary"
            >
              + Initiate Flow
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const actionButton = showInitiateButton ? (
    <Button
      bgColor="blue-600"
      size="lg"
      className="hover:bg-blue-700 text-white"
      onClick={handleInitiateModel}
    >
      + Initiate Flow
    </Button>
  ) : null;

  const desktopLayout = !NoDesktopLayoutRoute.includes(seprateRoute || "") ? (
    <DesktopLayoutWrapper title="HR Process" actionButton={actionButton}>
      <Outlet />
      {showInitiateModel && (
        <InitiateFlow handleCloseModel={() => setShowInitiateModel(false)} />
      )}
    </DesktopLayoutWrapper>
  ) : (
    <Outlet />
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default FlowApp;
