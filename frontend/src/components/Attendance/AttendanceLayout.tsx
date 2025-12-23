import React, { useEffect, useMemo, useState, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import NavigationTabs, { Tab } from "../NavigationTab";
import HeaderBar from "../HeaderBar";
import { LeaveRequestRefreshProvider } from "../Leaves/LeaveRequestRefreshContext";
import { RequestLeaveModalProvider } from "../Leaves/RequestLeaveModalContext";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize";
import LeaveRequest from "../Attendance/LeaveRequest";
import CreateOvertimeRequest from "./OvertimeRequests/CreateOvertimeRequest";
import { SidebarProvider, useSidebar } from "./SidebarContext";
import AttendanceRequestFormV2 from "./AttendanceRequest/AttendanceRequestFormV2";
import Button from "../shared/atoms/Button";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { usePlannedOvertimeAllowed } from "../../hooks/useAttendance";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";

const AttendanceLayoutContent: React.FC = () => {
  const { data: userId } = useLoggedInUser();
  const { isSidebarOpen } = useSidebar();

  const { data: user } = useCurrentEmployeeAllDetails(userId || "");

  const { data: plannedOvertimAllowed } = usePlannedOvertimeAllowed(
    user?.employee || ""
  );

  const { isDesktop } = useScreenSize();
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [showLeaveRequest, setShowLeaveRequest] = useState(false);
  const [showAttendanceRequest, setShowAttendanceRequest] = useState(false);
  const [showOvertimeRequest, setShowOvertimeRequest] = useState(false);

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
      { label: "My Attendance Details", key: "calendar-views" },
      { label: "Team Attendance", key: "team-attendance" },
      { label: "My Attendance Requests", key: "attendance-request" },
      { label: "Team Attendance Requests", key: "team-attendance-requests" },
      { label: "My Overtime Requests", key: "my-overtime-requests" },
      { label: "Team Overtime Requests", key: "team-overtime-requests" },
    ],
    []
  );

  const calendarSubTabs = useMemo(
    () => [{ label: "My Attendance Details", key: "emp-attendance" }],
    []
  );

  const location = useLocation();
  const navigate = useNavigate();

  // Initialize state with default values
  const [activeTab, setActiveTab] = useState<Tab>(tabs[0]);
  const [activeSubTab, setActiveSubTab] = useState<string>("emp-attendance");

  useEffect(() => {
    const pathSegments = location.pathname.split("/");
    const lastSegment = pathSegments[pathSegments.length - 1];
    const isValidMainTab = tabs.some((tab) => tab.key === lastSegment);
    const isCalendarSubTab = calendarSubTabs.some(
      (subTab) => subTab.key === lastSegment
    );

    if (isCalendarSubTab) {
      const calendarTab = tabs.find((tab) => tab.key === "calendar-views");
      if (calendarTab) {
        setActiveTab(calendarTab);
        setActiveSubTab(lastSegment);
      }
    } else if (isValidMainTab) {
      const matchedTab = tabs.find((tab) => tab.key === lastSegment);
      if (matchedTab) {
        setActiveTab(matchedTab);
        setActiveSubTab("emp-attendance"); // or leave as-is if you don't want to reset
      }
    } else {
      // Do NOT update state — keeps activeTab undefined or unchanged
      setActiveTab({ key: "", label: "" }); // Typescript fix: ensure `activeTab` can be undefined
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
  const mobileLayout = (
    <div className="min-h-screen bg-white">
      {/* Fixed Header */}
      <HeaderBar title={activeTab.label} onBack={() => navigate("/webapp")} />
      {tabs.some((tab) => tab.key === activeTab?.key) && (
        <div className="sticky top-[58px] z-40 border-t border-gray-200">
          <NavigationTabs
            tabs={tabs}
            activeTab={activeTab?.key}
            onTabChange={(tab) => {
              const foundTab = tabs.find((item) => item.key === tab);
              if (foundTab) handleTabChange(foundTab);
            }}
          />
        </div>
      )}
      {/* Page Content (with top padding to avoid overlap) */}
      <div className="bg-white">
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
      {showAttendanceRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <AttendanceRequestFormV2
              onClose={() => setShowAttendanceRequest(false)}
            />
          </div>
        </div>
      )}
      {showOvertimeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <CreateOvertimeRequest
              onCancel={() => setShowOvertimeRequest(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
  const currentPathSegment = location.pathname.split("/")[location.pathname.split("/").length - 1];
  const isOvertimePage = currentPathSegment === "my-overtime-requests" || currentPathSegment === "team-overtime-requests";
  // Actions Button Component for Second Top Bar
  const ActionsButton = () => {
    return (
      <div className="relative" ref={actionsDropdownRef}>
        <Button
          // onClick={() => setShowActionsDropdown(!showActionsDropdown)}
          onClick={() => {
            if (isOvertimePage && plannedOvertimAllowed) {
              setShowOvertimeRequest(true);
            } else {
              setShowAttendanceRequest(true);
            }
          }}
          size="lg"
          bgColor="blue-600"
          className="hover:bg-blue-700"
        >
          {isOvertimePage && plannedOvertimAllowed ? "+ Overtime" : "+ Regularize"}
          {/* <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              showActionsDropdown ? "rotate-180" : ""
            }`}
          /> */}
        </Button>

        {/* Actions Dropdown - Positioned to the top of the button */}
        {/* {showActionsDropdown && (
          <div className="absolute right-0 bottom-full mb-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-3 z-50 backdrop-blur-sm">
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
              {plannedOvertimAllowed ? (
                <button
                  onClick={() => {
                    setShowOvertimeRequest(true);
                    setShowActionsDropdown(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 w-full text-left transition-colors group"
                >
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Planned Overtime Request
                    </p>
                  </div>
                </button>
              ) : null}
            </div>
          </div>
        )} */}

      </div>
    );
  };
  // Create the action button for desktop - positioned bottom-right by DesktopLayoutWrapper
  // Hide the button when sidebar is actually open (which has its own sidebar button)
  const shouldShowActionButton = !isSidebarOpen;
  const actionButton = shouldShowActionButton ? <ActionsButton /> : null;

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
              <AttendanceRequestFormV2
                onClose={() => setShowAttendanceRequest(false)}
              />
            </div>
          </div>
        )}
        {showOvertimeRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <CreateOvertimeRequest
                onCancel={() => setShowOvertimeRequest(false)}
              />
            </div>
          </div>
        )}
      </div>
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

const AttendanceLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <AttendanceLayoutContent />
    </SidebarProvider>
  );
};

export default AttendanceLayout;
