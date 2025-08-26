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
        {/*
          The main outlet needs both providers to function correctly,
          so they wrap the entire content.
        */}
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

        {/* Actions Dropdown - Positioned to the top of the button */}
        {showActionsDropdown && (
          <div className="absolute right-0 bottom-full mb-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-3 z-50 backdrop-blur-sm">
            <div className="px-4 py-2 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">
                Quick Actions
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Submit requests and manage attendance
              </p>
            </div>
            <div className="py-2">
              {/* Corrected order: Leave Request first, then Attendance Request */}
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
        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Outlet content and its components need to be within the providers */}
          <LeaveRequestRefreshProvider>
            <RequestLeaveModalProvider>
              <Outlet />
            </RequestLeaveModalProvider>
          </LeaveRequestRefreshProvider>
        </div>

        {/* Desktop Modals - Fixed positioning outside main content */}
        {/* The LeaveRequest component is now wrapped by its provider */}
        {showLeaveRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              {/* Ensure LeaveRequest is inside its providers */}
              <LeaveRequestRefreshProvider>
                <RequestLeaveModalProvider>
                  <LeaveRequest
                    onCancel={() => setShowLeaveRequest(false)}
                    onSuccess={() => setShowLeaveRequest(false)}
                  />
                </RequestLeaveModalProvider>
              </LeaveRequestRefreshProvider>
            </div>
          </div>
        )}
        {showAttendanceRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <AttndanceRequestForm
                onClose={() => setShowAttendanceRequest(false)}
              />
            </div>
          </div>
        )}
      </div>
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default AttendanceLayout;