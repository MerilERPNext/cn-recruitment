import React, { useEffect, useMemo, useState, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import NavigationTabs, { Tab } from "../NavigationTab";
import HeaderBar from "../HeaderBar";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize";
import CreateOvertimeRequest from "./OvertimeRequests/CreateOvertimeRequest";
import { SidebarProvider, useSidebar } from "./SidebarContext";
import AttendanceRequestFormV2 from "./AttendanceRequest/AttendanceRequestFormV2";
import Button from "../shared/atoms/Button";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { usePlannedOvertimeAllowed } from "../../hooks/useAttendance";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import { useTargetUser } from "../../context/ViewedUserContext";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { isActionEnabled } from "../../utils/uiPermission";

const AttendanceLayoutContent: React.FC = () => {
  const { targetEmployeeId } = useTargetUser();
  const { data: userId } = useLoggedInUser();
  const { isSidebarOpen } = useSidebar();

  const { data: user } = useCurrentEmployeeAllDetails(userId || "");

  const effectiveEmployeeId = targetEmployeeId || user?.employee;
  const { data: plannedOvertimAllowed } = usePlannedOvertimeAllowed(
    effectiveEmployeeId || "",
  );
  const { isDesktop } = useScreenSize();
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [showAttendanceRequest, setShowAttendanceRequest] = useState(false);
  const [showOvertimeRequest, setShowOvertimeRequest] = useState(false);
  const { data: userUiPermission } = useGetUiPermission("Attendance");
  const permittedPages = useMemo(() => {
    return (
      userUiPermission?.flatMap(
        (app) =>
          app.pages
            ?.filter((page) => page.enabled)
            ?.map((page) => page.page_name) || [],
      ) || []
    );
  }, [userUiPermission]);
  const canRequestAttendance = isActionEnabled(
    userUiPermission,
    "create_attendance_request",
    "Attendance Summary",
  );

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
    () => {
      if (permittedPages && permittedPages?.length > 0) {
        const tabList = [
          { label: "Attendance Summary", key: "summary", permissionKey: "Attendance Summary" },
          { label: "My Attendance", key: "calendar-views", permissionKey: "My Attendance" },
          { label: "Team Attendance", key: "team-attendance", permissionKey: "Team Attendance" },
          { label: "My Requests", key: "attendance-request", permissionKey: "My Requests" },
          { label: "Team Requests", key: "team-attendance-requests", permissionKey: "Team Requests" },
          { label: "Planned Overtime", key: "my-overtime-requests", permissionKey: "My Overtime" },
          { label: "Team Overtime", key: "team-overtime-requests", permissionKey: "Team Overtime" },
        ]
        // return tabList
        return tabList.filter((tab) => permittedPages?.includes(tab?.permissionKey))
      } else {
        return []
      }
    },
    [permittedPages],
  );

  const calendarSubTabs = useMemo(
    () => [{ label: "My Attendance Details", key: "emp-attendance" }],
    [],
  );

  const location = useLocation();
  const navigate = useNavigate();

  // Initialize state with default values
  const [activeTab, setActiveTab] = useState<Tab>(tabs[0] || { key: "", label: "" });
  const [activeSubTab, setActiveSubTab] = useState<string>("emp-attendance");

  useEffect(() => {
    const pathSegments = location.pathname.split("/");
    const lastSegment = pathSegments[pathSegments.length - 1];
    const isValidMainTab = tabs.some((tab) => tab.key === lastSegment);
    const isCalendarSubTab = calendarSubTabs.some(
      (subTab) => subTab.key === lastSegment,
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
    <div className="min-h-screen">
      {/* Fixed Header */}
      <HeaderBar title={activeTab?.label || "Attendance"} onBack={() => navigate("/webapp")} />
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
      <div className="p-2">
        <Outlet />
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
  const currentPathSegment =
    location.pathname.split("/")[location.pathname.split("/").length - 1];
  const isOvertimePage =
    currentPathSegment === "my-overtime-requests" ||
    currentPathSegment === "team-overtime-requests";
  // Actions Button Component for Second Top Bar
  const ActionsButton = () => {
    return (
      <div className="relative" ref={actionsDropdownRef}>
        {canRequestAttendance && (
          <Button
            // onClick={() => setShowActionsDropdown(!showActionsDropdown)}
            variant="contain"
            onClick={() => {
              if (isOvertimePage && plannedOvertimAllowed) {
                setShowOvertimeRequest(true);
              } else {
                setShowAttendanceRequest(true);
              }
            }}
            size="lg"
          >
            {isOvertimePage && plannedOvertimAllowed
              ? "+ Overtime"
              : "+ Attendance Request"}
            {/* <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              showActionsDropdown ? "rotate-180" : ""
            }`}
          /> */}
          </Button>
        )}
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
      <Outlet />
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
