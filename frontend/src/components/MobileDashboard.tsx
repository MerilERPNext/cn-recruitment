import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  ArrowUpDown,
  ReceiptIndianRupee,
  Shield,
  Bell,
  CheckCircle,
  AlertCircle,
  User,
  IndianRupee,
  XCircle,
  FileEdit,
  Timer,
  BanknoteX,
  Workflow,
  ChartNoAxesCombined,
  RotateCcw,
  Gift,
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
import { useAppNotificationCounts } from "../hooks/useAppNotificationCounts";
import Button from "./shared/atoms/Button";
import { Typography } from "./shared/atoms/Typography";


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
  const { getCount } = useAppNotificationCounts();
  const fetchLocation = async () => {
    setIsLocationLoading(true);
    setLocationError(null);
    try {
      const coords = await getDeviceLocation();
      setLocation(coords);
      return coords;
    } catch (err) {
      console.error("Failed to get location:", err);
      setLocationError(
        "Unable to get your location. Please enable location services."
      );
      return null;
    } finally {
      setIsLocationLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch with a fallback retry to handle potential native interface delay
    fetchLocation().then((coords) => {
      if (!coords) {
        // If initial fetch fails, try again after a short delay
        setTimeout(() => {
          fetchLocation();
        }, 1000);
      }
    });
  }, []);

  useEffect(() => {
    if (location) {
      setLocationError(null);
    }
  }, [location]);

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
          <Button variant="subtle" className="w-12 h-12 p-0 rounded-xl overflow-hidden hover:bg-black/5">
            <img
              src={typeof logoToShow === "string" ? logoToShow : ""}
              alt="CompnayLogo"
              className="w-12 h-12 p-1 rounded-full flex-shrink-0"
            />
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="subtle"
              onClick={handleNotificationClick}
              className="relative p-2 hover:bg-gray-100 rounded-lg text-gray-600"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </div>
              )}
            </Button>

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
          <div className="text-center bg-gray-100 border-1 border-gray-300 px-2 py-2 rounded-lg">
            <Typography variant="label" color="body2" className="mb-1 block">
              Shift Start
            </Typography>
            <Typography variant="h3" className="font-bold text-gray-900">
              {employeeShift?.start_time
                ? formatTimeSafe(employeeShift?.start_time)
                : "--:--"}
            </Typography>
          </div>
          <div className="text-center bg-gray-100 border-1 border-gray-300  px-2 py-2 rounded-lg">
            <Typography variant="label" color="body2" className="mb-1 block">
              In Time
            </Typography>

            <Typography variant="h3" className="font-bold text-gray-900">
              {firstCheckIn?.time
                ? formatTo24HourTime((firstCheckIn?.time as string) || "")
                : "--:--"}
            </Typography>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="text-center bg-gray-100 border-1 border-gray-300 px-2 py-2 rounded-lg">
            <Typography variant="label" color="body2" className="mb-1 block">
              Shift End
            </Typography>
            <Typography variant="h3" className="font-bold text-gray-900">
              {employeeShift?.end_time
                ? formatTimeSafe(employeeShift?.end_time)
                : "--:--"}
            </Typography>
          </div>
          <div className="text-center bg-gray-100 border-1 border-gray-300  px-2 py-2 rounded-lg">
            <Typography variant="label" color="body2" className="mb-1 block">
              Out Time
            </Typography>
            <Typography variant="h3" className="font-bold text-gray-900">
              {lastCheckOut?.time
                ? formatTo24HourTime(lastCheckOut?.time)
                : "--:--"}
            </Typography>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          <div className="flex flex-col flex-1 justify-center items-center bg-gray-100 border-1 border-gray-300  px-2 py-2 rounded-lg">
            <Typography variant="label" color="body2" className="mb-1 block">
              Total Hours
            </Typography>
            <Typography variant="h3" className="font-bold text-gray-900">{getTotalTime()}</Typography>
          </div>
          {currentEmployee?.custom_allow_mobile_checkin ? (
            <div className="w-full">
              <Button
                variant="contain"
                fullWidth
                size="lg"
                onClick={() =>
                  handleCheckInOut(
                    isCurrentlyCheckedIn ? "checkOut" : "checkIn"
                  )
                }
                disabled={
                  checkInCheckOutPending ||
                  !employeeShift?.shift ||
                  isLocationLoading ||
                  !location
                }
                className="font-medium"
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
              </Button>
              {locationError && !isLocationLoading && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Typography variant="bodySmall" color="error" className="font-medium">
                    {locationError}
                  </Typography>
                  <Button
                    variant="soft"
                    bgColor="error"
                    size="sm"
                    onClick={fetchLocation}
                    className="p-1.5 rounded-full border border-red-200"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ) : null}
          {canShowClockIn?.can_show ? (
            <Button
              variant="contain"
              fullWidth
              size="lg"
              onClick={() =>
                handleClockInOut(isCurrentlyCheckedIn ? "clockOut" : "clockIn")
              }
              disabled={clockInCheckOutPending || !employeeShift?.shift}
              className="font-medium"
            >
              {clockInCheckOutPending || isRefetching ? (
                <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5"></span>
              ) : isCurrentlyCheckedIn ? (
                "Clock Out"
              ) : (
                "Clock In"
              )}
            </Button>
          ) : null}
        </div>

        <div className="mb-5">
          <Typography variant="subheading" className="mb-3 block">Quick Links</Typography>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Link
              to="/webapp/leave-app"
              className="flex flex-col items-center group"
            >
              <div className="relative w-16 h-16 bg-blue-50 border-2 border-blue-100 rounded-xl flex items-center justify-center mb-2 group-hover:bg-blue-200 transition-colors">
                <Calendar className="w-6 h-6 text-blue-600 group-hover:text-blue-800 transition-colors" />
                {getCount("Leaves & Holidays") > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-5 px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {getCount("Leaves & Holidays")}
                  </span>
                )}
              </div>
              <Typography variant="bodySmall" className="font-medium text-blue-700 text-center">
                Leaves & Holidays
              </Typography>
            </Link>

            <Link
              to="/webapp/attendance"
              className="flex flex-col items-center group"
            >
              <div className="relative w-16 h-16 bg-green-50 border-2 border-green-100 rounded-xl flex items-center justify-center mb-2 group-hover:bg-green-200 transition-colors">
                <User className="w-6 h-6 text-green-600 group-hover:text-green-800 transition-colors" />
                {getCount("Attendance") > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-5 px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {getCount("Attendance")}
                  </span>
                )}
              </div>
              <Typography variant="bodySmall" className="font-medium text-green-700 text-center">
                Attendance
              </Typography>
            </Link>

            <Link
              to="/webapp/salary-slip-app"
              className="flex flex-col items-center group"
            >
              <div className="relative w-16 h-16 bg-yellow-50 border-2 border-yellow-100 rounded-xl flex items-center justify-center mb-2 group-hover:bg-yellow-200 transition-colors">
                <IndianRupee className="w-6 h-6 text-yellow-600 group-hover:text-yellow-800 transition-colors" />
                {getCount("Compensation") > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-5 px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {getCount("Compensation")}
                  </span>
                )}
              </div>
              <Typography variant="bodySmall" className="font-medium text-yellow-700 text-center">
                Compensation
              </Typography>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Link
              to="/webapp/benefits-app"
              className="flex flex-col items-center group"
            >
              <div className="relative w-16 h-16 bg-orange-50 border-2 border-orange-100 rounded-xl flex items-center justify-center mb-2 group-hover:bg-orange-200 transition-colors">
                <Gift className="w-6 h-6 text-orange-600 group-hover:text-orange-800 transition-colors" />
                {getCount("Benefits") > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-5 px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {getCount("Benefits")}
                  </span>
                )}
              </div>
              <Typography variant="bodySmall" className="font-medium text-orange-700 text-center">
                Benefits
              </Typography>
            </Link>

            <Link
              to="/webapp/shift-request"
              className="flex flex-col items-center group"
            >
              <div className="relative w-16 h-16 bg-purple-50 border-2 border-purple-100 rounded-xl flex items-center justify-center mb-2 group-hover:bg-purple-200 transition-colors">
                <ArrowUpDown className="w-6 h-6 text-purple-600 group-hover:text-purple-800 transition-colors" />
                {getCount("Shifts") > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-5 px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {getCount("Shifts")}
                  </span>
                )}
              </div>
              <Typography variant="bodySmall" className="font-medium text-purple-700 text-center">
                Shifts
              </Typography>
            </Link>

            <Link
              to="/webapp/flow-app"
              className="flex flex-col items-center group"
            >
              <div className="relative w-16 h-16 bg-pink-50 border-2 border-pink-100 rounded-xl flex items-center justify-center mb-2 group-hover:bg-pink-200 transition-colors">
                <Workflow className="w-6 h-6 text-fuchsia-600 group-hover:text-fuchsia-800 transition-colors" />
                {getCount("Flows") > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-5 px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {getCount("Flows")}
                  </span>
                )}
              </div>
              <Typography variant="bodySmall" className="font-medium text-pink-700 text-center">
                Flows
              </Typography>
            </Link>

            <Link
              to="/webapp/performance-app"
              className="flex flex-col items-center group"
            >
              <div className="relative w-16 h-16 bg-pink-50 border-2 border-pink-100 rounded-xl flex items-center justify-center mb-2 group-hover:bg-pink-200 transition-colors">
                <ChartNoAxesCombined className="w-6 h-6 text-fuchsia-600 group-hover:text-fuchsia-800 transition-colors" />
                {getCount("Performance") > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-5 px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {getCount("Performance")}
                  </span>
                )}
              </div>
              <Typography variant="bodySmall" className="font-medium text-pink-700 text-center">
                Performance
              </Typography>
            </Link>

            <Link
              to="/webapp/expenses-app"
              className="flex flex-col items-center group"
            >
              <div className="relative w-16 h-16 bg-pink-50 border-2 border-pink-100 rounded-xl flex items-center justify-center mb-2 group-hover:bg-pink-200 transition-colors">
                <ReceiptIndianRupee className="w-6 h-6 text-pink-600 group-hover:text-pink-800 transition-colors" />
                {getCount("Expenses") > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-5 px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {getCount("Expenses")}
                  </span>
                )}
              </div>
              <Typography variant="bodySmall" className="font-medium text-pink-700 text-center">
                Expenses
              </Typography>
            </Link>

            <Link
              to="/webapp/policies-app"
              className="flex flex-col items-center group"
            >
              <div className="relative w-16 h-16 bg-orange-50 border-2 border-orange-100 rounded-xl flex items-center justify-center mb-2 group-hover:bg-orange-200 transition-colors">
                <Shield className="w-6 h-6 text-orange-600 group-hover:text-orange-800 transition-colors" />
                {getCount("Policies") > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-5 px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {getCount("Policies")}
                  </span>
                )}
              </div>
              <Typography variant="bodySmall" className="font-medium text-orange-700 text-center">
                Policies
              </Typography>
            </Link>
          </div>
        </div>

        <div className="mb-5">
          <div className="flex justify-between items-center mb-3">
            <Typography variant="subheading" className="block">Attendance</Typography>

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
              <Typography variant="h3" className="font-bold text-green-800">
                {employeeAttendanceSummary?.present || 0}
              </Typography>
              <Typography variant="bodySmall" className="font-medium text-green-700">Present Days</Typography>
            </div>

            <div
              className="text-center bg-red-50 border-2 border-red-100 p-3 rounded-lg cursor-pointer"
              onClick={() => {
                navigate("/webapp/attendance/emp-attendance");
              }}
            >
              <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
              <Typography variant="h3" className="font-bold text-red-800">
                {employeeAttendanceSummary?.absent || 0}
              </Typography>
              <Typography variant="bodySmall" className="font-medium text-red-700">Absent Days</Typography>
            </div>

            <div
              className="text-center bg-orange-50 border-2 border-orange-100 p-3 rounded-lg cursor-pointer"
              onClick={() => {
                navigate("/webapp/leave-app/leaves/leave-balance");
              }}
            >
              <Timer className="w-6 h-6 text-orange-600 mx-auto mb-1" />
              <Typography variant="h3" className="font-bold text-orange-800">
                {employeeAttendanceSummary?.leaves || 0}
              </Typography>
              <Typography variant="bodySmall" className="font-medium text-orange-700">Leaves</Typography>
            </div>
          </div>
        </div>

        {expenseData?.length > 0 && (
          <div className="rounded-xl mb-4 sm:mb-5">
            <div className="flex justify-between items-center mb-3">
              <Typography variant="subheading" className="block">Unpaid Expense Claims</Typography>
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
                          <Typography variant="bodyMedium" className="card-title block">{item?.employee_name}</Typography>
                          <Typography variant="bodySmall" className="text-gray-600 block">
                            {formatDateString(item?.creation)}
                          </Typography>
                        </div>
                      </div>
                      <div className="text-right">
                        <Typography variant="bodyMedium" className="card-title block">
                          {item?.total_claimed_amount} Rs
                        </Typography>
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
