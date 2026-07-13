import React, { useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useScreenSize } from "../../../hooks/useScreenSize";
import DesktopLayoutWrapper from "../../DesktopLayoutWrapper";
import HeaderBar from "../../HeaderBar";
import NavigationTabs, { Tab } from "../../NavigationTab";
import {
  useRecognitionFlags,
  recognitionPageVisible,
} from "../../../services/recognitionService";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { normalizePermissions } from "../../../context/permission/utils";

export const VIBE_BASE = "/webapp/recognition/vibe";

// The "Rewards & Recognition" Modular Ui Permission app gates which Vibe tabs
// are shown. Each tab maps to one or more page_names in that app; a tab stays
// visible when at least one of its mapped pages is enabled. Tabs with no
// mapping (dashboard, feed, admin) are never restricted by this layer.
const RR_PERMISSION_APP = "Rewards & Recognition";
const TAB_PERMISSION_PAGES: Record<string, string[]> = {
  "my-appreciations-history": ["Appreciations History"],
  "appreciations-leaderboard": ["Appreciations Leaderboard"],
  "earned-points": ["Earned Points Summary page"],
  "awards-live": [
    "Individual Award programs",
    "Individual Award Winners",
    "Team Award programs",
    "Team Award Winners",
  ],
  "awards-history": ["Individual Awards History", "Team Awards history"],
  "nomination-workflows": [
    "Nominations Workflows - Individual Nominations Raised",
    "Nominations Workflows - Individual Nominations Received",
    "Nominations Workflows - Team Nominations Raised",
  ],
};

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

  // Feature flags from the Advanced Settings doctype gate which tabs are shown.
  const flags = useRecognitionFlags();

  // Modular Ui Permission gating for the "Rewards & Recognition" app. Additive
  // on top of the flags: a mapped tab is hidden only when its pages are all
  // explicitly disabled. If the permission data hasn't loaded or the app/pages
  // are absent, nothing is restricted (safe fallback).
  const { data: rrPermission } = useGetUiPermission(RR_PERMISSION_APP);
  const rrApp = useMemo(
    () => normalizePermissions(rrPermission ?? [])[RR_PERMISSION_APP],
    [rrPermission],
  );
  const rrAllowsTab = (key: string): boolean => {
    const pages = TAB_PERMISSION_PAGES[key];
    if (!pages || !rrApp) return true; // no mapping or data not loaded
    return pages.some((pageName) => rrApp.pages[pageName]?.enabled);
  };

  const visibleTabs = VIBE_TABS.filter(
    (t) => recognitionPageVisible(t.key, flags) && rrAllowsTab(t.key),
  );

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
