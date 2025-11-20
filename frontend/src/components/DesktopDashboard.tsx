/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Calendar,
  Clock,
  FileText,
  User,
  HelpCircle,
  CheckCircle,
  XCircle,
  LogOut,
  Search,
  ChevronDown,
  Headset,
  Timer,
  ArrowUpDown,
  Dock,
  RotateCcwKey,
} from "lucide-react";
import {
  useCanShowClockIn,
  useClockInOutService,
  useGetEmployeeShift,
  useHomeSummaryDetails,
} from "../hooks/useAttendance";
import { useCurrentEmployeeAllDetails } from "../hooks/useEmployee";
import { useLoggedInUser } from "../hooks/useLoggedInUser";
import { formatTimeSafe, formatTo24HourTime } from "../utils/helperUtils";
import {
  compareAsc,
  compareDesc,
  differenceInMinutes,
  endOfDay,
  format,
  parseISO,
  startOfDay,
} from "date-fns";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CollapsibleSidebar from "./shared/CollapsibleSidebar";
import NotificationBell from "./Notification/NotificationBell";
import defaultProfile from "../assets/face-rec.png";
import { useEmployeeWithFallback } from "../hooks/useEmployeeWithFallback";
import EmployeeFallback from "./EmployeeFallback";
import TasksAwaiting from "./DashboardComponent/TasksAwaiting";
import MicroAppInDashboard from "./DashboardComponent/MicroAppInDashboard";
import { toast } from "react-hot-toast";
import { LeaveRequestRefreshProvider } from "./Leaves/LeaveRequestRefreshContext";
import { RequestLeaveModalProvider } from "./Leaves/RequestLeaveModalContext";
import LeaveRequest from "./Attendance/LeaveRequest";
import CreateOvertimeRequest from "./Attendance/OvertimeRequests/CreateOvertimeRequest";
import ExpenseFormModal from "./Expenses-App/ExpenseFormModal";
import ShiftRequestFormModal from "./ShiftRequest/ShiftRequestFormModal";
import useCurrentUser from "../hooks/useCurrentUser";
import useLogout from "../hooks/useLogout";
import { useRequestPasswordReset } from "../hooks/useResetPassword";
import AttendanceRequestFormV2 from "./Attendance/AttendanceRequest/AttendanceRequestFormV2";
import { errorResponseFormater } from "../utils/errorResponseFormater";

