import {
  addMonths,
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Calendar,
  Shield,
  CheckCircle,
  AlertCircle,
  Timer,
  Clock8,
} from "lucide-react";
import { useState } from "react";
import { useGetQuickAttendanceSummary } from "../../hooks/useAttendance";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import useCurrentUser from "../../hooks/useCurrentUser";
// import { useNavigate } from "react-router"

const AttendanceSummary = () => {
  // const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date());
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );

  const { data: employeeAttendanceSummary } = useGetQuickAttendanceSummary(
    currentEmployee?.employee as string,
    format(startOfMonth(currentDate), "yyyy-MM-dd"),
    format(endOfMonth(currentDate), "yyyy-MM-dd")
  );

  const goToPreviousMonth = () => {
    setCurrentDate((prev) => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate((prev) => addMonths(prev, 1));
  };
  return (
    <>
      <div className="min-h-screen bg-white">
        {/* Header Card */}
        <div className=" mb-4 ">
          {/* Date Navigation */}
          <div className="flex items-center justify-between mb-4 border-b-2 bg-white border-gray-200 p-4">
            <button
              className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200"
              onClick={goToPreviousMonth}
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>

            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">
                {format(currentDate, "MMMM yyyy")}
              </h1>
              <p className="text-sm text-gray-500 mt-1">Attendance Overview</p>
            </div>

            <button
              className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200"
              onClick={goToNextMonth}
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Statistics Grid */}
          <div className="space-y-3 border-b-2 bg-white border-gray-200 p-4 pt-0">
            <h2 className="text-xl font-semibold">Quick Summary</h2>

            {/* First Row */}
            <div className="grid grid-cols-3 gap-3">
              {/* Present Days - Green */}
              <div className="text-center bg-green-50 border-2 border-green-100 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-800">
                  {employeeAttendanceSummary?.present || 0}
                </p>
                <p className="text-xs font-medium text-green-700">
                  Present Days
                </p>
              </div>
              {/* Absent Days - Red */}
              <div className="text-center bg-red-50 border-2 border-red-100 p-3 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-red-800">
                  {employeeAttendanceSummary?.absent || 0}
                </p>
                <p className="text-xs font-medium text-red-700">Absent Days</p>
              </div>
              {/* Avg. Overtime - Indigo */}
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

            {/* Second Row */}
            <div className="grid grid-cols-3 gap-3">
              {/* Leaves - Orange */}
              <div className="text-center bg-orange-50 border-2 border-orange-100 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-orange-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-orange-800">
                  {employeeAttendanceSummary?.leaves || 0}
                </p>
                <p className="text-xs font-medium text-orange-700">Leaves</p>
              </div>

              {/* Avg. Work Duration - Blue */}
              <div className="text-center bg-blue-50 border-2 border-blue-100 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-blue-800">
                  {employeeAttendanceSummary?.avg_working_hours || 0}
                </p>{" "}
                <p className="text-xs font-medium text-blue-700">
                  Avg. Work Duration
                </p>
              </div>

              {/* Avg. Late By - purple */}
              <div className="text-center bg-purple-50 border-2 border-purple-100 p-3 rounded-lg">
                <Clock8 className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-purple-800">
                  {employeeAttendanceSummary?.avg_late_by || 0}
                </p>
                <p className="text-xs font-medium text-purple-700">
                  Avg. Late By
                </p>
              </div>
            </div>
          </div>

          {/* Attendance View Button */}
        </div>

        {/* Settings Card */}
        <div className=" border-b-2 bg-white border-gray-200 p-4 ">
          <div className="space-y-4">
            {/* Attendance Method */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="p-2 bg-gray-200 rounded-lg">
                <Clock className="h-4 w-4 text-gray-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  Attendance Method
                </h3>
                <p className="text-gray-600 text-sm">
                  Biometric verification required
                </p>
                <p className="text-gray-600 text-sm">GEOFENCING FOR CHECK-IN</p>
              </div>
            </div>

            {/* Shift */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="p-2 bg-gray-200 rounded-lg">
                <Users className="h-4 w-4 text-gray-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  Current Shift
                </h3>
                <p className="text-gray-600 text-sm">General shift schedule</p>
              </div>
            </div>

            {/* Policy */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="p-2 bg-gray-200 rounded-lg">
                <Shield className="h-4 w-4 text-gray-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  Attendance Policies
                </h3>
                <div>
                  <button className=" w-full text-left px-3 py-1 text-sm font-medium text-gray-800 hover:text-black hover:bg-gray-100 rounded-lg transition-colors">
                    GENERAL SHIFT POLICY
                  </button>
                </div>
              </div>
            </div>

            {/* Weekly Off */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="p-2 bg-gray-200 rounded-lg">
                <Calendar className="h-4 w-4 text-gray-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  Week Off & Week Off Pattern
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2">
                    <span className="text-sm text-gray-900">Off Days</span>
                    <span className="text-sm font-medium text-gray-900">
                      1st, 2nd, 4th Sunday
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="p-2 bg-gray-200 rounded-lg">
                <Timer className="h-4 w-4 text-gray-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  Overtime Policies
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AttendanceSummary;
