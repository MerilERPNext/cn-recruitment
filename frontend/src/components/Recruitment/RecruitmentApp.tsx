import React, { useMemo, useState, useEffect } from "react";
import HeaderBar from "../HeaderBar";
import { useNavigate, Outlet, useLocation } from "react-router";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize";
import Button from "../shared/atoms/Button";
import NavigationTabs, { Tab } from "../NavigationTab";

type TabName =
  | "Requisitions"
  | "Refer"
  | "My Referrals"
  | "IJP Openings"
  | "IJP Jobs Applied"


const tabRoutes: Record<TabName, string> = {
  "Requisitions": "/webapp/recruitment/requisition",
  "Refer": "/webapp/recruitment/refer",
  "My Referrals": "/webapp/recruitment/referrals",
  "IJP Openings": "/webapp/recruitment/ijp-openings",
  "IJP Jobs Applied": "/webapp/recruitment/ijp-applied",
};

const RecruitmentApp: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabName>("Requisitions");

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
    if (location.pathname === "/webapp/recruitment" || location.pathname === "/webapp/recruitment/") {
      const fallback = "Requisitions";
      setActiveTab(fallback);
      navigate(tabRoutes[fallback], { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleTabChange = (tabKey: string) => {
    const tab = tabKey as TabName;
    setActiveTab(tab);
    navigate(tabRoutes[tab]);
  };

  const isFormPage =
    location.pathname === "/webapp/recruitment/requisition/new" ||
    location.pathname.startsWith("/webapp/recruitment/requisition/edit") ||
    location.pathname === "/webapp/recruitment/refer";

  const shouldShowActionButton = () => {
    if (isFormPage) return false;
    return (
      location.pathname === "/webapp/recruitment/requisition" ||
      location.pathname === "/webapp/recruitment/referrals"
    );
  };

  const handleAction = () => {
    if (location.pathname === "/webapp/recruitment/requisition") {
      navigate("/webapp/recruitment/requisition/new");
    } else if (location.pathname === "/webapp/recruitment/referrals") {
      navigate("/webapp/recruitment/refer");
    }
  };

  const getActionButtonText = () => {
    if (location.pathname === "/webapp/recruitment/requisition") {
      return "+ Raise Requisition Request";
    }
    if (location.pathname === "/webapp/recruitment/referrals") {
      return "+ Refer Candidate";
    }
    return "";
  };

  const title = useMemo(() => {
    const path = location.pathname;

    const routeTitles: Record<string, string> = {
      "/webapp/recruitment/overview": "Overview",
      "/webapp/recruitment/job-openings": "Job Openings",
      "/webapp/recruitment/candidates": "Candidates",
      "/webapp/recruitment/requisition": "Requisitions",
      "/webapp/recruitment/requisition/new": "New Requisition",
      "/webapp/recruitment/interviews": "My Interviews",
      "/webapp/recruitment/refer": "Refer Candidate",
      "/webapp/recruitment/referrals": "My Referrals",
      "/webapp/recruitment/ijp-openings": "IJP Openings",
      "/webapp/recruitment/ijp-applied": "IJP Jobs Applied",
      "/webapp/recruitment/offer-letter": "Offer Letter",
      "/webapp/recruitment/link-accounts": "Link Accounts",
      "/webapp/recruitment/configure-job-boards": "Configure Job Boards",
    };

    if (path.startsWith("/webapp/recruitment/candidates/detail")) {
      return "Candidate Detail";
    }
    if (path.startsWith("/webapp/recruitment/interviews/")) {
      return "Interview Details";
    }
    if (path.startsWith("/webapp/recruitment/referrals/")) {
      return "Referral Details";
    }
    if (path.startsWith("/webapp/recruitment/requisition/edit")) {
      return "Edit Requisition";
    }

    return routeTitles[path] || "Recruitment";
  }, [location.pathname]);

  const mobileLayout = (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-50 bg-white border-b">
        <HeaderBar title={title} onBack={() => navigate("/webapp")} />
        {!isFormPage && (
          <NavigationTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        )}
      </div>

      <main className="p-4 z-100 flex-grow overflow-y-auto">
        <Outlet />
      </main>

      {shouldShowActionButton() && (
        <div className="sticky mt-auto bottom-0 bg-white border-t shadow-lg py-4 px-4 w-full">
          <div className="max-w-4xl mx-auto flex space-x-4">
            <Button
              size="lg"
              onClick={handleAction}
              className="hover:bg-blue-700 flex-1"
            >
              {getActionButtonText()}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const actionButton = shouldShowActionButton() ? (
    <Button size="lg" onClick={handleAction} className="hover:bg-blue-700">
      {getActionButtonText()}
    </Button>
  ) : null;

  const desktopLayout = (
    <DesktopLayoutWrapper title="Recruitment" actionButton={actionButton}>
      <div className="px-2 py-4 overflow-y-auto h-full">
        <Outlet />
      </div>
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default RecruitmentApp;
