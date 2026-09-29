import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Zap,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useScreenSize } from "../../hooks/useScreenSize";
import {
  GoogleCalendarStatus,
  integrationService,
} from "../../services/integrationService";
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import HeaderBar from "../HeaderBar";

interface IntegrationItem {
  id: string;
  name: string;
  category: "Calendar" | "Communication" | "Meeting";
  description: string;
  icon: React.ReactNode;
  status: "connected" | "not_connected" | "coming_soon";
  features: string[];
  isRecommended?: boolean;
}

/**
 * Authentic Google Workspace Google Calendar SVG Icon
 */
const GoogleCalendarOfficialIcon: React.FC<{ className?: string }> = ({
  className = "w-11 h-11",
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    className={`${className} shrink-0`}
  >
    <path
      d="M387 117.5 265.7 104l-148.2 13.5L104 252.2 117.5 387l134.7 16.8L387 387l13.5-138.1z"
      style={{ fill: "#fff" }}
      transform="translate(3.75 3.75)"
    />
    <path
      d="M176.55 330.35c-10.1-6.8-17-16.7-20.9-29.9l23.4-9.6c2.1 8.1 5.8 14.3 11.1 18.8 5.3 4.4 11.7 6.6 19.1 6.6 7.6 0 14.2-2.3 19.7-7s8.3-10.6 8.3-17.8q0-10.95-8.7-18c-5.8-4.6-13.1-7-21.8-7h-13.5v-23.1h12.1c7.5 0 13.8-2 18.9-6.1 5.1-4 7.7-9.6 7.7-16.6q0-9.45-6.9-15c-4.6-3.7-10.4-5.6-17.4-5.6-6.9 0-12.3 1.8-16.4 5.5-4 3.7-7 8.2-8.8 13.5l-23.1-9.6c3.1-8.7 8.7-16.4 16.9-23 8.3-6.6 18.8-10 31.6-10 9.5 0 18 1.8 25.5 5.5s13.5 8.8 17.8 15.2c4.3 6.5 6.4 13.8 6.4 21.9 0 8.3-2 15.2-6 21q-6 8.55-14.7 13.2v1.4c7.6 3.2 13.9 8.1 18.8 14.7s7.3 14.4 7.3 23.6-2.3 17.3-7 24.5c-4.6 7.2-11.1 12.8-19.2 16.9-8.2 4.1-17.4 6.2-27.6 6.2-11.6 0-22.5-3.4-32.6-10.2m143.4-116-25.5 18.6-12.8-19.5 46-33.2h17.7v156.7h-25.3v-122.6z"
      style={{ fill: "#1a73e8" }}
    />
    <path
      d="M387 508.2 508.2 387l-60.6-27-60.6 27-27 60.6z"
      style={{ fill: "#ea4335" }}
      transform="translate(3.75 3.75)"
    />
    <path
      d="m90.6 447.6 26.9 60.6H387V387H117.5z"
      style={{ fill: "#34a853" }}
      transform="translate(3.75 3.75)"
    />
    <path
      d="M36.7-3.8C14.3-3.8-3.8 14.3-3.8 36.7V387l60.6 26.9 60.6-26.9V117.5H387l26.9-60.6L387-3.8z"
      style={{ fill: "#4285f4" }}
      transform="translate(3.75 3.75)"
    />
    <path
      d="M-3.8 387v80.8c0 22.3 18.1 40.4 40.4 40.4h80.8V387z"
      style={{ fill: "#188038" }}
      transform="translate(3.75 3.75)"
    />
    <path
      d="M387 117.5V387h121.3V117.5l-60.6-26.9z"
      style={{ fill: "#fbbc04" }}
      transform="translate(3.75 3.75)"
    />
    <path
      d="M508.2 117.5V36.7c0-22.3-18.1-40.4-40.4-40.4H387v121.3h121.2z"
      style={{ fill: "#1967d2" }}
      transform="translate(3.75 3.75)"
    />
  </svg>
);

export const IntegrationsApp: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All Apps");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState<GoogleCalendarStatus>({
    configured: false,
    connected: false,
  });
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  useEffect(() => {
    fetchCalendarStatus();
    const storedLastSync = localStorage.getItem("gcal_last_synced");
    if (storedLastSync) {
      setLastSyncedTime(storedLastSync);
    }
  }, []);

  const fetchCalendarStatus = async () => {
    try {
      const status = await integrationService.getGoogleCalendarStatus();
      setCalendarStatus(status);
      if (status.flash?.message) {
        toast(status.flash.message, {
          icon: status.flash.indicator === "green" ? "✅" : "ℹ️",
        });
      }
    } catch (err) {
      console.error("Error checking calendar status:", err);
    }
  };

  const handleSyncOrConnect = async () => {
    if (isSyncing || isConnecting) return;

    // If not connected yet, directly initiate Google OAuth authorization
    if (!calendarStatus.connected) {
      handleAuthorize();
      return;
    }

    setIsSyncing(true);

    try {
      const res = await integrationService.syncGoogleCalendar();
      const nowStr = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setLastSyncedTime(nowStr);
      localStorage.setItem("gcal_last_synced", nowStr);

      if (res.status === "synced") {
        toast.success(res.message || "Google Calendar synced successfully!");
        setCalendarStatus((prev) => ({ ...prev, connected: true }));
      } else if (res.status === "importing") {
        toast.success("Importing calendar events in the background...", {
          icon: "🔄",
        });
        setCalendarStatus((prev) => ({ ...prev, connected: true }));
      } else if (res.status === "pull_disabled") {
        toast(res.message || "Event pull is disabled in calendar settings.", {
          icon: "⚠️",
        });
      } else {
        toast.success(res.message || "Sync completed.");
      }
    } catch (error: any) {
      console.warn("Sync failed:", error);
      toast.error(
        errorResponseFormater(error, "Could not sync with Google Calendar."),
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAuthorize = async () => {
    setIsConnecting(true);
    try {
      const redirectUrl = await integrationService.connectGoogleCalendar(
        window.location.pathname,
      );
      if (redirectUrl && typeof redirectUrl === "string") {
        toast.success("Redirecting to Google authorization...", {
          duration: 2000,
        });
        window.location.href = redirectUrl;
      } else {
        toast.error("Could not obtain Google authorization URL.");
      }
    } catch (err: any) {
      console.error("Failed to connect Google Calendar:", err);
      toast.error(
        errorResponseFormater(
          err,
          "Failed to initiate Google Calendar connection.",
        ),
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const categories = ["All Apps"];

  // Extensible integration list for current and future apps
  const integrations: IntegrationItem[] = [
    {
      id: "google-calendar",
      name: "Sync your Google Calendar",
      category: "Calendar",
      description:
        "Seamlessly synchronize interview schedules, panelist availability, and candidate interview invites directly with your Google Calendar.",
      icon: <GoogleCalendarOfficialIcon />,
      status: calendarStatus.connected ? "connected" : "not_connected",
      isRecommended: true,
      features: [
        "Two-way interview schedule synchronization",
        "Automated Google Meet interview links generation",
        "Panelist calendar availability checking",
        "Background calendar refresh & conflict avoidance",
      ],
    },
  ];

  const filteredIntegrations = useMemo(() => {
    return integrations.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "All Apps" || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [integrations, searchQuery, selectedCategory]);

  const content = (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Banner matching previous user-favorite layout */}
      <div className="bg-gradient-to-r from-[#5564D2] via-[#4853c8] to-[#6366F1] rounded-2xl p-6 sm:p-8 text-white shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 backdrop-blur-[1px] transform skew-x-12 pointer-events-none hidden md:block" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-3xl bg-white/15 backdrop-blur-md text-[11px] font-semibold tracking-wider text-blue-100 uppercase mb-3">
            <Zap className="w-3.5 h-3.5 text-yellow-300" />
            Integrations & Connected Apps
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            Connected Apps & Tools
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
            Connect external calendars and collaboration tools to automate
            interview schedules, avoid double-bookings, and streamline hiring
            workflows.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-gray-200/80 shadow-xs">
        {/* Category Buttons - No Horizontal Scrollbar */}
        <div
          className="flex items-center gap-2 overflow-x-auto scrollbar-hide [&::-webkit-scrollbar]:hidden py-0.5"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? "bg-[#5564D2] text-white shadow-xs font-semibold"
                  : "bg-white text-gray-600 hover:text-[#5564D2] hover:bg-blue-50/50 border border-gray-200/80 shadow-2xs"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5564D2]/20 focus:border-[#5564D2] transition-colors shadow-2xs"
          />
        </div>
      </div>

      {/* Enhanced Integrations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredIntegrations.map((item) => {
          const isGoogleCalendar = item.id === "google-calendar";
          const isConnected = item.status === "connected";
          const isComingSoon = item.status === "coming_soon";

          return (
            <div
              key={item.id}
              className={`relative bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden ${
                isGoogleCalendar
                  ? "border-[#5564D2]/30 shadow-xs hover:shadow-md ring-1 ring-[#5564D2]/10"
                  : "border-gray-200/80 shadow-xs hover:shadow-sm opacity-90"
              }`}
            >
              {/* Card Header & Content */}
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-50 via-indigo-50/40 to-white rounded-2xl border border-blue-100/80 flex items-center justify-center shrink-0 shadow-2xs p-1.5">
                      {item.icon}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                          {item.name}
                        </h2>
                        {item.isRecommended && (
                          <span className="px-2.5 py-0.5 rounded-3xl text-xs font-medium bg-blue-50/80 text-[#5564D2] border border-blue-200">
                            Recommended
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-gray-400">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  {/* Properly Proportioned Badges */}
                  <div>
                    {isConnected ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-3xl text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Connected
                      </span>
                    ) : isComingSoon ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-3xl text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        <Clock className="w-3 h-3 text-slate-500" />
                        Coming Soon
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-3xl text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Not Connected
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-600 leading-relaxed">
                  {item.description}
                </p>

                {/* Connected Details Bar for Google Calendar */}
                {isGoogleCalendar && isConnected && (
                  <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-blue-900 font-medium">
                      <ShieldCheck className="w-4 h-4 text-[#5564D2] shrink-0" />
                      <span>
                        Account:{" "}
                        <strong className="font-semibold text-gray-800">
                          {calendarStatus.google_account ||
                            "Primary Google Calendar"}
                        </strong>
                      </span>
                    </div>
                    {lastSyncedTime && (
                      <span className="text-[11px] text-gray-500">
                        Last synced: {lastSyncedTime}
                      </span>
                    )}
                  </div>
                )}

                {/* Capabilities List */}
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <div className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
                    Capabilities
                  </div>
                  <ul className="space-y-1.5">
                    {item.features.map((feat, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-2 text-xs text-gray-600"
                      >
                        <CheckCircle2
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isGoogleCalendar
                              ? "text-[#5564D2]"
                              : "text-gray-400"
                          }`}
                        />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Card Footer Actions - Clean white background without dull gray */}
              <div className="p-4 sm:px-6 sm:py-4 bg-white border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {isGoogleCalendar ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between w-full gap-3">
                    {/* Secondary Authorize / Reconnect Button */}
                    <button
                      type="button"
                      onClick={handleAuthorize}
                      disabled={isConnecting || isSyncing}
                      className="text-xs text-gray-600 hover:text-[#5564D2] font-medium inline-flex items-center justify-center sm:justify-start gap-1.5 py-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {isConnected ? "Switch Account" : "Authorize with Google"}
                    </button>

                    {/* Primary Connect / Sync Button */}
                    <button
                      type="button"
                      onClick={handleSyncOrConnect}
                      disabled={isSyncing || isConnecting}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-medium rounded-xl text-white bg-[#5564D2] hover:bg-[#4653be] active:bg-[#3b47a8] transition-all shadow-xs hover:shadow focus:outline-none focus:ring-2 focus:ring-[#5564D2]/20 disabled:opacity-60 cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${
                          isSyncing ? "animate-spin" : ""
                        }`}
                      />
                      {isSyncing
                        ? "Syncing Calendar..."
                        : isConnected
                          ? "Sync Calendar Now"
                          : "Connect Google Calendar"}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs text-gray-400 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      Available in upcoming release
                    </span>
                    <button
                      type="button"
                      disabled
                      className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-400 bg-slate-50 border border-slate-200/60 cursor-not-allowed"
                    >
                      Coming Soon
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const desktopLayout = (
    <DesktopLayoutWrapper title="Integrations">
      <div className="h-full w-full overflow-y-auto bg-[#F4F6FB] p-2 sm:p-5">
        {content}
      </div>
    </DesktopLayoutWrapper>
  );

  const mobileLayout = (
    <div className="flex flex-col min-h-screen bg-[#F4F6FB]">
      <HeaderBar title="Integrations" />
      <main className="flex-1 overflow-y-auto p-3 sm:p-4 z-100">{content}</main>
    </div>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default IntegrationsApp;
