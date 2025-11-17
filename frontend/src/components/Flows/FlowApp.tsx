import React, { useEffect, useState } from "react";
import NavigationTabs, { Tab } from "../NavigationTab";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useScreenSize } from "../../hooks/useScreenSize";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import InitiateFlow from "./Initiate/InitiateFlow";
import HeaderBar from "../HeaderBar";
import Button from "../shared/atoms/Button";
type TabName = "Flow Requests" | "Confirmation" | "Separation";

const tabRoutes: Record<TabName, string> = {
  "Flow Requests": "/webapp/flow-app/flow-requests",
  Confirmation: "/webapp/flow-app/confirmation",
  Separation: "/webapp/flow-app/separation",
};

type SeprateRouteName = "Initiate Flow" | "Flow Request";

const FlowApp: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const [activeTab, setActiveTab] = useState<TabName>("Flow Requests");
  const navigate = useNavigate();
  const tabs: Tab[] = (Object.keys(tabRoutes) as TabName[]).map((key) => ({
    key,
    label: key,
  }));
  const location = useLocation();
  const [seprateRoute, setSeprateRoute] = useState<SeprateRouteName | null>(
    null
  );
  const [showInitiateModel, setShowInitiateModel] = useState<boolean>(false);

  const showInitiateButton = activeTab === "Flow Requests" && !seprateRoute;

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
      location.pathname.startsWith(tabRoutes[tab])
    );

    if (matchedTab) {
      setActiveTab(matchedTab);
    }

    if (location.pathname === "/webapp/flow-app/initiate-flow") {
      setSeprateRoute("Initiate Flow");
    } else if (location.pathname.startsWith("/webapp/flow-app/flow-request/")) {
      setSeprateRoute("Flow Request");
    } else {
      setSeprateRoute(null);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === "/webapp/flow-app") {
      const fallback = "Flow Requests";
      setActiveTab(fallback);
      navigate(tabRoutes[fallback], { replace: true });
    }
  }, [location.pathname, navigate]);

  const mobileLayout = (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        {!seprateRoute && (
          <>
            <HeaderBar title={"Flows"} onBack={() => navigate("/webapp")} />
            <NavigationTabs
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={(tab) => handleTabChange(tab as TabName)}
            />
          </>
        )}
      </header>
      <main className="z-10 flex-grow">
        <Outlet />
      </main>

      {showInitiateButton && (
        <div className="sticky z-10 mt-auto bottom-0 bg-white border-t shadow-lg py-4 px-4 w-full">
          <div className="max-w-4xl mx-auto flex space-x-4">
            <Button
              fullWidth
              onClick={handleInitiate}
              size="lg"
              bgColor="blue-600"
              className="hover:bg-blue-700"
            >
              Initiate
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const actionButton = (
    <Button
      bgColor="blue-600"
      size="lg"
      className="hover:bg-blue-700"
      onClick={handleInitiateModel}
    >
      + Initiate
    </Button>
  );

  const desktopLayout = !seprateRoute ? (
    <DesktopLayoutWrapper title="Flows" actionButton={actionButton}>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto relative">
          <Outlet />
        </div>
        {showInitiateModel && (
          <InitiateFlow
            openAsModel={true}
            handleCloseModel={() => setShowInitiateModel(false)}
          />
        )}
      </div>
    </DesktopLayoutWrapper>
  ) : (
    <Outlet />
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default FlowApp;
