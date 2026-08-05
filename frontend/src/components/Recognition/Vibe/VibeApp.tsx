import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useScreenSize } from "../../../hooks/useScreenSize";
import DesktopLayoutWrapper from "../../DesktopLayoutWrapper";
import HeaderBar from "../../HeaderBar";
import NavigationTabs, { Tab } from "../../NavigationTab";
import {
  useRecognitionFlags,
  recognitionPageVisible,
} from "../../../services/recognitionService";

export const VIBE_BASE = "/webapp/recognition/vibe";

export const VIBE_TABS: Tab[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "history", label: "History" },
  { key: "feed", label: "Feed" },
  { key: "appreciations-leaderboard", label: "Leaderboard" },
  { key: "awards-live", label: "All Awards" },
  { key: "nomination-workflows", label: "Awards-Nomination Workflows" },
  { key: "earned-points", label: "Points Summary" },
  { key: "admin-dashboard", label: "Admin Dashboard" },
];

const VibeApp: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const location = useLocation();

  // Feature flags from the Advanced Settings doctype gate which tabs are shown.
  const flags = useRecognitionFlags();
  const visibleTabs = VIBE_TABS.filter((t) => recognitionPageVisible(t.key, flags));

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
            tabs={visibleTabs}
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
