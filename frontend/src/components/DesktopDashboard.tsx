import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  ArrowUpDown,
  Receipt,
  Shield,
  Bell,
  Search,
  CheckCircle,
  AlertCircle,
  User,
  DollarSign,
  XCircle,
  FileEdit,
  Timer,
  BanknoteX,
  Home,
  LogOut,
  Clock,
} from "lucide-react";
import { useUnreadNoticesCount } from "../hooks/useNotices";
import { useCurrentUser } from "../hooks/useCurrentUser";
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
  formatTo24HourTime,
  getDeviceLocation,
} from "../utils/helperUtils";
import defaultProfile from "../assets/face-rec.png";
import logo from "../assets/logo.png";
import { useCurrentEmployeeAllDetails } from "../hooks/useEmployee";
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

const DesktopDashboard: React.FC = () => {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchLocation() {
      try {
        const coords = await getDeviceLocation();
        setLocation(coords);
      } catch (err) {
        console.log(err);
      }
    }

    fetchLocation();
  }, []);

  // Get unread notifications count
  const { data: unreadCount = 0 } = useUnreadNoticesCount();
  const { data: expenseData } = useExpenseClaim([["status", "=", "Unpaid"]]);
  // Get current user data
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );
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
    if (type === "checkIn") {
      checkInCheckOutMutation(
        {
          employee: currentEmployee?.employee,
          shift: employeeShift?.shift,
          action: "Check In",
          latitude: location?.latitude,
          longitude: location?.longitude,
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
          latitude: location?.latitude,
          longitude: location?.longitude,
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

  const getTotalTime = () => {
    if (firstCheckIn) {
      const diffMins = differenceInMinutes(
        new Date(),
        parseISO(firstCheckIn.time.replace(" ", "T"))
      );
      const hours = Math.floor(diffMins / 60);
      const minutes = diffMins % 60;
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
    } else {
      return "00:00";
    }
  };

  const getWorkPercentage = () => {
    if (firstCheckIn && firstCheckIn.shift_start && firstCheckIn.shift_end) {
      const now = new Date();
      const shiftStart = parseISO(firstCheckIn.shift_start.replace(" ", "T"));
      const shiftEnd = parseISO(firstCheckIn.shift_end.replace(" ", "T"));
      const totalShiftMins = differenceInMinutes(shiftEnd, shiftStart);
      const workedMins = differenceInMinutes(now, parseISO(firstCheckIn.time.replace(" ", "T")));
      return Math.min(Math.round((workedMins / totalShiftMins) * 100), 100);
    }
    return 0;
  };

  const navigationItems = [
    { icon: Home, label: "Dashboard", path: "/webapp/", active: true },
    { icon: Calendar, label: "Leaves & Holidays", path: "/webapp/leave-app" },
    { icon: User, label: "Attendance", path: "/webapp/attendance" },
    { icon: DollarSign, label: "Compensation", path: "/webapp/salary-slip-app" },
    { icon: ArrowUpDown, label: "Shifts", path: "/webapp/shift-request" },
    { icon: Receipt, label: "Expenses", path: "/webapp/expenses-app" },
    { icon: Shield, label: "Policies", path: "/webapp/policies-app" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-gray-200 fixed h-full z-10">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <img src={logo} alt="PayWise" className="w-8 h-8" />
            <div>
              <h2 className="font-semibold text-gray-900">PayWise</h2>
              <p className="text-sm text-gray-500">Employee Portal</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  item.active
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <button className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg w-full">
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome, Employee!</h1>
            <p className="text-gray-600">Here's your dashboard for today.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </div>
              )}
            </button>
            
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{currentUser?.full_name || "Sangeetaa"}</p>
                <p className="text-xs text-gray-500">Employee ID: {currentEmployee?.employee || "12345"}</p>
              </div>
              <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-300">
                <img
                  src={currentUser?.user_image || defaultProfile}
                  alt="User avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="p-8">
          {/* Time Cards */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">SHIFT START</p>
              <p className="text-2xl font-bold text-blue-600">
                {firstCheckIn?.shift_start
                  ? formatTo24HourTime(firstCheckIn.shift_start)
                  : "09:00 AM"}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">IN TIME</p>
              <p className="text-2xl font-bold text-green-600">
                {firstCheckIn?.time
                  ? formatTo24HourTime(firstCheckIn.time)
                  : "09:05 AM"}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">SHIFT END</p>
              <p className="text-2xl font-bold text-blue-600">
                {firstCheckIn?.shift_end
                  ? formatTo24HourTime(firstCheckIn.shift_end)
                  : "06:00 PM"}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">OUT TIME</p>
              <p className="text-2xl font-bold text-red-600">
                {lastCheckOut?.time
                  ? formatTo24HourTime(lastCheckOut.time)
                  : "--:--"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="col-span-2 space-y-6">
              {/* Quick Links */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
                <div className="grid grid-cols-3 gap-4">
                  <Link
                    to="/webapp/leave-app"
                    className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-200">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Leaves & Holidays</span>
                  </Link>

                  <Link
                    to="/webapp/attendance"
                    className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors group"
                  >
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-200">
                      <User className="w-6 h-6 text-green-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Attendance</span>
                  </Link>

                  <Link
                    to="/webapp/salary-slip-app"
                    className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-yellow-300 hover:bg-yellow-50 transition-colors group"
                  >
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-yellow-200">
                      <DollarSign className="w-6 h-6 text-yellow-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Compensation</span>
                  </Link>

                  <Link
                    to="/webapp/shift-request"
                    className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors group"
                  >
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-200">
                      <ArrowUpDown className="w-6 h-6 text-purple-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Shifts</span>
                  </Link>

                  <Link
                    to="/webapp/expenses-app"
                    className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-pink-300 hover:bg-pink-50 transition-colors group"
                  >
                    <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-pink-200">
                      <Receipt className="w-6 h-6 text-pink-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Expenses</span>
                  </Link>

                  <Link
                    to="/webapp/policies-app"
                    className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors group"
                  >
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-orange-200">
                      <Shield className="w-6 h-6 text-orange-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Policies</span>
                  </Link>
                </div>
              </div>

              {/* Unpaid Expense Claims */}
              {expenseData && expenseData.length > 0 && (
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Unpaid Expense Claims</h3>
                    <Link
                      to="/webapp/expenses-app"
                      className="text-blue-600 text-sm font-medium hover:text-blue-700"
                    >
                      View All
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {expenseData.slice(0, 3).map((item: any) => {
                      const styles =
                        statusStyles[
                          item.status?.toLowerCase() as keyof typeof statusStyles
                        ] || statusStyles.draft;

                      return (
                        <div
                          key={item.name}
                          className={`flex items-center justify-between p-4 rounded-lg border ${styles.border} ${styles.bg}`}
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-10 h-10 ${styles.iconBg} rounded-lg flex items-center justify-center`}
                            >
                              {styles.icon}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Office Supplies</p>
                              <p className="text-sm text-gray-600">
                                {formatDateString(item.creation)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {item.total_claimed_amount} Rs
                            </p>
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles.badgeBg} ${styles.badgeText}`}
                            >
                              {item.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Total Hours Worked */}
              <div className="bg-blue-600 text-white p-6 rounded-lg">
                <div className="text-center">
                  <p className="text-blue-100 text-sm mb-2">TOTAL HOURS WORKED</p>
                  <p className="text-4xl font-bold mb-2">{getTotalTime()}</p>
                  <p className="text-blue-100 text-sm mb-4">Today</p>
                  <div className="bg-blue-500 rounded-full h-2 mb-2">
                    <div
                      className="bg-white rounded-full h-2 transition-all duration-500"
                      style={{ width: `${getWorkPercentage()}%` }}
                    ></div>
                  </div>
                  <p className="text-blue-100 text-sm">{getWorkPercentage()}%</p>
                </div>
              </div>

              {/* Check In/Out Buttons */}
              <div className="space-y-3">
                {currentEmployee?.custom_allow_mobile_checkin && (
                  <button
                    onClick={() =>
                      handleCheckInOut(isCurrentlyCheckedIn ? "checkOut" : "checkIn")
                    }
                    className="w-full py-3 px-4 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                    disabled={checkInCheckOutPending || !employeeShift?.shift}
                  >
                    {checkInCheckOutPending || isRefetching ? (
                      <span className="flex items-center justify-center">
                        <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5 mr-2"></span>
                        Processing...
                      </span>
                    ) : isCurrentlyCheckedIn ? (
                      "Check Out"
                    ) : (
                      "Check In"
                    )}
                  </button>
                )}

                {canShowClockIn?.can_show && (
                  <button
                    onClick={() =>
                      handleClockInOut(isCurrentlyCheckedIn ? "clockOut" : "clockIn")
                    }
                    className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    disabled={clockInCheckOutPending || !employeeShift?.shift}
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

              {/* Attendance Summary */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Attendance</h3>
                  <Link
                    to="/webapp/attendance"
                    className="text-blue-600 text-sm font-medium hover:text-blue-700"
                  >
                    View Details
                  </Link>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                      <span className="text-sm font-medium text-green-800">Present</span>
                    </div>
                    <span className="text-lg font-bold text-green-800">
                      {employeeAttendanceSummary?.present || 20}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center">
                      <XCircle className="w-5 h-5 text-red-600 mr-3" />
                      <span className="text-sm font-medium text-red-800">Absent</span>
                    </div>
                    <span className="text-lg font-bold text-red-800">
                      {employeeAttendanceSummary?.absent || 1}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center">
                      <Timer className="w-5 h-5 text-orange-600 mr-3" />
                      <span className="text-sm font-medium text-orange-800">Leaves</span>
                    </div>
                    <span className="text-lg font-bold text-orange-800">
                      {employeeAttendanceSummary?.leaves || 2}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopDashboard;
