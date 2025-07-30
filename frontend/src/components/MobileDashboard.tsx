import React, { useState, useEffect } from 'react';
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
import { useAttendance } from '../hooks/useAttendance';
import { useGetLeaveBalance } from '../hooks/useLeaves';
import { useExpenseClaim } from '../hooks/useExpense';
import { formatDateString } from '../utils/helperUtils';
import defaultProfile from "../assets/user.png";

const statusStyles = {
  draft: {
    bg: 'bg-orange-50',
    border: 'border-orange-100',
    iconBg: 'bg-orange-200',
    iconText: 'text-orange-600',
    badgeBg: 'bg-orange-200',
    badgeText: 'text-orange-800',
  },
  approved: {
    bg: 'bg-green-50',
    border: 'border-green-100',
    iconBg: 'bg-green-100',
    iconText: 'text-green-600',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-800',
  },
  rejected: {
    bg: 'bg-red-50',
    border: 'border-red-100',
    iconBg: 'bg-red-100',
    iconText: 'text-red-600',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-800',
  },
};


const MobileDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [checkInTime, setCheckInTime] = useState<string>('09:05 AM');
  const [checkOutTime, setCheckOutTime] = useState<string>('--:--');
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(true);
  const [checkInTimestamp, setCheckInTimestamp] = useState<Date>(new Date());
  const [checkOutTimestamp, setCheckOutTimestamp] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Get unread notifications count
  const { data: unreadCount = 0 } = useUnreadNoticesCount();
  const { data: expenseData } = useExpenseClaim([["status", "=", "draft"]])
  // Get current user data
  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();

  const filters = currentUser?.name ? [["owner", "=", currentUser?.name], ["attendance_date", "=", new Date().toISOString().split("T")[0]]] : [];
  const { data: todayAttendance } = useAttendance(filters as any, {
    enabled: !!currentUser?.name,
  });
  const { data: leaveBalance } = useGetLeaveBalance(todayAttendance?.[0]?.employee)


  // Timer effect to update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // // Initialize check-in timestamp on component mount
  // useEffect(() => {
  //   const now = new Date();
  //   now.setHours(9, 5, 0, 0); // Set to 09:05 AM today
  //   setCheckInTimestamp(now);
  // }, []);

  const formatElapsedTime = (startTime: Date, endTime: Date = currentTime): string => {
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getShiftStartTime = (baseDate: Date): Date => {
    const shiftStart = new Date(baseDate);
    shiftStart.setHours(10, 0, 0, 0); // 10:00 AM shift start
    return shiftStart;
  };

  const getEffectiveStartTime = (): Date => {
    const shiftStartTime = getShiftStartTime(checkInTimestamp);

    // If checked in before shift starts, use shift start time
    // If checked in after shift starts, use actual check-in time
    return checkInTimestamp.getTime() < shiftStartTime.getTime() ? shiftStartTime : checkInTimestamp;
  };

  const getTotalHours = (): string => {
    if (checkOutTimestamp && !todayAttendance?.[0]?.in_time) {
      // User has checked out, calculate from effective start time
      const effectiveStart = getEffectiveStartTime();
      return formatElapsedTime(effectiveStart, checkOutTimestamp);
    } else if (todayAttendance?.[0]?.in_time) {
      // User is checked in, calculate from effective start time
      const effectiveStart = getEffectiveStartTime();

      // Only count time if current time is after shift start
      const shiftStartTime = getShiftStartTime(checkInTimestamp);
      if (currentTime.getTime() < shiftStartTime.getTime()) {
        return '00:00:00'; // Show 00:00:00 until shift starts
      }

      return formatElapsedTime(effectiveStart, currentTime);
    } else {
      // User hasn't checked in yet
      return '00:00:00';
    }
  };

  const handleCheckIn = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    setCheckInTime(timeString);
    setCheckInTimestamp(now);
    setCheckOutTimestamp(null);
    setIsCheckedIn(true);
  };

  const handleCheckOut = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    setCheckOutTime(timeString);
    setCheckOutTimestamp(now);
    setIsCheckedIn(false);
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
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
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

      {/* Check In/Out Section */}
      <div className="px-4 py-3">

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center bg-gray-100 border-1 border-gray-200 p-3 rounded-xl">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Shift Start</p>
            <p className="text-xl font-bold text-gray-900">{todayAttendance?.[0]?.in_time || "--:--"}</p>
          </div>
          <div className="text-center bg-gray-100 border-1 border-gray-200 p-3 rounded-xl">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Check In</p>
            <p className="text-xl font-bold text-gray-900">{todayAttendance?.[0]?.out_time || "--:--"}</p>
          </div>
        </div>


        {/* Shift Information */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="text-center bg-gray-100 border-1 border-gray-200 p-3 rounded-xl">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Shift End</p>
            <p className="text-xl font-bold text-gray-900 ">--:--</p>
            {/* <p className="text-sm font-bold text-gray-900">{todayAttendance?.[0]?.shift}</p> */}
          </div>
          <div className="text-center bg-gray-100 border-1 border-gray-200 p-3 rounded-xl">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Check Out</p>
            <p className="text-xl font-bold text-gray-900">--:--</p>
          </div>
        </div>
        {/* Check In/Out Button */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={todayAttendance?.[0]?.in_time ? handleCheckOut : handleCheckIn}
            className={`w-full bg-black text-white py-3 rounded-lg font-semibold flex-1`}
          >
            {todayAttendance?.[0]?.in_time ? 'Check Out' : 'Check In'}
          </button>
          <div className='flex flex-col flex-1 justify-center items-center bg-gray-100 border-1 border-gray-200 p-3 rounded-xl'>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Hours</p>
            <p className="text-xl font-bold text-gray-900">{getTotalHours()}</p>
          </div>

        </div>
        {/* Quick Links */}
        <div className="mb-5">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Quick Links</h3>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <Link to="/webapp/leave-app" className="flex flex-col items-center group">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-2 group-hover:bg-gray-100 transition-colors shadow-sm">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">My Leaves</span>
            </Link>

            <Link to="/webapp/attendance" className="flex flex-col items-center group">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-2 group-hover:bg-green-100 transition-colors shadow-sm">
                <User className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">Attendance</span>
            </Link>

            <Link to="/webapp/salary-slip-app" className="flex flex-col items-center group">
              <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center mb-2 group-hover:bg-yellow-100 transition-colors shadow-sm">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">Salary Slip</span>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Link to="/webapp/shift-request" className="flex flex-col items-center group">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-2 group-hover:bg-purple-100 transition-colors shadow-sm">
                <ArrowUpDown className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">My Shift</span>
            </Link>

            <Link to="/webapp/expenses-app" className="flex flex-col items-center group">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mb-2 group-hover:bg-orange-100 transition-colors shadow-sm">
                <Receipt className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">Expenses</span>
            </Link>

            <Link to="/webapp/policies" className="flex flex-col items-center group">
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-2 group-hover:bg-red-100 transition-colors shadow-sm">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">Policies</span>
            </Link>
          </div>
        </div>

        {/* Leave Balance */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4 sm:mb-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Leave Balance</h3>
            <Link to="/webapp/leave-app" className="text-primary text-sm font-semibold hover:text-primary-600">
              View All
            </Link>
          </div>
          {leaveBalance && <LeaveProgress leaveData={leaveBalance as LeaveData} />}
        </div>


        {/* Attendance Summary */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4 sm:mb-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Attendance</h3>
            <Link to="/webapp/attendance" className="text-primary text-sm font-semibold hover:text-primary-600">
              View Details
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center bg-green-50 p-3 rounded-lg border border-green-100">
              <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900">22</p>
              <p className="text-xs font-medium text-gray-600">Present Days</p>
            </div>

            <div className="text-center bg-red-50 p-3 rounded-lg border border-red-100">
              <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900">3</p>
              <p className="text-xs font-medium text-gray-600">Absent Days</p>
            </div>

            <div className="text-center bg-blue-50 p-3 rounded-lg border border-blue-100">
              <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-1" />
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
        {expenseData?.length > 0 && <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4 sm:mb-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Unpaid Expense Claims</h3>
            <Link to="/webapp/expenses-app" className="text-primary text-sm font-semibold hover:text-primary-600">
              View All
            </Link>
          </div>



          <div className="space-y-3">

            {expenseData?.map((item: { name: string, creation: string, total_claimed_amount: string, status: string }) => {
              const styles = statusStyles[item.status as keyof typeof statusStyles] || statusStyles.draft;

              return (
                <div className={`flex items-center justify-between p-3 ${styles.bg} rounded-lg border ${styles.border}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 ${styles.iconBg} rounded-lg flex items-center justify-center`}>
                      <Check className={`w-4 h-4 ${styles.iconText}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{item?.name}</p>
                      <p className="text-xs text-gray-600">{formatDateString(item?.creation)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{item?.total_claimed_amount} Rs</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-xl text-xs font-medium ${styles.badgeBg} ${styles.badgeText}`}>
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

type LeaveType = {
  allocated_leaves: number;
  balance_leaves: number;
};

export type LeaveData = {
  [leaveName: string]: LeaveType;
};

type LeaveProgressProps = {
  leaveData: LeaveData;
};

const LeaveProgress = ({ leaveData }: LeaveProgressProps) => {
  return (
    <div className="space-y-4">
      {Object.entries(leaveData).map(
        ([leaveType, { allocated_leaves, balance_leaves }], index) => {
          const percentage =
            allocated_leaves > 0
              ? (balance_leaves / allocated_leaves) * 100
              : 0;

          const progressBarColors = [
            "bg-primary",
            "bg-green-500",
            "bg-yellow-500",
            "bg-blue-500",
            "bg-red-500",
          ];

          const colorClass = progressBarColors[index % progressBarColors.length];

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
                  className={`${colorClass} h-full rounded-lg transition-all duration-300`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        }
      )}
    </div>
  );
};
