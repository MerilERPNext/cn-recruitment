import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  ArrowUpDown,
  Receipt,
  Shield,
  Bell,
  Search,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  User,
  DollarSign,
  Check
} from 'lucide-react';
import { useUnreadNoticesCount } from '../hooks/useNotices';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useCheckInOutService, useHomeSummaryDetails } from '../hooks/useAttendance';
import { LeaveData, LeaveProgressProps, useGetLeaveBalance } from '../hooks/useLeaves';
import { useExpenseClaim } from '../hooks/useExpense';
import { formatDateString, formatTo24HourTime } from '../utils/helperUtils';
import defaultProfile from "../assets/face-rec.png";
import { useCurrentEmployeeAllDetails } from '../hooks/useEmployee';
import { compareAsc, compareDesc, differenceInMinutes, endOfDay, format, parseISO, startOfDay } from 'date-fns';


const MobileDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Get unread notifications count
  const { data: unreadCount = 0 } = useUnreadNoticesCount();
  const { data: expenseData } = useExpenseClaim([["status", "=", "draft"]])
  // Get current user data

  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(currentUser?.name as string)

  const { mutate: checkInCheckOutMutation, isPending: checkInCheckOutPending } = useCheckInOutService()
  // const { data: todayAttendance } = useAttendance(filters as any, {
  //   enabled: !!currentUser?.name,
  // });

  const start = format(startOfDay(new Date()), 'yyyy-MM-dd HH:mm:ss');
  const end = format(endOfDay(new Date()), 'yyyy-MM-dd HH:mm:ss');

  const filters = {
    time: ['between', [start, end]],
  };

  const encodedFilters = encodeURIComponent(JSON.stringify(filters));
  const { data: leaveBalance } = useGetLeaveBalance(currentEmployee?.employee)
  const { data: homeSummary, refetch: refetchHomeSummary, isRefetching } = useHomeSummaryDetails(currentEmployee?.user_id as string, encodedFilters)
  const checkIns = homeSummary?.filter(log => log.log_type === 'IN') ?? [];
  const checkOuts = homeSummary?.filter(log => log.log_type === 'OUT') ?? [];

  const firstCheckIn = checkIns.length
    ? checkIns.sort((a, b) =>
      compareAsc(parseISO(a.time.replace(" ", "T")), parseISO(b.time.replace(" ", "T")))
    )[0]
    : undefined;

  const lastCheckOut = checkOuts.length
    ? checkOuts.sort((a, b) =>
      compareDesc(parseISO(a.time.replace(" ", "T")), parseISO(b.time.replace(" ", "T")))
    )[0]
    : undefined;



  const lastLog = homeSummary && homeSummary.length > 0
    ? [...homeSummary].sort((a, b) =>
      compareDesc(parseISO(a.time.replace(" ", "T")), parseISO(b.time.replace(" ", "T")))
    )[0]
    : undefined;

  const isCurrentlyCheckedIn = lastLog?.log_type === "IN";

  const handleCheckIn = () => {
    checkInCheckOutMutation({ employee: currentEmployee?.employee, shift: firstCheckIn?.shift, action: "Check In" }, { onSuccess: () => { refetchHomeSummary() } })
  };

  const handleCheckOut = () => {
    checkInCheckOutMutation({ employee: currentEmployee?.employee, shift: firstCheckIn?.shift, action: "Check Out" }, { onSuccess: () => { refetchHomeSummary() } })
  };


  const handleNotificationClick = () => {
    navigate('/webapp/notices');
  };

  // Get display name for the user
  const getDisplayName = (): string => {
    if (isUserLoading) {
      return 'Loading...';
    }

    if (currentUser) {
      // Priority 1: Use first_name if available
      if (currentUser.first_name) {
        return currentUser.first_name;
      }

      // Priority 2: Use full_name and extract first name
      if (currentUser.full_name) {
        const firstName = currentUser.full_name.split(' ')[0];
        return firstName;
      }

      // Priority 3: Use username if available
      if (currentUser.username) {
        return currentUser.username;
      }

      // Priority 4: Extract name from email
      if (currentUser.email) {
        const nameFromEmail = currentUser.email.split('@')[0];
        // Capitalize first letter
        return nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
      }
    }

    // Default fallback
    return 'User';
  };
  const getTotalTime = () => {
    if (firstCheckIn) {

      const diffMins = differenceInMinutes(new Date(), parseISO(firstCheckIn.time.replace(" ", "T")));
      const hours = Math.floor(diffMins / 60);
      const minutes = diffMins % 60;
      // Format as HH:mm with leading zeros
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    } else {
      return "--:--"
    }

  }
  return (
    <div className="min-h-screen bg-gray-50 font-sans max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-white/20 px-4 py-3 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/webapp/my-profile')}
            className="flex items-center space-x-3 hover:bg-black/5 rounded-lg p-2 -m-2 transition-colors"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              {/* <User className="w-5 h-5 text-white" /> */}
              <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center shadow-lg">
                <img
                  src={currentUser?.user_image || defaultProfile}
                  alt="User avatar"
                  className="w-10 h-10 rounded-full object-cover"
                />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Welcome, {getDisplayName()}</h1>
              <p className="text-xs text-gray-600">Let's get to work!</p>
            </div>
          </button>
          <button
            onClick={handleNotificationClick}
            className="relative p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 min-w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </div>
            )}
          </button>
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
            className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder-gray-500"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="text-center bg-gray-200 border-1 border-gray-200 px-2 py-4 rounded-lg">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Shift Start</p>
            <p className="text-xl font-bold text-gray-900">{firstCheckIn?.shift_start ? formatTo24HourTime(firstCheckIn?.shift_start || "" as string) : "--:--"}</p>
          </div>
          <div className="text-center bg-gray-200 border-1 border-gray-200  px-2 py-4 rounded-lg">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Check In</p>
            <p className="text-xl font-bold text-gray-900">{firstCheckIn?.time ? formatTo24HourTime(firstCheckIn?.time as string || "") : "--:--"}</p>
          </div>
        </div>


        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="text-center bg-gray-200 border-1 border-gray-200 px-2 py-4 rounded-lg">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Shift End</p>
            <p className="text-xl font-bold text-gray-900">
              {firstCheckIn?.shift_end
                ? formatTo24HourTime(firstCheckIn.shift_end)
                : "--:--"}
            </p>              {/* <p className="text-sm font-bold text-gray-900">{todayAttendance?.[0]?.shift}</p> */}
          </div>
          <div className="text-center bg-gray-200 border-1 border-gray-200  px-2 py-4 rounded-lg">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Check Out</p>
            <p className="text-xl font-bold text-gray-900">{lastCheckOut?.time ? formatTo24HourTime(lastCheckOut?.time) : "--:--"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={isCurrentlyCheckedIn ? handleCheckOut : handleCheckIn}
            className="w-full bg-black text-white py-3 rounded-lg font-semibold flex-1 flex items-center justify-center"
            disabled={checkInCheckOutPending || !firstCheckIn?.shift}
          >
            {checkInCheckOutPending || isRefetching ? (
              <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5"></span>
            ) : (
              isCurrentlyCheckedIn ? "Check Out" : "Check In"
            )}
          </button>


          <div className='flex flex-col flex-1 justify-center items-center bg-gray-200 border-1 border-gray-200  px-2 py-4 rounded-lg'>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Hours</p>
            <p className="text-xl font-bold text-gray-900">
              {getTotalTime()}</p>
          </div>

        </div>
        {/* Quick Links */}
        <div className="mb-5">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Quick Links</h3>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <Link to="/webapp/leave-app" className="flex flex-col items-center group">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-2 group-hover:bg-gray-100 transition-colors">
                <Calendar className="w-6 h-6 text-gray-600" />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">My Leaves</span>
            </Link>

            <Link to="/webapp/attendance" className="flex flex-col items-center group">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-2 group-hover:bg-gray-100 transition-colors">
                <User className="w-6 h-6 text-gray-600" />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">Attendance</span>
            </Link>

            <Link to="/webapp/salary-slip-app" className="flex flex-col items-center group">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-2 group-hover:bg-gray-100 transition-colors">
                <DollarSign className="w-6 h-6 text-gray-600" />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">Salary Slip</span>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Link to="/webapp/shift-request" className="flex flex-col items-center group">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-2 group-hover:bg-gray-100 transition-colors">
                <ArrowUpDown className="w-6 h-6 text-gray-600" />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">My Shift</span>
            </Link>

            <Link to="/webapp/expenses-app" className="flex flex-col items-center group">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-2 group-hover:bg-gray-100 transition-colors">
                <Receipt className="w-6 h-6 text-gray-600" />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">Expenses</span>
            </Link>

            <Link to="/webapp/policies" className="flex flex-col items-center group">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-2 group-hover:bg-gray-100 transition-colors">
                <Shield className="w-6 h-6 text-gray-600" />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">Policies</span>
            </Link>
          </div>
        </div>

        {/* Leave Balance */}

        {leaveBalance && <LeaveProgress leaveData={leaveBalance as LeaveData} />}


        {/* Attendance Summary */}
        <div className="bg-gray-200 rounded-xl p-4 shadow-sm mb-4 sm:mb-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Attendance</h3>
            <Link to="/webapp/attendance" className="text-gray-500 text-sm font-semibold hover:text-gray-600">
              View Details
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center bg-white p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-gray-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900">22</p>
              <p className="text-xs font-medium text-gray-600">Present Days</p>
            </div>

            <div className="text-center bg-white p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-gray-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900">3</p>
              <p className="text-xs font-medium text-gray-600">Absent Days</p>
            </div>

            <div className="text-center bg-white p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-gray-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900">96%</p>
              <p className="text-xs font-medium text-gray-600">Attendance</p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">This Month Average Hours:</span>
              <span className="font-semibold text-gray-900">8h 12m</span>
            </div>
          </div>
        </div>

        {/* Pending Expense Claims */}
        {expenseData?.length > 0 && <div className="bg-gray-200 rounded-xl p-4 shadow-md border border-gray-100 mb-4 sm:mb-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Unpaid Expense Claims</h3>
            <Link to="/webapp/expenses-app" className="text-gray-500 text-sm font-semibold hover:text-gray-600">
              View All
            </Link>
          </div>



          <div className="space-y-3">

            {expenseData?.map((item: { name: string, creation: string, total_claimed_amount: string, status: string }) => {
              // const styles = statusStyles[item.status as keyof typeof statusStyles] || statusStyles.draft;

              return (
                <div key={item?.name} className={`flex items-center justify-between p-3 bg-white rounded-lg border`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center`}>
                      <Check className={`w-4 h-4 gb-gray-500`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{item?.name}</p>
                      <p className="text-xs text-gray-600">{formatDateString(item?.creation)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{item?.total_claimed_amount} Rs</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-xl text-xs font-medium bg-gray-200 text-gray-500`}>
                      {item?.status}
                    </span>
                  </div>
                </div>
              );
            })}

          </div>
        </div>}

      </div>

    </div>
  );
};

export default MobileDashboard;


const LeaveProgress = ({ leaveData }: LeaveProgressProps) => {
  return (
    <div className="bg-gray-200 rounded-xl p-4 shadow-sm mb-4 sm:mb-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">Leave Balance</h3>
        <Link to="/webapp/leave-app" className="text-gray-500 text-sm font-semibold hover:text-gray-600">
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
                    className={`bg-black h-full rounded-lg transition duration-500`}
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