export default function DesktopDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const navigate = useNavigate();
  const { mutateAsync: logout } = useLogout();
  const employeeState = useEmployeeWithFallback();
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const [showAttendanceRequest, setShowAttendanceRequest] = useState(false);
  const [showLeaveRequest, setShowLeaveRequest] = useState(false);
  const [showOvertimeRequest, setShowOvertimeRequest] = useState(false);
  const [showShiftRequestModal, setShowShiftRequestModal] = useState(false);
  const handleCloseShiftModal = () => {
    setShowShiftRequestModal(false);
  };

  const handleShiftForm = () => {
    setShowShiftRequestModal(true);
  };

  const { data: userId } = useLoggedInUser();
  const { data: currentEmployee, isLoading: currentEmpIsLoading } =
    useCurrentEmployeeAllDetails(userId || "");

    
  const { data: employeeShift } = useGetEmployeeShift(
    currentEmployee?.user_id || ""
  );
  //reset password logic ends here
  const loginUserEmail = userId || "";
  const mutation = useRequestPasswordReset();
  const handleReset = () => {
    const email = loginUserEmail; // can be replaced with logged-in user's email
    mutation.mutate(email, {
      onSuccess: (data) => {
        toast.success("Password reset email sent successfully!");
        console.log("Response:", data);
      },
      onError: (error: any) => {
         const formatedError = errorResponseFormater(error, "Failed to send password reset email!");
         toast.error(formatedError);
      },
    });
  };

  const start = format(startOfDay(new Date()), "yyyy-MM-dd HH:mm:ss");
  const end = format(endOfDay(new Date()), "yyyy-MM-dd HH:mm:ss");
  const filters = {
    time: ["between", [start, end]],
  };
  const encodedFilters = encodeURIComponent(JSON.stringify(filters));
  const {
    data: homeSummary,
    refetch: refetchHomeSummary,
    isRefetching,
  } = useHomeSummaryDetails(currentEmployee?.user_id || "", encodedFilters);
     const { data: canShowClockIn } = useCanShowClockIn(
        currentEmployee?.user_id ? { user: currentEmployee.user_id } : {}
      );
          const { mutate: clockInCheckOutMutation, isPending: clockInCheckOutPending } =
            useClockInOutService();

  const checkIns = homeSummary?.filter((log) => log.log_type === "IN") ?? [];
  const checkOuts = homeSummary?.filter((log) => log.log_type === "OUT") ?? [];
  const firstCheckIn = checkIns.length
    ? checkIns.sort((a, b) =>
        compareAsc(
          parseISO(a.time.replace(" ", "T")),
          parseISO(b.time.replace(" ", "T"))
        )
      )[0]
    : undefined;
  const lastCheckOut = checkOuts.length
    ? checkOuts.sort((a, b) =>
        compareDesc(
          parseISO(a.time.replace(" ", "T")),
          parseISO(b.time.replace(" ", "T"))
        )
      )[0]
    : undefined;

  const lastLog =
    homeSummary && homeSummary.length > 0
      ? [...homeSummary].sort((a, b) =>
          compareDesc(
            parseISO(a.time.replace(" ", "T")),
            parseISO(b.time.replace(" ", "T"))
          )
        )[0]
      : undefined;

  const isCurrentlyCheckedIn = lastLog?.log_type === "IN";
  const { data: currentUser } = useCurrentUser();

  const logoutHandler = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setShowProfileDropdown(false);
      }
    };

    if (showProfileDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileDropdown]);

  const getTotalTime = () => {
    if (!homeSummary || homeSummary.length === 0) {
      return "00:00";
    }

    // Calculate total worked time by pairing check-ins and check-outs
    let totalMinutes = 0;
    const sortedLogs = [...homeSummary].sort((a, b) =>
      compareAsc(
        parseISO(a.time.replace(" ", "T")),
        parseISO(b.time.replace(" ", "T"))
      )
    );

    let currentCheckIn: (typeof sortedLogs)[0] | null = null;

    for (const log of sortedLogs) {
      if (log.log_type === "IN") {
        currentCheckIn = log;
      } else if (log.log_type === "OUT" && currentCheckIn) {
        // Calculate time between check-in and check-out
        const checkInTime = parseISO(currentCheckIn.time.replace(" ", "T"));
        const checkOutTime = parseISO(log.time.replace(" ", "T"));
        totalMinutes += differenceInMinutes(checkOutTime, checkInTime);
        currentCheckIn = null;
      }
    }

  
  
    // If still checked in, add time from last check-in to now
    if (currentCheckIn && isCurrentlyCheckedIn) {
      const checkInTime = parseISO(currentCheckIn.time.replace(" ", "T"));
      totalMinutes += differenceInMinutes(currentTime, checkInTime);
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };
  //checking checkout 
 

  const handleClockInOut = (type: string) => {
    if (type === "clockIn") {
      clockInCheckOutMutation(
        {
          employee: currentEmployee?.employee,
          shift: employeeShift?.shift,
          action: "Clock In",
        },
        {
          onSuccess: () => {
            refetchHomeSummary();
            toast.success("Successfully clocked in!");
          },
          onError: (e: CustomError) => {
            toast.error(
              e?.response?.data?.message?.error || "Error while Clocking in"
            );
          },
        }
      );
    } else {
      clockInCheckOutMutation(
        {
          employee: currentEmployee?.employee,
          shift: employeeShift?.shift,
          action: "Clock Out",
        },
        {
          onSuccess: () => {
            refetchHomeSummary();
            toast.success("Successfully clocked out!");
          },
          onError: (e: CustomError) => {
            toast.error(
              e?.response?.data?.message?.error || "Error while Clocking out"
            );
          },
        }
      );
    }
  };

  const getWorkPercentage = () => {
    if (!firstCheckIn || !firstCheckIn.shift_start || !firstCheckIn.shift_end) {
      return 0;
    }

    // Calculate total worked time in minutes
    let totalWorkedMinutes = 0;

    if (homeSummary && homeSummary.length > 0) {
      const sortedLogs = [...homeSummary].sort((a, b) =>
        compareAsc(
          parseISO(a.time.replace(" ", "T")),
          parseISO(b.time.replace(" ", "T"))
        )
      );

      let currentCheckIn: (typeof sortedLogs)[0] | null = null;

      for (const log of sortedLogs) {
        if (log.log_type === "IN") {
          currentCheckIn = log;
        } else if (log.log_type === "OUT" && currentCheckIn) {
          const checkInTime = parseISO(currentCheckIn.time.replace(" ", "T"));
          const checkOutTime = parseISO(log.time.replace(" ", "T"));
          totalWorkedMinutes += differenceInMinutes(checkOutTime, checkInTime);
          currentCheckIn = null;
        }
      }

      // If still checked in, add time from last check-in to now
      if (currentCheckIn && isCurrentlyCheckedIn) {
        const checkInTime = parseISO(currentCheckIn.time.replace(" ", "T"));
        totalWorkedMinutes += differenceInMinutes(currentTime, checkInTime);
      }
    }

    // Calculate expected shift duration
    const shiftStart = parseISO(firstCheckIn.shift_start.replace(" ", "T"));
    const shiftEnd = parseISO(firstCheckIn.shift_end.replace(" ", "T"));
    const totalShiftMinutes = differenceInMinutes(shiftEnd, shiftStart);

    if (totalShiftMinutes <= 0) {
      return 0;
    }

    // Calculate percentage, but cap at 100%
    const percentage = Math.round(
      (totalWorkedMinutes / totalShiftMinutes) * 100
    );
    return Math.min(percentage, 100);
  };

  const handleTodoClick = () => {
    window.location.href = "/app/task_manager";
  };

  const handleHelpDeskClick = () => {
    window.location.href = "/helpdesk/my-tickets";
  };

  const contentMarginLeft = isSidebarExpanded ? "ml-64" : "ml-20";

  const canRedirectToDesk = currentUser?.roles?.some((role) =>
    ["System User", "Payroll Manager", "System Manager"].includes(role.role)
  );

  const currentUserIsAdmin = currentUser?.roles?.some(role => "Administrator"==role.role);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Collapsible Sidebar */}
      <CollapsibleSidebar
        isExpanded={isSidebarExpanded}
        setIsExpanded={setIsSidebarExpanded}
      />

      {/* Main Content */}
      <div
        className={`flex-1 ${contentMarginLeft} flex flex-col min-h-screen transition-all duration-300 ease-in-out`}
      >
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-2 flex items-center justify-between sticky top-0 z-10 flex-shrink-0">
          <div>
            {(currentEmployee?.employee_name || currentUserIsAdmin) ?
            <>
              <h1 className="text-xl font-bold text-gray-900">
                  Welcome, {currentEmployee?.employee_name || currentUser?.username}!
              </h1>
              <p className="text-xs text-gray-600">
                Here's your dashboard for today.
              </p>
            </>
            :   <>
                <div className="w-52 h-6 my-2 rounded-lg bg-gray-300 animate-pulse"></div>
                <div className="w-32 h-4 my-1 rounded-lg bg-gray-300 animate-pulse"></div>
                </>
            }
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search members..."
              onClick={() => navigate("/webapp/search-members")}
              className="w-full pl-10 pr-4 py-2 min-w-[28rem] cursor-pointer bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-800 placeholder-gray-500"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/webapp/notification-log")}
              className="relative p-2 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <NotificationBell />
            </button>
            
            <div className="relative" ref={profileDropdownRef}>
              {currentUserIsAdmin ? 
               <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 text-right">
                      {currentUser?.username}
                    </p>
                    <p className="text-xs text-gray-500 text-right">
                      Employee ID: {currentEmployee?.employee}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-300">
                    <img
                      src={currentUser?.user_image || defaultProfile}
                      alt="User avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${
                      showProfileDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>:
              (currentEmpIsLoading || !currentEmployee ? (
                <div className="flex w-30 animate-pulse gap-2 items-center">
                  <div className="h-4 bg-gray-300 rounded w-20  flex-1"></div>
                  <div className="h-6 w-6 bg-gray-300 rounded-full "></div>
                </div>
              ) : (
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-3 hover:bg-blue-50 rounded-lg p-2 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 text-right">
                      {currentEmployee?.employee_name}
                    </p>
                    <p className="text-xs text-gray-500 text-right">
                      Employee ID: {currentEmployee?.employee}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-300">
                    <img
                      src={currentEmployee?.image || defaultProfile}
                      alt="User avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${
                      showProfileDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>
              ))}

              {/* Profile Dropdown */}
              {showProfileDropdown && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      {/* Profile Image */}
                      <div className="w-16 h-16 flex-shrink-0 rounded-full overflow-hidden border border-gray-300">
                        <img
                          src={currentEmployee?.image || defaultProfile}
                          alt="User avatar"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Text Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900">
                          {currentEmployee?.employee_name || "Temp User"}
                        </h3>
                        <p className="text-sm text-gray-600 break-words whitespace-normal max-w-xs">
                          {currentEmployee?.custom_designation_name ||
                            "Temp Designation"}
                        </p>
                        <p className="text-xs text-gray-500">
                          Employee ID: {currentEmployee?.employee || "N/A"}
                        </p>
                        <p className="text-xs text-gray-500 break-words whitespace-normal max-w-xs">
                          {currentEmployee?.company_email ||
                            currentEmployee?.personal_email ||
                            "Temp Email"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="py-2">
                    <div className="px-4 py-2">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Company Information
                      </h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Department:</span>
                          <span className="text-gray-900">
                            {currentEmployee?.department || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Company:</span>
                          <span className="text-gray-900">
                            {currentEmployee?.company || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Join Date:</span>
                          <span className="text-gray-900">
                            {currentEmployee?.date_of_joining || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className="text-green-600 font-medium">
                            {currentEmployee?.status || "Active"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <hr className="my-2 border-gray-100" />

                    <button
                      onClick={() => {
                        const employeeId = currentEmployee?.employee;
                        if (employeeId) {
                          navigate(`/webapp/employee-profile/${employeeId}`);
                        }
                        setShowProfileDropdown(false);
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 w-full text-left"
                    >
                      <User className="w-4 h-4" />
                      View Full Profile
                    </button>

                    {canRedirectToDesk && (
                      <button
                        onClick={() => {
                          window.location.href = "/app/home";
                        }}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 w-full text-left"
                      >
                        <Dock className="w-4 h-4" />
                        Switch to Desk
                      </button>
                    )}
                    <button
                      onClick={handleReset}
                      disabled={mutation.isPending}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 w-full text-left"
                    >
                      {mutation.isPending ? (
                        "Sending..."
                      ) : (
                        <>
                          <RotateCcwKey className="w-4 h-4" />
                          Reset Password
                        </>
                      )}
                    </button>
                    <hr className="my-2 border-gray-100" />
                    <button
                      onClick={async () => {
                        await logoutHandler();
                        setShowProfileDropdown(false);
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="p-4 flex-1">
          {/* Employee Data Error Handling */}
          {!employeeState.isLoading && !employeeState.hasValidData && (
            <EmployeeFallback
              message={
                employeeState.hasEmployeeRecord
                  ? "Employee data is incomplete. Please contact HR."
                  : "No employee record found. Please contact HR to set up your profile."
              }
              variant="banner"
              showRetry={employeeState.canRetry}
              onRetry={employeeState.retry}
            />
          )}

          {/* Hero Banner */}
          <div className="bg-blue-200 mb-2 to-teal-500 rounded-lg p-6 text-gray-800 relative overflow-hidden">
            <div className="relative z-0">
              <h2 className="text-xl font-bold mb-2">Keep Up the Rhythm!</h2>
              <p className="text-gray-500">
                Your contributions are making the day amazing!
              </p>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {/* Tasks Awaiting */}
            <TasksAwaiting />
            {/* Announcements */}
            <div className="bg-white rounded-lg mb-2 p-6 shadow-sm">
              <div className="text-center">
                <p className="section-title mb-2 text-left">
                  Total hours worked
                </p>
                <p className="text-xl font-bold mb-1">{getTotalTime()}</p>
                <p className="text-blue-600 text-sm mb-6">8h 30m target</p>

                {/* Enhanced Progress Bar */}
                <div className="relative px-4 mb-3">
                  <div className="bg-blue-200 h-3 shadow-inner rounded-lg">
                    <div
                      className="bg-blue-700 h-3 transition-all duration-700 ease-out shadow-sm rounded-lg"
                      style={{
                        width: `${Math.min(getWorkPercentage(), 100)}%`,
                      }}
                    ></div>
                  </div>
                  {/* Progress indicator dots */}
                  <div className="absolute top-1/2 left-0 w-full h-0.5 flex justify-between px-1 -translate-y-px">
                    <div className="w-0.5 h-0.5 bg-blue-300 opacity-60"></div>
                    <div className="w-0.5 h-0.5 bg-blue-300 opacity-60"></div>
                    <div className="w-0.5 h-0.5 bg-blue-300 opacity-60"></div>
                    <div className="w-0.5 h-0.5 bg-blue-300 opacity-60"></div>
                  </div>
                </div>
                <p className="text-blue-600 text-sm font-medium">
                  {getWorkPercentage()}% completed
                </p>
              </div>
              <h3 className="section-title mb-4">Daily Timings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 tracking-wide">
                        SHIFT START
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-blue-600">
                        {employeeShift?.start_time
                          ? formatTimeSafe(employeeShift?.start_time)
                          : "--:--"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 tracking-wide">
                        IN TIME
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-green-600">
                        {firstCheckIn?.time
                          ? formatTo24HourTime(firstCheckIn.time)
                          : "--:--"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 tracking-wide">
                        SHIFT END
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-blue-600">
                        {employeeShift?.end_time
                          ? formatTimeSafe(employeeShift?.end_time)
                          : "--:--"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                      <XCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 tracking-wide">
                        OUT TIME
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-red-600">
                        {lastCheckOut?.time
                          ? formatTo24HourTime(lastCheckOut.time)
                          : "--:--"}
                      </p>
                    </div>
                  </div>
                </div>
             
              </div>
                 {/* checking checkout */}
                 <div className="flex flex-row gap-4 mt-4">
                    <div className="flex w-full gap-4">
                
  
                      {canShowClockIn?.can_show && (
                        <button
                          onClick={() =>
                            handleClockInOut(
                              isCurrentlyCheckedIn ? "clockOut" : "clockIn"
                            )
                          }
                          className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                          disabled={
                            clockInCheckOutPending ||
                            !employeeShift?.shift ||
                            isRefetching
                          }
                        >
                          {clockInCheckOutPending || isRefetching ? (
                            <span className="flex items-center justify-center">
                              <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5 mr-2"></span>
                              Processing...
                            </span>
                          ) : isCurrentlyCheckedIn ? (
                            "Clock Out"
                          ) : (
                            "Clock In"
                          )}
                        </button>
                      )}
                    </div>
                    {/* Current Status Indicator */}
                    <div className="flex items-center justify-center w-full gap-2 text-sm bg-red-100 rounded py-1">
                      
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isCurrentlyCheckedIn ? "bg-green-500" : "bg-red-500"
                        }`}
                      ></div>
                      <span
                        className={
                          isCurrentlyCheckedIn ? "text-green-600" : "text-red-600 "
                        }
                      >
                        Currently{" "}
                        {isCurrentlyCheckedIn ? "Checked In" : "Checked Out"}
                      </span>
                    </div>
                  </div>
            </div>
          </div>

          {/* Second Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 mb-2 gap-2">
            <div className="grid grid-cols-1 gap-2">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-center">
                  <h3 className="section-title mb-2 text-left">
                    Announcements
                  </h3>
                  <div className="text-gray-500">Coming Soon...</div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="section-title mb-4">Helpdesk / Todo's</h3>
                <div className="flex flex-row w-full gap-4">
                  <div className="flex w-full flex-col gap-2 bg-gray-100 p-2 rounded-lg hover:bg-gray-200 ">
                    <div className="bg-blue-200 w-full p-2 rounded-lg ">
                      <button
                        onClick={handleHelpDeskClick}
                        className="flex items-center w-full justify-center gap-2 text-white px-4 py-2 rounded-lg  text-sm"
                      >
                        <Headset className="w-4 h-4 text-blue-800" />
                      </button>
                    </div>
                    <div className="text-sm text-gray-800 font-medium text-center">
                      Helpdesk
                    </div>
                  </div>

                  {/*todo*/}
                  <div className="flex w-full flex-col gap-2 bg-gray-100 p-2 rounded-lg hover:bg-gray-200 ">
                    <div className="bg-green-200 p-2 items-center justify-center rounded-lg ">
                      <button
                        onClick={handleTodoClick}
                        className="flex items-center w-full justify-center gap-2 text-white px-4 py-2 rounded-lg  text-sm"
                      >
                        <HelpCircle className="w-4 h-4 text-green-800" />
                      </button>
                    </div>
                    <div className="text-sm text-gray-600 font-medium text-center">
                      ToDo List
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Requests Cards*/}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="section-title">Requests</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div
                  className="text-center bg-gray-100 p-6 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                  onClick={() => {
                    setShowLeaveRequest(true);
                  }}
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-600 font-medium">
                    Apply Leave
                  </p>
                </div>

                <div
                  className="text-center bg-gray-100 p-6 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                  onClick={() => {
                    setShowAttendanceRequest(true);
                  }}
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-600 font-medium">
                    Attendance Request
                  </p>
                </div>

                <div
                  className="text-center bg-gray-100 p-6 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                  onClick={() => {
                    setShowOvertimeRequest(true);
                  }}
                >
                  <div className="w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                    <Timer className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="text-sm text-gray-600 font-medium">
                    Planned Overtime Request
                  </p>
                </div>
                <div
                  className="text-center bg-gray-100 p-6 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                  onClick={handleShiftForm}
                >
                  <div className="w-12 h-12 bg-green-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                    <ArrowUpDown className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600 font-medium">
                    Request Shift Change
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* Admin Apps */}
          <MicroAppInDashboard />
        </div>
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
      {showOvertimeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <CreateOvertimeRequest
              onCancel={() => setShowOvertimeRequest(false)}
            />
          </div>
        </div>
      )}
      <ExpenseFormModal
        isOpen={showShiftRequestModal}
        onClose={handleCloseShiftModal}
        title="Request Shift Change"
      >
        <ShiftRequestFormModal onClose={handleCloseShiftModal} />
      </ExpenseFormModal>
    </div>
  );
}
