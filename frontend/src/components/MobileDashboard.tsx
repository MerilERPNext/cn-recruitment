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
  const [currentTime, setCurrentTime] = useState(new Date());
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

  // Update current time every minute for real-time progress calculation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);
  // Get unread notifications count
  const { data: unreadCount = 0 } = useUnreadNoticesCount();
  const { data: expenseData } = useExpenseClaim([["status", "=", "Unpaid"]]);
  // Get current user data
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );

  // Enhanced employee state with fallback
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

  // this is for the logo
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

  // logo setkarna compnay and emplyee name cuurect compnay ka
  const logoToShow = matchedCompany?.company_logo || "logo not found";
  const encodedFilters = encodeURIComponent(JSON.stringify(filters));
  // const today = new Date().toISOString().split("T")[0];
  // const { data: leaveBalance } = useGetLeaveBalance(
  //   currentEmployee?.employee,
  //   today
  // );

  // This works for both check in/check out and clockin and clock out  -- START
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
  // This works for both check in/check out and clockin and clock out -- END
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

  const handleNotificationClick = () => {
    navigate("/webapp/notification-log");
  };

  const getTotalTime = () => {
    if (!homeSummary || homeSummary.length === 0) {
      return "--:--";
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
    // Format as HH:mm with leading zeros
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="h-screen bg-white font-sans max-w-md mx-auto flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-white/20 px-4 py-3 shadow-sm sticky top-0 z-10 flex-shrink-0">
        <div className="flex items-center justify-between">
          {/* Left: Logo/Profile button */}
          <button className="flex items-center hover:bg-black/5 transition-colors w-10 h-10 rounded-xl overflow-hidden ">
            <img
              src={typeof logoToShow === "string" ? logoToShow : ""}
              alt="CompnayLogo"
              className="w-12 h-12 p-1 rounded-full  flex-shrink-0"
            />
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
              onClick={() => {
                const employeeId = currentEmployee?.employee;
                if (employeeId) {
                  navigate(`/webapp/employee-profile/${employeeId}`);
                }
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

      {/* Search Bar */}
      <div className="px-4 py-2 mt-2 bg-white border-b border-gray-100 flex-shrink-0">
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

      <div className="px-4 py-3 flex-1 overflow-y-auto">
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

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="text-center bg-gray-200 border-1 border-gray-300 px-2 py-2 rounded-lg">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Shift Start
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {employeeShift?.start_time
                ? formatTimeSafe(employeeShift?.start_time)
                : "--:--"}
            </p>
          </div>
          <div className="text-center bg-gray-200 border-1 border-gray-300  px-2 py-2 rounded-lg">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              In Time
            </p>

            <p className="text-2xl font-bold text-gray-900">
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
            <p className="text-2xl font-bold text-gray-900">
              {employeeShift?.end_time
                ? formatTimeSafe(employeeShift?.end_time)
                : "--:--"}
            </p>{" "}
            {/* <p className="text-sm font-bold text-gray-900">{todayAttendance?.[0]?.shift}</p> */}
          </div>
          <div className="text-center bg-gray-200 border-1 border-gray-300  px-2 py-2 rounded-lg">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Out Time
            </p>
            <p className="text-2xl font-bold text-gray-900">
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
            <p className="text-2xl font-bold text-gray-900">{getTotalTime()}</p>
          </div>
          {/* Check In / Check Out */}
          {currentEmployee?.custom_allow_mobile_checkin ? (
            <button
              onClick={() =>
                handleCheckInOut(isCurrentlyCheckedIn ? "checkOut" : "checkIn")
              }
              className="w-full flex items-center justify-center py-3 px-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
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
          ) : null}
          {/* Clock In / Clock Out */}
          {canShowClockIn?.can_show ? (
            <button
              onClick={() =>
                handleClockInOut(isCurrentlyCheckedIn ? "clockOut" : "clockIn")
              }
              className="w-full flex items-center justify-center py-3 px-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
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

        {/* Leave Balance */}

        {/* {leaveBalance && (
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
        )} */}

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

// const LeaveProgress = ({ leaveData }: LeaveProgressProps) => {
//   return (
//     <div className="rounded-xl mb-4 sm:mb-5">
//       <div className="flex justify-between items-center mb-4">
//         <h3 className="text-lg font-bold text-gray-900">Leave Balance</h3>
//         <Link
//           to="/webapp/leave-app"
//           className="text-blue-500 text-sm font-semibold hover:text-blue-600"
//         >
//           View All
//         </Link>
//       </div>
//       <div className="space-y-4">
//         {Object.entries(leaveData).map(
//           ([leaveType, { allocated_leaves, balance_leaves }]) => {
//             const percentage =
//               allocated_leaves > 0
//                 ? (balance_leaves / allocated_leaves) * 100
//                 : 0;

//             return (
//               <div key={leaveType}>
//                 <div className="flex justify-between items-center mb-2">
//                   <span className="text-gray-700 font-medium">{leaveType}</span>
//                   <span className="text-lg font-bold text-gray-900">
//                     {balance_leaves.toString().padStart(2, "0")} /{" "}
//                     {allocated_leaves.toString().padStart(2, "0")}
//                   </span>
//                 </div>
//                 <div className="w-full bg-gray-200 rounded-lg h-2 overflow-hidden">
//                   <div
//                     className={`bg-blue-600 h-full rounded-lg transition duration-500`}
//                     style={{ width: `${percentage}%` }}
//                   />
//                 </div>
//               </div>
//             );
//           }
//         )}
//       </div>
//     </div>
//   );
// };
