import React, { useEffect, useMemo, useState, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import NavigationTabs, { Tab } from "../NavigationTab";
import HeaderBar from "../HeaderBar";
import { LeaveRequestRefreshProvider } from "../Leaves/LeaveRequestRefreshContext";
import { RequestLeaveModalProvider } from "../Leaves/RequestLeaveModalContext";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize";
import { ChevronDown } from "lucide-react";
import LeaveRequest from "../Attendance/LeaveRequest";
import AttndanceRequestForm from "../Attendance/AttendanceRequest/AttendanceRequestForm";

const AttendanceLayout: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [showLeaveRequest, setShowLeaveRequest] = useState(false);
  const [showAttendanceRequest, setShowAttendanceRequest] = useState(false);

  const actionsDropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside actions dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        actionsDropdownRef.current &&
        !actionsDropdownRef.current.contains(event.target as Node)
      ) {
        setShowActionsDropdown(false);
      }
    };

    if (showActionsDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showActionsDropdown]);

  const tabs: Tab[] = useMemo(
    () => [
      { label: "Attendance", key: "summary" },
      { label: "Calendar Views", key: "calendar-views" },
      { label: "My Attendance Requests", key: "attendance-request" },
      { label: "Team Attendance Requests", key: "team-attendance-requests" },
    ],
    []
  );

  const calendarSubTabs = useMemo(
    () => [
      { label: "My Attendance Details", key: "emp-attendance" },
      { label: "Team Attendance", key: "team-attendance" },
    ],
    []
  );

  const location = useLocation();
  const navigate = useNavigate();

  // Initialize state with default values
  const [activeTab, setActiveTab] = useState<Tab>(tabs[0]);
  const [activeSubTab, setActiveSubTab] = useState<string>("emp-attendance");

  // Use a single useEffect to handle all state updates based on the URL
  useEffect(() => {
    const pathSegments = location.pathname.split("/");
    const lastSegment = pathSegments[pathSegments.length - 1];

    const isCalendarSubTab = calendarSubTabs.some(
      (subTab) => subTab.key === lastSegment
    );

    if (isCalendarSubTab) {
      setActiveTab(tabs.find((tab) => tab.key === "calendar-views") || tabs[0]);
      setActiveSubTab(lastSegment);
    } else {
      setActiveTab(tabs.find((tab) => tab.key === lastSegment) || tabs[0]);
      // Reset sub-tab state when not on a calendar view
      setActiveSubTab("emp-attendance");
    }
  }, [location.pathname, tabs, calendarSubTabs]);

  const handleTabChange = (tab: (typeof tabs)[number]) => {
    setActiveTab(tab);
    if (tab.key === "calendar-views") {
      // Navigate to the active sub-tab when Calendar Views is selected
      navigate(`/webapp/attendance/${activeSubTab}`);
    } else {
      navigate(`/webapp/attendance/${tab.key}`);
    }
  };

  const handleSubTabChange = (subTab: (typeof calendarSubTabs)[number]) => {
    setActiveSubTab(subTab.key);
    navigate(`/webapp/attendance/${subTab.key}`);
  };

  const mobileLayout = (
    <div className="min-h-screen bg-white">
      {/* Fixed Header */}
      <HeaderBar title={activeTab.label} onBack={() => navigate("/webapp")} />
      <div className="sticky top-[58px] z-50 border-t border-gray-200">
        <NavigationTabs
          tabs={tabs}
          activeTab={activeTab?.key}
          onTabChange={(tab) => {
            handleTabChange(tabs.find((item) => item.key === tab) as Tab);
          }}
        />
      </div>
      {/* Page Content (with top padding to avoid overlap) */}
      <div className="">
        <LeaveRequestRefreshProvider>
          <RequestLeaveModalProvider>
            <Outlet />
          </RequestLeaveModalProvider>
        </LeaveRequestRefreshProvider>
      </div>
    </div>
  );

  // Actions Button Component for Second Top Bar
  const ActionsButton = () => {
    // This line is removed to show the button on all tabs
    return (
      <div className="relative" ref={actionsDropdownRef}>
        <button
          onClick={() => setShowActionsDropdown(!showActionsDropdown)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 font-medium text-sm"
        >
          + Request Forms
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              showActionsDropdown ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Actions Dropdown - Matching Desktop Theme */}
        {showActionsDropdown && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-3 z-50 backdrop-blur-sm">
            <div className="px-4 py-2 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">
                Quick Actions
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Submit requests and manage attendance
              </p>
            </div>
            <div className="py-2">
              <button
                onClick={() => {
                  setShowLeaveRequest(true);
                  setShowActionsDropdown(false);
                }}
                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 w-full text-left transition-colors group"
              >
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Leave Request</p>
                  <p className="text-xs text-gray-500">Apply for time off</p>
                </div>
              </button>
              <button
                onClick={() => {
                  setShowAttendanceRequest(true);
                  setShowActionsDropdown(false);
                }}
                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 w-full text-left transition-colors group"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Attendance Request
                  </p>
                  <p className="text-xs text-gray-500">
                    Request attendance corrections
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Create the action button for desktop - positioned bottom-right by DesktopLayoutWrapper
  const actionButton = <ActionsButton />;

  const desktopLayout = (
    <DesktopLayoutWrapper title="Attendance" actionButton={actionButton}>
      <div className="flex flex-col h-full">
        {/* Modern Tab Navigation for Web */}
        <div className="bg-gray-100 border border-gray-200 px-8 py-4 flex-shrink-0">
          {/* Navigation Pills */}
          <div className="flex gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab)}
                className={`relative text-sm px-6 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                  activeTab?.key === tab.key
                    ? "bg-black text-white shadow-lg"
                    : " text-gray-700  hover:text-gray-900 shadow-md hover:shadow-lg border "
                }`}
              >
                <span className="relative z-10">{tab.label}</span>
                {activeTab?.key === tab.key && (
                  <div className="absolute inset-0  rounded-xl opacity-10"></div>
                )}
              </button>
            ))}
          </div>
        </div>
        {/* Sub-navigation for Calendar Views */}
        {activeTab?.key === "calendar-views" && (
          <div className="flex justify-between items-center bg-white p-2  shadow-sm border border-gray-200 border-t-0">
            <div className="px-6 py-2 flex items-center gap-3 bg-white w-full">
              <span className="text-sm text-gray-600 font-medium">
                View Mode:
              </span>
              <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                {calendarSubTabs.map((subTab) => (
                  <button
                    key={subTab.key}
                    onClick={() => handleSubTabChange(subTab)}
                    className={`px-6 py-1 text-sm rounded-lg font-semibold transition-all duration-200 ${
                      activeSubTab === subTab.key
                        ? "bg-black text-white shadow-md"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    {subTab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <LeaveRequestRefreshProvider>
            <RequestLeaveModalProvider>
              <Outlet />

              {/* Desktop Modals - Moved inside providers */}
              {showLeaveRequest && (
                <LeaveRequest
                  onCancel={() => setShowLeaveRequest(false)}
                  onSuccess={() => setShowLeaveRequest(false)}
                />
              )}
              {showAttendanceRequest && (
                <AttndanceRequestForm
                  onClose={() => setShowAttendanceRequest(false)}
                />
              )}
            </RequestLeaveModalProvider>
          </LeaveRequestRefreshProvider>
        </div>
      </div>
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default AttendanceLayout;
