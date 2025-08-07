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
} from "lucide-react";
import { useUnreadNoticesCount } from "../hooks/useNotices";
import { useCurrentUser } from "../hooks/useCurrentUser";
import {
  useCheckInOutService,
  useGetEmployeeShift,
  useGetQuickAttendanceSummary,
  useHomeSummaryDetails,
} from "../hooks/useAttendance";
import {
  LeaveData,
  LeaveProgressProps,
  useGetLeaveBalance,
} from "../hooks/useLeaves";
import { useExpenseClaim } from "../hooks/useExpense";
import { formatDateString, formatTo24HourTime } from "../utils/helperUtils";
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
  const navigate = useNavigate();

  // Get unread notifications count
  const { data: unreadCount = 0 } = useUnreadNoticesCount();
  const { data: expenseData } = useExpenseClaim([["status", "=", "Unpaid"]]);
  // Get current user data
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );
  const { data: employeeAttendanceSummary } = useGetQuickAttendanceSummary(
    currentEmployee?.employee as string,
    format(startOfMonth(new Date()), "yyyy-MM-dd"),
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );
  const { mutate: checkInCheckOutMutation, isPending: checkInCheckOutPending } =
    useCheckInOutService();
  const start = format(startOfDay(new Date()), "yyyy-MM-dd HH:mm:ss");
  const end = format(endOfDay(new Date()), "yyyy-MM-dd HH:mm:ss");

  const filters = {
    time: ["between", [start, end]],
  };

  const encodedFilters = encodeURIComponent(JSON.stringify(filters));
  const today = new Date().toISOString().split("T")[0];
  const { data: leaveBalance } = useGetLeaveBalance(
    currentEmployee?.employee,
    today
  );
  const {
    data: homeSummary,
    refetch: refetchHomeSummary,
    isRefetching,
  } = useHomeSummaryDetails(currentEmployee?.user_id as string, encodedFilters);
  const { data: employeeShift } = useGetEmployeeShift(
    currentEmployee?.user_id as string
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

  const handleCheckIn = () => {
    checkInCheckOutMutation(
      {
        employee: currentEmployee?.employee,
        shift: employeeShift?.shift,
        action: "Check In",
      },
      {
        onSuccess: () => {
          refetchHomeSummary();
        },
      }
    );
  };

  const handleCheckOut = () => {
    checkInCheckOutMutation(
      {
        employee: currentEmployee?.employee,
        shift: employeeShift?.shift,
        action: "Check Out",
      },
      {
        onSuccess: () => {
          refetchHomeSummary();
        },
      }
    );
  };

  const handleNotificationClick = () => {
    navigate("/webapp/notices");
  };

  const getTotalTime = () => {
    if (firstCheckIn) {
      const diffMins = differenceInMinutes(
        new Date(),
        parseISO(firstCheckIn.time.replace(" ", "T"))
      );
      const hours = Math.floor(diffMins / 60);
      const minutes = diffMins % 60;
      // Format as HH:mm with leading zeros
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    } else {
      return "--:--";
    }
  };
  return (
    <div className="min-h-screen bg-white font-sans max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-white/20 px-4 py-3 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          {/* Left: Logo/Profile button */}
          <button className="flex items-center hover:bg-black/5 rounded-lg  transition-colors w-10 h-10 rounded-xl overflow-hidden ">
            <img src={logo} alt="Logo" className="w-full h-full object-cover" />
          </button>

          {/* Right: Notification + Avatar */}
          <div className="flex items-center gap-3">
            {/* Notification Button */}
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

            {/* Profile Avatar */}
            <div
              className="w-9 h-9 rounded-xl overflow-hidden cursor-pointer border border-gray-400"
              onClick={() => navigate("/webapp/my-profile")}
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

      {/* Search Bar */}
      <div className="px-4 py-2 mt-2 bg-white border-b border-gray-100">
        <div className="relative">
          <input
            type="text"
            placeholder="Search members..."
            onClick={() => navigate("/webapp/search-members")}
            // onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-3 bg-gray-200 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder-gray-500"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="text-center bg-gray-200 border-1 border-gray-300 px-2 py-4 rounded-lg">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Shift Start
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {firstCheckIn?.shift_start
                ? formatTo24HourTime(
                    firstCheckIn?.shift_start || ("" as string)
                  )
                : "--:--"}
            </p>
          </div>
          <div className="text-center bg-gray-200 border-1 border-gray-300  px-2 py-4 rounded-lg">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Check In
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {firstCheckIn?.time
                ? formatTo24HourTime((firstCheckIn?.time as string) || "")
                : "--:--"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="text-center bg-gray-200 border-1 border-gray-300 px-2 py-4 rounded-lg">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Shift End
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {firstCheckIn?.shift_end
                ? formatTo24HourTime(firstCheckIn.shift_end)
                : "--:--"}
            </p>{" "}
            {/* <p className="text-sm font-bold text-gray-900">{todayAttendance?.[0]?.shift}</p> */}
          </div>
          <div className="text-center bg-gray-200 border-1 border-gray-300  px-2 py-4 rounded-lg">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Check Out
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {lastCheckOut?.time
                ? formatTo24HourTime(lastCheckOut?.time)
                : "--:--"}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          <div className="flex flex-col flex-1 justify-center items-center bg-gray-200 border-1 border-gray-300  px-2 py-4 rounded-lg">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Total Hours
            </p>
            <p className="text-2xl font-bold text-gray-900">{getTotalTime()}</p>
          </div>
          <button
            onClick={isCurrentlyCheckedIn ? handleCheckOut : handleCheckIn}
            className="w-full bg-gray-900 text-white py-4 rounded-lg font-semibold flex-1 flex items-center justify-center text-md"
            disabled={checkInCheckOutPending || !employeeShift?.shift}
          >
            {checkInCheckOutPending || isRefetching ? (
              <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5"></span>
            ) : isCurrentlyCheckedIn ? (
              "Check Out"
            ) : (
              "Check In"
            )}
          </button>
        </div>
        {/* Quick Links */}
        <div className="mb-5">
          <h3 className="text-lg font-bold mb-3">Quick Links</h3>

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

        {/* Attendance Summary */}
        <div className="mb-4 sm:mb-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Attendance</h3>
            <Link
              to="/webapp/attendance"
              className="text-blue-500 text-sm font-semibold hover:text-blue-700 transition-colors"
            >
              View Details
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center bg-green-50 border-2 border-green-100 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-green-800">
                {employeeAttendanceSummary?.present || 0}
              </p>
              <p className="text-xs font-medium text-green-700">Present Days</p>
            </div>

            <div className="text-center bg-red-50 border-2 border-red-100 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-red-800">
                {employeeAttendanceSummary?.absent || 0}
              </p>
              <p className="text-xs font-medium text-red-700">Absent Days</p>
            </div>

            <div className="text-center bg-yellow-50 border-2 border-yellow-100 p-3 rounded-lg">
              <Timer className="w-6 h-6 text-yellow-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-yellow-800">
                {employeeAttendanceSummary?.avg_overtime || 0}
              </p>
              <p className="text-xs font-medium text-yellow-700">
                Avg. Overtime
              </p>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 text-sm font-semibold">
                This Month Average Hours:
              </span>
              <span className="text-sm font-semibold">
                {employeeAttendanceSummary?.avg_working_hours}
              </span>
            </div>
          </div>
        </div>

        {/* Leave Balance */}

        {leaveBalance && (
          <LeaveProgress
            leaveData={leaveBalance.leave_balance.reduce(
              (acc, leave) => ({
                ...acc,
                [leave.type]: {
                  allocated_leaves: leave.entitled,
                  balance_leaves: leave.balance,
                },
              }),
              {} as LeaveData
            )}
          />
        )}

        {/* Pending Expense Claims */}
        {expenseData?.length > 0 && (
          <div className="rounded-xl  border border-gray-100 mb-4 sm:mb-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Unpaid Expense Claims
              </h3>
              <Link
                to="/webapp/expenses-app"
                className="text-blue-500 text-sm font-semibold hover:text-blue-600"
              >
                View All
              </Link>
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
                  // const StatusIcon = statusIcons[statusKey] || statusIcons.draft;

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
                          <p className="font-semibold text-gray-900">
                            {item?.employee_name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {formatDateString(item?.creation)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
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

const LeaveProgress = ({ leaveData }: LeaveProgressProps) => {
  return (
    <div className="rounded-xl mb-4 sm:mb-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">Leave Balance</h3>
        <Link
          to="/webapp/leave-app"
          className="text-blue-500 text-sm font-semibold hover:text-blue-600"
        >
          View All
        </Link>
      </div>
      <div className="space-y-4">
        {Object.entries(leaveData).map(
          ([leaveType, { allocated_leaves, balance_leaves }]) => {
            const percentage =
              allocated_leaves > 0
                ? (balance_leaves / allocated_leaves) * 100
                : 0;

            return (
              <div key={leaveType}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700 font-medium">{leaveType}</span>
                  <span className="text-lg font-bold text-gray-900">
                    {balance_leaves.toString().padStart(2, "0")} /{" "}
                    {allocated_leaves.toString().padStart(2, "0")}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-lg h-2 overflow-hidden">
                  <div
                    className={`bg-blue-600 h-full rounded-lg transition duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
};
