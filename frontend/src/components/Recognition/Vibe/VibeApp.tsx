import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useScreenSize } from "../../../hooks/useScreenSize";
import DesktopLayoutWrapper from "../../DesktopLayoutWrapper";
import HeaderBar from "../../HeaderBar";
import NavigationTabs, { Tab } from "../../NavigationTab";

export const VIBE_BASE = "/webapp/recognition/vibe";

export const VIBE_TABS: Tab[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "my-appreciations-history", label: "My Appreciations History" },
  { key: "feed", label: "Feed" },
  { key: "appreciations-leaderboard", label: "Appreciations-Leaderboard" },
  { key: "awards-live", label: "Awards-Live Programs & Winners" },
  { key: "awards-history", label: "Awards-History" },
  { key: "nomination-workflows", label: "Awards-Nomination Workflows" },
  { key: "earned-points", label: "Earned Points Summary" },
  { key: "admin-dashboard", label: "Admin Dashboard" },
];

const VibeApp: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab =
    VIBE_TABS.find((t) => location.pathname.startsWith(`${VIBE_BASE}/${t.key}`))?.key ||
    "dashboard";

  // Desktop navigation is driven by the sidebar sub-items (like Compensation,
  // Attendance, Benefits, etc.), so the desktop layout only renders the routed
  // content. The horizontal tab bar is shown on mobile only.
  if (!isDesktop) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <header className="sticky top-0 z-50 bg-white shadow-sm">
          <HeaderBar title="Recognition" />
          <NavigationTabs
            tabs={VIBE_TABS}
            activeTab={activeTab}
            onTabChange={(tab) => navigate(`${VIBE_BASE}/${tab}`)}
          />
        </header>
        <main className="z-10 flex-grow overflow-y-auto">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <DesktopLayoutWrapper title="Recognition">
      <div className="h-full overflow-y-auto">
        <Outlet />
      </div>
    </DesktopLayoutWrapper>
  );
};

export default VibeApp;
