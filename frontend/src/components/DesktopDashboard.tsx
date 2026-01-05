/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Calendar,
  FileText,
  User,
  CheckCircle,
  XCircle,
  LogOut,
  ChevronDown,
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
import { CustomError } from "../types/attendance";
import ViewingAsBanner from "./ViewingAsBanner";
import { useTargetUser } from "../context/ViewedUserContext";
import Carousel, { CarouselSlide } from "./shared/molecules/Carousel";
import { useGetUserNotices } from "../hooks/useNotices";
import { NoticeSlide } from "./shared/molecules/NoticeSlide";
import SearchMembers from "./shared/SearchMembers";
import Button from "./shared/atoms/Button";
import { Typography } from "./shared/atoms/Typography";
import { Card } from "./shared/atoms/Card";
import Events from "./Events/Events";
import MicroAppInDashboard from "./DashboardComponent/MicroAppInDashboard";

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
  const { clearTargetEmployee } = useTargetUser();

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
  const loginUserEmail = userId || "";
  const mutation = useRequestPasswordReset();
  const handleReset = () => {
    const email = loginUserEmail;
    mutation.mutate(email, {
      onSuccess: () => {
        toast.success("Password reset email sent successfully!");
      },
      onError: (error: any) => {
        const formatedError = errorResponseFormater(
          error,
          "Failed to send password reset email!"
        );
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
  // const { data: notices, isLoading: noticeIsLoading } = useGetAllNotices(5, [
  //   ["status", "!=", "Expired"],
  // ]);
  const { data: userNotices, isLoading: userNoticeIsLoading } =
    useGetUserNotices();

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
        const checkInTime = parseISO(currentCheckIn.time.replace(" ", "T"));
        const checkOutTime = parseISO(log.time.replace(" ", "T"));
        totalMinutes += differenceInMinutes(checkOutTime, checkInTime);
        currentCheckIn = null;
      }
    }

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

      if (currentCheckIn && isCurrentlyCheckedIn) {
        const checkInTime = parseISO(currentCheckIn.time.replace(" ", "T"));
        totalWorkedMinutes += differenceInMinutes(currentTime, checkInTime);
      }
    }

    const shiftStart = parseISO(firstCheckIn.shift_start.replace(" ", "T"));
    const shiftEnd = parseISO(firstCheckIn.shift_end.replace(" ", "T"));
    const totalShiftMinutes = differenceInMinutes(shiftEnd, shiftStart);

    if (totalShiftMinutes <= 0) {
      return 0;
    }

    const percentage = Math.round(
      (totalWorkedMinutes / totalShiftMinutes) * 100
    );
    return Math.min(percentage, 100);
  };

  // const handleTodoClick = () => {
  //   window.location.href = "/app/task_manager";
  // };

  // const handleHelpDeskClick = () => {
  //   window.location.href = "/helpdesk/my-tickets";
  // };

  const contentMarginLeft = isSidebarExpanded ? "ml-64" : "ml-20";

  const canRedirectToDesk = currentUser?.roles?.some((role) =>
    ["System User", "Payroll Manager", "System Manager"].includes(role.role)
  );

  const currentUserIsAdmin = currentUser?.roles?.some(
    (role) => "Administrator" === role.role
  );

  return (
    <div className="min-h-screen flex">
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
        <div
          className="bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600
  border-b border-gray-200 px-6 py-4
  flex items-center sticky top-0 z-10 gap-4"
        >
          <div className="flex flex-col min-w-0">
            {currentEmployee?.employee_name || currentUserIsAdmin ? (
              <>
                <Typography variant="h3" component="h1" color="white" className="font-bold">
                  Welcome,{" "}
                  {currentEmployee?.employee_name || currentUser?.username}!
                </Typography>
                <Typography variant="label" color="white" className="opacity-90">
                  Here's your dashboard for today.
                </Typography>
              </>
            ) : (
              <>
                <div className="w-52 h-5 my-2 rounded-lg bg-gray-300 animate-pulse"></div>
                <div className="w-32 h-4 my-1 rounded-lg bg-gray-300 animate-pulse"></div>
              </>
            )}
          </div>
          <div className="flex-1 min-w-0 flex justify-center">
            <SearchMembers />
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            <button
              onClick={() => navigate("/webapp/notification-log")}
              className="relative p-2 hover:bg-primary-400/20 rounded-lg transition-colors"
            >
              <NotificationBell />
            </button>

            <div className="relative" ref={profileDropdownRef}>
              {currentUserIsAdmin ? (
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-3 hover:bg-blue-500 rounded-lg p-2 transition-colors"
                >
                  <div className="text-right">
                    <Typography variant="bodyMedium" color="white" className="block outline-none">
                      {currentUser?.username}
                    </Typography>
                    <Typography variant="label" color="white" className="opacity-80 block">
                      Employee ID: {currentEmployee?.employee}
                    </Typography>
                  </div>
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20">
                    <img
                      src={currentUser?.user_image || defaultProfile}
                      alt="User avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-white transition-transform ${showProfileDropdown ? "rotate-180" : ""
                      }`}
                  />
                </button>
              ) : currentEmpIsLoading || !currentEmployee ? (
                <div className="flex w-30 animate-pulse gap-2 items-center">
                  <div className="h-4 bg-gray-300 rounded w-20  flex-1"></div>
                  <div className="h-6 w-6 bg-gray-300 rounded-full "></div>
                </div>
              ) : (
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-3 hover:bg-primary-400/20 rounded-lg p-2 transition-colors"
                >
                  <div className="text-right">
                    <Typography variant="bodyMedium" color="white" className="block outline-none">
                      {currentEmployee?.employee_name}
                    </Typography>
                    <Typography variant="label" color="white" className="opacity-80 block">
                      Employee ID: {currentEmployee?.employee}
                    </Typography>
                  </div>
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20">
                    <img
                      src={currentEmployee?.image || defaultProfile}
                      alt="User avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-white transition-transform ${showProfileDropdown ? "rotate-180" : ""
                      }`}
                  />
                </button>
              )}

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
                      {/* Text Info */}
                      <div className="flex-1 min-w-0">
                        <Typography variant="subheading" color="title" className="truncate block">
                          {currentEmployee?.employee_name || "Temp User"}
                        </Typography>
                        <Typography variant="bodySmall" color="secondary" className="break-words block max-w-xs">
                          {currentEmployee?.custom_designation_name ||
                            "Temp Designation"}
                        </Typography>
                        <Typography variant="label" color="disabled" className="block mt-1">
                          Employee ID: {currentEmployee?.employee || "N/A"}
                        </Typography>
                        <Typography variant="bodySmall" color="secondary" className="break-words block max-w-xs mt-1">
                          {currentEmployee?.company_email ||
                            currentEmployee?.personal_email ||
                            "Temp Email"}
                        </Typography>
                      </div>
                    </div>
                  </div>


                  <div className="p-2">
                    <div className="px-4 py-2">
                      <Typography variant="label" color="disabled" className="uppercase tracking-wide mb-2 block">
                        Company Information
                      </Typography>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <Typography variant="bodySmall" color="secondary">Department:</Typography>
                          <Typography variant="bodySmall" color="title">
                            {currentEmployee?.department || "N/A"}
                          </Typography>
                        </div>
                        <div className="flex justify-between">
                          <Typography variant="bodySmall" color="secondary">Company:</Typography>
                          <Typography variant="bodySmall" color="title">
                            {currentEmployee?.company || "N/A"}
                          </Typography>
                        </div>
                        <div className="flex justify-between">
                          <Typography variant="bodySmall" color="secondary">Join Date:</Typography>
                          <Typography variant="bodySmall" color="title">
                            {currentEmployee?.date_of_joining || "N/A"}
                          </Typography>
                        </div>
                        <div className="flex justify-between">
                          <Typography variant="bodySmall" color="secondary">Status:</Typography>
                          <Typography variant="bodySmall" color="success" className="font-medium">
                            {currentEmployee?.status || "Active"}
                          </Typography>
                        </div>
                      </div>
                    </div>

                    <hr className="my-2 border-gray-100" />

                    <Button
                      variant="subtle"
                      size="md"
                      fullWidth
                      contentAlign="start"
                      onClick={() => {
                        clearTargetEmployee();
                        navigate(`/webapp/employee-profile`);
                        setShowProfileDropdown(false);
                      }}
                      className="justify-start gap-3 px-4 font-normal"
                    >
                      <User className="w-4 h-4" />
                      View Full Profile
                    </Button>

                    {canRedirectToDesk && (
                      <Button
                        variant="subtle"
                        size="md"
                        fullWidth
                        contentAlign="start"
                        onClick={() => {
                          window.location.href = "/app/home";
                        }}
                        className="justify-start gap-3 px-4 font-normal"
                      >
                        <Dock className="w-4 h-4" />
                        Switch to Admin
                      </Button>
                    )}
                    <Button
                      variant="subtle"
                      size="md"
                      fullWidth
                      contentAlign="start"
                      onClick={handleReset}
                      disabled={mutation.isPending}
                      className="justify-start gap-3 px-4 font-normal"
                    >
                      {mutation.isPending ? (
                        "Sending..."
                      ) : (
                        <>
                          <RotateCcwKey className="w-4 h-4" />
                          Reset Password
                        </>
                      )}
                    </Button>
                    <hr className="my-2 border-gray-100" />
                    <Button
                      variant="subtle"
                      size="md"
                      fullWidth
                      contentAlign="start"
                      bgColor="error"
                      onClick={async () => {
                        await logoutHandler();
                        setShowProfileDropdown(false);
                      }}
                      className="justify-start gap-3 px-4 font-normal"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <ViewingAsBanner />

        <div className="p-6 flex-1 overflow-auto bg-app">
          <div className="max-w-full">
            {/* Employee Error Section */}
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
            <div className=" w-full max-w-full overflow-hidden bg-white mb-2">
              {!userNoticeIsLoading &&
                userNotices &&
                userNotices?.length > 0 && (
                  <Carousel
                    className="w-full h-full max-h-[150px]"
                    showNavigation={false}
                  >
                    {userNotices?.map((item) => (
                      <CarouselSlide
                        key={item.name}
                        autoScrollDelay={item.auto_scroll_frequency * 1000}
                      >
                        <NoticeSlide data={item} />
                      </CarouselSlide>
                    ))}
                  </Carousel>
                )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-stretch">
            {/* Row 1: Tasks Awaiting (8) | Clocking (4) */}
            <div className="lg:col-span-8">
              <TasksAwaiting />
            </div>

            <div className="lg:col-span-4">
              <Card shadow="sm" className="h-full flex flex-col gap-6">
                <div>
                  <Typography variant="subheading" className="mb-4 text-left block">
                    Total hours worked
                  </Typography>
                  <div className="flex items-center justify-between w-full mb-3">
                    <Typography variant="bodySmall" color="primary" className="font-semibold uppercase tracking-wider">
                      8h 30m target
                    </Typography>
                    <div className="flex items-center gap-3">
                      <Typography variant="bodyMedium" className="font-bold">
                        {getTotalTime()}
                      </Typography>
                      <div className="h-4 w-px bg-gray-200" />
                      <Typography variant="bodySmall" className="font-bold">
                        {getWorkPercentage()}%
                      </Typography>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative mb-2">
                    <div className="bg-primary-50 h-3 rounded-lg overflow-hidden p-[1px]">
                      <div
                        className="bg-primary-700 h-full rounded-lg transition-all duration-700 ease-out shadow-sm"
                        style={{
                          width: `${Math.min(getWorkPercentage(), 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between w-full mb-2">
                    <div>
                      <Typography variant="subheading" color="title" className="block mb-1">
                        Daily Timings
                      </Typography>
                      <Typography variant="bodySmall" className="flex items-center gap-1.5">
                        <Timer className="w-3.5 h-3.5 text-gray-400" />
                        Shift: {employeeShift?.start_time
                          ? formatTimeSafe(employeeShift.start_time)
                          : "--:--"} - {employeeShift?.end_time
                            ? formatTimeSafe(employeeShift.end_time)
                            : "--:--"}
                      </Typography>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* IN TIME */}
                    <div className="bg-success-50/50 p-4 rounded-xl border border-success-100/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-success" />
                        </div>
                        <div>
                          <Typography variant="label" color="disabled" className="font-bold text-[10px]">
                            IN TIME
                          </Typography>
                          <Typography variant="bodyMedium" className="font-bold text-success">
                            {firstCheckIn?.time
                              ? formatTo24HourTime(firstCheckIn.time)
                              : "--:--"}
                          </Typography>
                        </div>
                      </div>
                    </div>

                    {/* OUT TIME */}
                    <div className="bg-error-50/50 p-4 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-error/10 rounded-xl flex items-center justify-center">
                          <XCircle className="w-5 h-5 text-error" />
                        </div>
                        <div>
                          <Typography variant="label" color="disabled" className="font-bold text-[10px]">
                            OUT TIME
                          </Typography>
                          <Typography variant="bodyMedium" className="font-bold text-error">
                            {lastCheckOut?.time
                              ? formatTo24HourTime(lastCheckOut.time)
                              : "--:--"}
                          </Typography>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`flex  h-full ${homeSummary && !homeSummary?.length
                    ? "flex-col-reverse gap-3"
                    : "flex-row gap-3 mt-2"
                    }`}
                >
                  {canShowClockIn?.can_show && (
                    <div className="flex-1">
                      <Button
                        fullWidth
                        className="h-full"
                        size="lg"
                        bgColor={isCurrentlyCheckedIn ? "primary" : "success"}
                        onClick={() =>
                          handleClockInOut(
                            isCurrentlyCheckedIn ? "clockOut" : "clockIn"
                          )
                        }
                        disabled={
                          clockInCheckOutPending ||
                          !employeeShift?.shift ||
                          isRefetching
                        }
                      >
                        {clockInCheckOutPending || isRefetching
                          ? "Processing…"
                          : isCurrentlyCheckedIn
                            ? "Clock Out"
                            : "Clock In"}
                      </Button>
                    </div>
                  )}

                  {/* Status */}
                  {homeSummary && homeSummary?.length > 0 ? (
                    <div
                      className={`flex-1 flex rounded-xl items-center justify-center gap-2 px-3 py-2 transition-colors ${isCurrentlyCheckedIn
                        ? "bg-success-50/50 border-success-100 text-success"
                        : "bg-error-50/50 border-error-100 text-error"
                        }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full animate-pulse ${isCurrentlyCheckedIn ? "bg-success text-success" : "bg-error text-error"
                          }`}
                      ></div>

                      <Typography variant="bodySmall" className="text-inherit">
                        {isCurrentlyCheckedIn ? "Checked In" : "Checked Out"}
                      </Typography>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary-50 text-primary-600 rounded-xl border border-primary-100">
                      <Typography variant="bodySmall" className="font-bold text-primary-600">
                        Let's Get Started
                      </Typography>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Row 2 & 3: MicroApps (8, span 2) | Events (4) + Requests (4) */}
            <div className="lg:col-span-8 lg:row-span-2">
              <MicroAppInDashboard />
            </div>

            <div className="lg:col-span-4">
              <Events />
            </div>

            <div className="lg:col-span-4">
              <Card shadow="sm" className="h-full">
                <div className="flex justify-between items-center mb-4 border-b pb-1">
                  <Typography variant="subheading" color="title">Requests</Typography>
                  <Button
                    variant="subtle"
                    size="md"
                    onClick={() => {
                      navigate("/webapp/requests");
                    }}
                  >
                    View All
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    {
                      label: "Apply Leave",
                      icon: Calendar,
                      color: "primary",
                      onClick: () => setShowLeaveRequest(true)
                    },
                    {
                      label: "Attendance Request",
                      icon: FileText,
                      color: "secondary",
                      onClick: () => setShowAttendanceRequest(true)
                    },
                    {
                      label: "Planned Overtime",
                      icon: Timer,
                      color: "purple",
                      onClick: () => setShowOvertimeRequest(true)
                    },
                    {
                      label: "Shift Change",
                      icon: ArrowUpDown,
                      color: "success",
                      onClick: handleShiftForm
                    }
                  ].map((action, idx) => (
                    <div
                      key={idx}
                      className="group flex flex-col items-center justify-center p-4 rounded-xl  hover:bg-gray-50 transition-all cursor-pointer text-center"
                      onClick={action.onClick}
                    >
                      <div className={`w-12 h-12 mb-3 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${action.color === 'primary' ? 'bg-primary-100 text-primary-600' :
                        action.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                          'bg-success-100 text-success'
                        }`}>
                        <action.icon className="w-5 h-5 shadow-sm" />
                      </div>
                      <Typography variant="bodySmall" className="font-bold leading-tight line-clamp-2">
                        {action.label}
                      </Typography>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
      {
        showAttendanceRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <AttendanceRequestFormV2
                onClose={() => setShowAttendanceRequest(false)}
              />
            </div>
          </div>
        )
      }
      {
        showLeaveRequest && (
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
        )
      }
      {
        showOvertimeRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <CreateOvertimeRequest
                onCancel={() => setShowOvertimeRequest(false)}
              />
            </div>
          </div>
        )
      }
      <ExpenseFormModal
        isOpen={showShiftRequestModal}
        onClose={handleCloseShiftModal}
        title="Request Shift Change"
      >
        <ShiftRequestFormModal onClose={handleCloseShiftModal} />
      </ExpenseFormModal>
    </div >
  );
}
