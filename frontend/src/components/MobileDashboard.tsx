import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  ArrowUpDown,
  Receipt,
  Shield,
  Bell,
  CheckCircle,
  AlertCircle,
  User,
  DollarSign,
  XCircle,
  FileEdit,
  Timer,
  BanknoteX,
  Workflow,
  ChartNoAxesCombined,
} from "lucide-react";
import { useUnreadNoticesCount } from "../hooks/useNotices";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useCompanyLogo } from "../hooks/useCompanyLogo";
import {
  useCanShowClockIn,
  useCheckInOutService,
  useClockInOutService,
  useGetEmployeeShift,
  useGetQuickAttendanceSummary,
  useHomeSummaryDetails,
} from "../hooks/useAttendance";

import { useExpenseClaim } from "../hooks/useExpense";
import {
  Coordinates,
  formatDateString,
  formatTimeSafe,
  formatTo24HourTime,
  getDeviceLocation,
} from "../utils/helperUtils";
import defaultProfile from "../assets/face-rec.png";
import { useCurrentEmployeeAllDetails } from "../hooks/useEmployee";
import { useEmployeeWithFallback } from "../hooks/useEmployeeWithFallback";
import EmployeeFallback from "./EmployeeFallback";
import {
  compareAsc,
  compareDesc,
  differenceInMinutes,
  endOfDay,
  endOfMonth,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ViewAll } from "./shared/atoms/ViewAll";
import ViewingAsBanner from "./ViewingAsBanner";
import SearchMembers from "./shared/SearchMembers";

const statusStyles = {
  unpaid: {
    bg: "bg-yellow-50",
    border: "border-yellow-100",
    iconBg: "bg-yellow-200",
    iconText: "text-yellow-600",
    badgeBg: "bg-yellow-200",
    badgeText: "text-yellow-800",
    icon: <BanknoteX className="w-4 h-4 text-yellow-600" />,
  },
  draft: {
    bg: "bg-orange-50",
    border: "border-orange-100",
    iconBg: "bg-orange-200",
    iconText: "text-orange-600",
    badgeBg: "bg-orange-200",
    badgeText: "text-orange-800",
    icon: <FileEdit className="w-4 h-4 text-orange-600" />,
  },
  approved: {
    bg: "bg-green-100",
    border: "border-green-200",
    iconBg: "bg-green-200",
    iconText: "text-green-600",
    badgeBg: "bg-green-200",
    badgeText: "text-green-800",
    icon: <CheckCircle className="w-4 h-4 text-green-600" />,
  },
  rejected: {
    bg: "bg-red-50",
    border: "border-red-100",
    iconBg: "bg-red-100",
    iconText: "text-red-600",
    badgeBg: "bg-red-100",
    badgeText: "text-red-800",
    icon: <XCircle className="w-4 h-4 text-red-600" />,
  },
};

const MobileDashboard: React.FC = () => {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();
  useEffect(() => {
    async function fetchLocation() {
      setIsLocationLoading(true);
      setLocationError(null);
      try {
        const coords = await getDeviceLocation();
        setLocation(coords);
      } catch (err) {
        console.error("Failed to get location:", err);
        setLocationError(
          "Unable to get your location. Please enable location services."
        );
      } finally {
        setIsLocationLoading(false);
      }
    }

    fetchLocation();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);
  const { data: unreadCount = 0 } = useUnreadNoticesCount();
  const { data: expenseData } = useExpenseClaim([["status", "=", "Unpaid"]]);

  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );

  const employeeState = useEmployeeWithFallback();
  const { data: canShowClockIn } = useCanShowClockIn(
    currentEmployee?.user_id ? { user: currentEmployee.user_id } : {}
  );
  const { data: employeeAttendanceSummary } = useGetQuickAttendanceSummary(
    currentEmployee?.employee || "",
    format(startOfMonth(new Date()), "yyyy-MM-dd"),
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );

  const { mutate: checkInCheckOutMutation, isPending: checkInCheckOutPending } =
    useCheckInOutService();
  const { mutate: clockInCheckOutMutation, isPending: clockInCheckOutPending } =
    useClockInOutService();
  const start = format(startOfDay(new Date()), "yyyy-MM-dd HH:mm:ss");
  const end = format(endOfDay(new Date()), "yyyy-MM-dd HH:mm:ss");

  const filters = {
    time: ["between", [start, end]],
  };

  const { data: CompanyLogo } = useCompanyLogo();
  const currentEmployeeCompany = currentEmployee?.company;
  const matchedCompany =
    Array.isArray(CompanyLogo) &&
      CompanyLogo.length > 0 &&
      currentEmployeeCompany
      ? CompanyLogo.find(
        (company) => company.company_name === currentEmployeeCompany
      )
      : CompanyLogo?.[0];

  const logoToShow = matchedCompany?.company_logo || "logo not found";
  const encodedFilters = encodeURIComponent(JSON.stringify(filters));
  const {
    data: homeSummary,
    refetch: refetchHomeSummary,
    isRefetching,
  } = useHomeSummaryDetails(currentEmployee?.user_id || "", encodedFilters);
  const { data: employeeShift } = useGetEmployeeShift(
    currentEmployee?.user_id || ""
  );
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
  type CustomError = Error & {
    response?: { data?: { message?: { error: string } } };
  };

  const handleCheckInOut = (type: string) => {
    // Validate location before proceeding
    if (!location?.latitude || !location?.longitude) {
      toast.error(
        "Location not available. Please wait for location to load or enable location services."
      );
      return;
    }

    if (type === "checkIn") {
      checkInCheckOutMutation(
        {
          employee: currentEmployee?.employee,
          shift: employeeShift?.shift,
          action: "Check In",
          latitude: location.latitude,
          longitude: location.longitude,
        },
        {
          onSuccess: () => {
            refetchHomeSummary();
          },
          onError: (e: CustomError) => {
            toast.error(
              e?.response?.data?.message?.error || "Error while Checking In"
            );
          },
        }
      );
    } else {
      checkInCheckOutMutation(
        {
          employee: currentEmployee?.employee,
          shift: employeeShift?.shift,
          action: "Check Out",
          latitude: location.latitude,
          longitude: location.longitude,
        },
        {
          onSuccess: () => {
            refetchHomeSummary();
          },
          onError: (e: CustomError) => {
            toast.error(
              e?.response?.data?.message?.error || "Error while Checking out"
            );
          },
        }
      );
    }
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
          },
          onError: (e: CustomError) => {
            toast.error(
              e?.response?.data?.message?.error || "Error while Clocking out"
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

  const handleNotificationClick = () => {
    navigate("/webapp/notification-log");
  };

  const getTotalTime = () => {
    if (!homeSummary || homeSummary.length === 0) {
      return "--:--";
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

  return (
    <div className="h-screen bg-white font-sans max-w-md mx-auto flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-white/20 px-4 py-3 shadow-sm sticky top-0 z-10 flex-shrink-0">
        <div className="flex items-center justify-between">
          <button className="flex items-center hover:bg-black/5 transition-colors w-12 h-12 rounded-xl overflow-hidden ">
            <img
              src={typeof logoToShow === "string" ? logoToShow : ""}
              alt="CompnayLogo"
              className="w-12 h-12 p-1 rounded-full  flex-shrink-0"
            />
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleNotificationClick}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </div>
              )}
            </button>

            <div
              className="w-9 h-9 rounded-xl overflow-hidden cursor-pointer border border-gray-400"
              onClick={() => {
                navigate(`/webapp/employee-profile`);
              }}
            >
              <img
                src={currentUser?.user_image || defaultProfile}
                alt="User avatar"
                className="w-full h-full object-cover bg-gray-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Viewing As Banner */}
      <ViewingAsBanner />

      {/* Search Bar */}
      <div className="px-4 py-2 mt-2 bg-white border-b border-gray-100 flex-shrink-0">
        <SearchMembers />
      </div>

      <div className="px-4 py-3 flex-1 overflow-y-auto">
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

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="text-center bg-gray-200 border-1 border-gray-300 px-2 py-2 rounded-lg">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Shift Start
            </p>
            <p className="text-xl font-bold text-gray-900">
              {employeeShift?.start_time
                ? formatTimeSafe(employeeShift?.start_time)
                : "--:--"}
            </p>
          </div>
          <div className="text-center bg-gray-200 border-1 border-gray-300  px-2 py-2 rounded-lg">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              In Time
            </p>

            <p className="text-xl font-bold text-gray-900">
              {firstCheckIn?.time
                ? formatTo24HourTime((firstCheckIn?.time as string) || "")
                : "--:--"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="text-center bg-gray-200 border-1 border-gray-300 px-2 py-2 rounded-lg">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Shift End
            </p>
            <p className="text-xl font-bold text-gray-900">
              {employeeShift?.end_time
                ? formatTimeSafe(employeeShift?.end_time)
                : "--:--"}
            </p>{" "}
          </div>
          <div className="text-center bg-gray-200 border-1 border-gray-300  px-2 py-2 rounded-lg">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Out Time
            </p>
            <p className="text-xl font-bold text-gray-900">
              {lastCheckOut?.time
                ? formatTo24HourTime(lastCheckOut?.time)
                : "--:--"}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          <div className="flex flex-col flex-1 justify-center items-center bg-gray-200 border-1 border-gray-300  px-2 py-2 rounded-lg">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Total Hours
            </p>
            <p className="text-xl font-bold text-gray-900">{getTotalTime()}</p>
          </div>
          {currentEmployee?.custom_allow_mobile_checkin ? (
            <div className="w-full">
              <button
                onClick={() =>
                  handleCheckInOut(
                    isCurrentlyCheckedIn ? "checkOut" : "checkIn"
                  )
                }
                className="w-full flex items-center justify-center py-3 px-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={
                  checkInCheckOutPending ||
                  !employeeShift?.shift ||
                  isLocationLoading ||
                  !location
                }
              >
                {checkInCheckOutPending || isRefetching ? (
                  <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5"></span>
                ) : isLocationLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
                    Getting location...
                  </span>
                ) : isCurrentlyCheckedIn ? (
                  "Check Out"
                ) : (
                  "Check In"
                )}
              </button>
              {locationError && (
                <p className="text-xs text-red-600 mt-1 text-center">
                  {locationError}
                </p>
              )}
            </div>
          ) : null}
          {canShowClockIn?.can_show ? (
            <button
              onClick={() =>
                handleClockInOut(isCurrentlyCheckedIn ? "clockOut" : "clockIn")
              }
              className="w-full flex items-center justify-center py-3 px-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-gray-700 transition-colors"
              disabled={clockInCheckOutPending || !employeeShift?.shift}
            >
              {clockInCheckOutPending || isRefetching ? (
                <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5"></span>
              ) : isCurrentlyCheckedIn ? (
                "Clock Out"
              ) : (
                "Clock In"
              )}
            </button>
          ) : null}
        </div>

        <div className="mb-5">
          <h3 className="base-title mb-3">Quick Links</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Link
              to="/webapp/leave-app"
              className="flex flex-col items-center group"
            >
              <div className="w-16 h-16 bg-blue-50 border-2 border-blue-100 rounded-xl flex items-center justify-center mb-2 group-hover:bg-blue-200 transition-colors">
                <Calendar className="w-6 h-6 text-blue-600 group-hover:text-blue-800 transition-colors" />
              </div>
              <span className="text-xs font-medium text-blue-700 text-center">
                Leaves & Holidays
              </span>
            </Link>

            <Link
              to="/webapp/attendance"
              className="flex flex-col items-center group"
            >
              <div className="w-16 h-16 bg-green-50 border-2 border-green-100 rounded-xl flex items-center justify-center mb-2 group-hover:bg-green-200 transition-colors">
                <User className="w-6 h-6 text-green-600 group-hover:text-green-800 transition-colors" />
              </div>
              <span className="text-xs font-medium text-green-700 text-center">
                Attendance
              </span>
            </Link>

            <Link
              to="/webapp/salary-slip-app"
              className="flex flex-col items-center group"
            >
              <div className="w-16 h-16 bg-yellow-50 border-2 border-yellow-100 rounded-xl flex items-center justify-center mb-2 group-hover:bg-yellow-200 transition-colors">
                <DollarSign className="w-6 h-6 text-yellow-600 group-hover:text-yellow-800 transition-colors" />
              </div>
              <span className="text-xs font-medium text-yellow-700 text-center">
                Compensation
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Link
              to="/webapp/shift-request"
              className="flex flex-col items-center group"
            >
              <div className="w-16 h-16 bg-purple-50 border-2 border-purple-100 rounded-xl flex items-center justify-center mb-2 group-hover:bg-purple-200 transition-colors">
                <ArrowUpDown className="w-6 h-6 text-purple-600 group-hover:text-purple-800 transition-colors" />
              </div>
              <span className="text-xs font-medium text-purple-700 text-center">
                Shifts
              </span>
            </Link>

            <Link
              to="/webapp/flow-app"
              className="flex flex-col items-center group"
            >
              <div className="w-16 h-16 bg-pink-50 border-2 border-pink-100 rounded-xl flex items-center justify-center mb-2 group-hover:bg-pink-200 transition-colors">
                <Workflow className="w-6 h-6 text-fuchsia-600 group-hover:text-fuchsia-800 transition-colors" />
              </div>
              <span className="text-xs font-medium text-pink-700 text-center">
                Flows
              </span>
            </Link>

            <Link
              to="/webapp/performance-app"
              className="flex flex-col items-center group"
            >
              <div className="w-16 h-16 bg-pink-50 border-2 border-pink-100 rounded-xl flex items-center justify-center mb-2 group-hover:bg-pink-200 transition-colors">
                <ChartNoAxesCombined className="w-6 h-6 text-fuchsia-600 group-hover:text-fuchsia-800 transition-colors" />
              </div>
              <span className="text-xs font-medium text-pink-700 text-center">
                Performance
              </span>
            </Link>

            <Link
              to="/webapp/expenses-app"
              className="flex flex-col items-center group"
            >
              <div className="w-16 h-16 bg-pink-50 border-2 border-pink-100 rounded-xl flex items-center justify-center mb-2 group-hover:bg-pink-200 transition-colors">
                <Receipt className="w-6 h-6 text-pink-600 group-hover:text-pink-800 transition-colors" />
              </div>
              <span className="text-xs font-medium text-pink-700 text-center">
                Expenses
              </span>
            </Link>

            <Link
              to="/webapp/policies-app"
              className="flex flex-col items-center group"
            >
              <div className="w-16 h-16 bg-orange-50 border-2 border-orange-100 rounded-xl flex items-center justify-center mb-2 group-hover:bg-orange-200 transition-colors">
                <Shield className="w-6 h-6 text-orange-600 group-hover:text-orange-800 transition-colors" />
              </div>
              <span className="text-xs font-medium text-orange-700 text-center">
                Policies
              </span>
            </Link>
          </div>
        </div>

        <div className="mb-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="base-title">Attendance</h3>

            <ViewAll
              title="View Details"
              onClick={() => navigate("/webapp/attendance")}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div
              className="text-center bg-green-50 border-2 border-green-100 p-3 rounded-lg cursor-pointer"
              onClick={() => {
                navigate("/webapp/attendance/summary");
              }}
            >
              <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-green-800">
                {employeeAttendanceSummary?.present || 0}
              </p>
              <p className="text-xs font-medium text-green-700">Present Days</p>
            </div>

            <div
              className="text-center bg-red-50 border-2 border-red-100 p-3 rounded-lg cursor-pointer"
              onClick={() => {
                navigate("/webapp/attendance/emp-attendance");
              }}
            >
              <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-red-800">
                {employeeAttendanceSummary?.absent || 0}
              </p>
              <p className="text-xs font-medium text-red-700">Absent Days</p>
            </div>

            <div
              className="text-center bg-orange-50 border-2 border-orange-100 p-3 rounded-lg cursor-pointer"
              onClick={() => {
                navigate("/webapp/leave-app/leaves/leave-balance");
              }}
            >
              <Timer className="w-6 h-6 text-orange-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-orange-800">
                {employeeAttendanceSummary?.leaves || 0}
              </p>
              <p className="text-xs font-medium text-orange-700">Leaves</p>
            </div>
          </div>
        </div>

        {expenseData?.length > 0 && (
          <div className="rounded-xl mb-4 sm:mb-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="base-title">Unpaid Expense Claims</h3>
              <ViewAll
                title="View Claims"
                onClick={() => navigate("/webapp/expenses-app")}
              />
            </div>

            <div className="space-y-3">
              {expenseData?.map(
                (item: {
                  employee_name: string;
                  creation: string;
                  total_claimed_amount: string;
                  status: string;
                }) => {
                  const styles =
                    statusStyles[
                    item.status?.toLowerCase() as keyof typeof statusStyles
                    ] || statusStyles.draft;

                  return (
                    <div
                      className={`flex items-center justify-between p-3 shadow-sm ${styles.bg} rounded-lg border ${styles.border}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 ${styles.iconBg} rounded-lg flex items-center justify-center`}
                        >
                          {styles.icon}
                        </div>
                        <div>
                          <p className="card-title">{item?.employee_name}</p>
                          <p className="text-xs text-gray-600">
                            {formatDateString(item?.creation)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="card-title">
                          {item?.total_claimed_amount} Rs
                        </p>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-xl text-xs font-medium ${styles.badgeBg} ${styles.badgeText}`}
                        >
                          {item?.status}
                        </span>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileDashboard;
