import {
  addMonths,
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
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

import {
  useAllAttendance,
  useGetPolicyForDate,
  useGetQuickAttendanceSummary,
} from "../../hooks/useAttendance";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import useCurrentUser from "../../hooks/useCurrentUser";
import { useNavigate } from "react-router-dom";
import { useScreenSize } from "../../hooks/useScreenSize";
import SummaryCard from "./SummaryCard";

const AttendanceSummary = () => {
  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();
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
  const { data: attendancePolicy } = useGetPolicyForDate({
    employee: currentEmployee?.employee,
    as_of: format(new Date(), "yyyy-MM-dd"),
  });
  const goToPreviousMonth = () => {
    setCurrentDate((prev) => subMonths(prev, 1));
  };
  const goToNextMonth = () => setCurrentDate((prev) => addMonths(prev, 1));

  const start = format(startOfDay(new Date()), "yyyy-MM-dd HH:mm:ss");
  const end = format(endOfDay(new Date()), "yyyy-MM-dd HH:mm:ss");

  const { data: teamDataInfo } = useAllAttendance(
    ["attendance_date", "status"],
    [["attendance_date", "between", [start, end]]]
  );

  function countStatus(statusToCount: string) {
    return teamDataInfo?.reduce((count: number, record: { status: string }) => {
      return record.status === statusToCount ? count + 1 : count;
    }, 0);
  }

  const quickSummaryData = [
    {
      icon: CheckCircle,
      color: "green",
      label: "Present Days",
      value: employeeAttendanceSummary?.present || 0,
    },
    {
      icon: AlertCircle,
      color: "red",
      label: "Absent Days",
      value: employeeAttendanceSummary?.absent || 0,
    },
    {
      icon: Calendar,
      color: "orange",
      label: "Leaves",
      value: employeeAttendanceSummary?.leaves || 0,
    },
    {
      icon: Timer,
      color: "yellow",
      label: "Avg. Overtime",
      value: employeeAttendanceSummary?.avg_overtime || 0,
    },
    {
      icon: Clock,
      color: "blue",
      label: "Avg. Work Duration",
      value: employeeAttendanceSummary?.avg_working_hours || 0,
    },
    {
      icon: Clock8,
      color: "purple",
      label: "Avg. Late By",
      value: employeeAttendanceSummary?.avg_late_by || 0,
    },
  ];

  const teamSummaryData = [
    {
      icon: CheckCircle,
      color: "green",
      label: "Logged In",
      value: countStatus("Present") || 0,
    },
    {
      icon: AlertCircle,
      color: "red",
      label: "Not Logged In",
      value: countStatus("Absent") || 0,
    },
    {
      icon: Calendar,
      color: "orange",
      label: "On Leave",
      value: countStatus("On Leave") || 0,
    },
  ];

  const settingsData = [
    {
      icon: Clock,
      title: "Attendance Method",
      details: ["Biometric verification required", "GEOFENCING FOR CHECK-IN"],
    },
    {
      icon: Users,
      title: "Current Shift",
      details: ["General shift schedule"],
    },
    {
      icon: Shield,
      title: "Attendance Policy",
      details: ["GENERAL SHIFT POLICY"],
    },
    {
      icon: Calendar,
      title: "Week Off",
      details: ["1st, 2nd, 4th Sunday"],
    },
    {
      icon: Timer,
      title: "Overtime Policy",
      details: [],
    },
  ];

  return (
    <>
      <div className="min-h-screen bg-white">
        {isDesktop ? (
          // Desktop Layout
          <div className="flex p-4">
            {/* Left/Main Column */}
            <div className="flex-1 space-y-6">
              {/* Date Navigation */}
              <div className="flex items-center justify-between mb-4 bg-white border border-gray-200 p-4 rounded-xl">
                <button
                  className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                  onClick={goToPreviousMonth}
                >
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
                <div className="text-center">
                  <h1 className="text-xl font-bold text-gray-900">
                    {format(currentDate, "MMMM yyyy")}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Attendance Overview
                  </p>
                </div>
                <button
                  className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                  onClick={goToNextMonth}
                >
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              {/* Quick Summary */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <h2 className="text-xl font-semibold">Quick Summary</h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {quickSummaryData.map((data, index) => (
                    <SummaryCard
                      key={index}
                      icon={data.icon}
                      iconColor={`text-${data.color}-600`}
                      bgColor={`bg-${data.color}-50`}
                      borderColor={`border-${data.color}-100`}
                      value={data.value}
                      label={data.label}
                      isDesktop={isDesktop}
                      isMetric={true}
                    />
                  ))}
                </div>
              </div>

              {/* Today's Team Summary */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <h2 className="text-xl font-semibold">Today's Team Summary</h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {teamSummaryData.map((data, index) => (
                    <SummaryCard
                      key={index}
                      icon={data.icon}
                      iconColor={`text-${data.color}-600`}
                      bgColor={`bg-${data.color}-50`}
                      borderColor={`border-${data.color}-100`}
                      value={data.value}
                      label={data.label}
                      isDesktop={isDesktop}
                      isMetric={true}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Settings */}
            <div className="w-1/3 ml-6 bg-white border border-gray-200 rounded-xl p-4">
              <h2 className="text-xl font-semibold mb-4">Settings</h2>
              <div className="space-y-4">
                {settingsData.map((setting, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200"
                  >
                    <div className="p-2 bg-gray-200 rounded-lg">
                      <setting.icon className="h-4 w-4 text-gray-700" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {setting.title}
                      </h3>
                      {setting.details.map((detail, detailIndex) => (
                        <p key={detailIndex} className="text-gray-600 text-sm">
                          {detail}
                        </p>
                      ))}
                      {setting.title === "Attendance Policy" &&
                        attendancePolicy && (
                          <div>
                            <button
                              onClick={() =>
                                navigate(
                                  `/webapp/attendance/attendance-policies?policy=${attendancePolicy}`
                                )
                              }
                              className="w-full text-left px-3 py-1 text-sm font-medium text-gray-800 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              {attendancePolicy}
                            </button>
                          </div>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Mobile Layout
          <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="mb-4">
              {/* Date Navigation */}
              <div className="flex items-center justify-between mb-4 border-b-1 bg-white border-gray-200 p-4">
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
                  <p className="text-sm text-gray-500 mt-1">
                    Attendance Overview
                  </p>
                </div>
                <button
                  className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200"
                  onClick={goToNextMonth}
                >
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              {/* Quick Summary */}
              <div className="space-y-3 border-b-1 bg-white border-gray-200 p-4 pt-0">
                <h2 className="text-xl font-semibold">Quick Summary</h2>
                <div className="grid grid-cols-3 gap-3">
                  {quickSummaryData.map((data, index) => (
                    <SummaryCard
                      key={index}
                      icon={data.icon}
                      iconColor={`text-${data.color}-600`}
                      bgColor={`bg-${data.color}-50`}
                      borderColor={`border-${data.color}-100`}
                      value={data.value}
                      label={data.label}
                      isDesktop={isDesktop}
                      isMetric={true}
                    />
                  ))}
                </div>
              </div>

              {/* Team Summary */}
              <div className="space-y-3 border-b-1 bg-white border-gray-200 p-4 pt-0">
                <h2 className="text-xl font-semibold">Today's Team Summary</h2>
                <div className="grid grid-cols-3 gap-3">
                  {teamSummaryData.map((data, index) => (
                    <SummaryCard
                      key={index}
                      icon={data.icon}
                      iconColor={`text-${data.color}-600`}
                      bgColor={`bg-${data.color}-50`}
                      borderColor={`border-${data.color}-100`}
                      value={data.value}
                      label={data.label}
                      isDesktop={isDesktop}
                      isMetric={true}
                    />
                  ))}
                </div>
              </div>

              {/* Settings */}
              <div className="bg-white border-gray-200 p-4">
                <div
                  className={isDesktop ? "grid grid-cols-2 gap-4" : "space-y-4"}
                >
                  {settingsData.map((setting, index) => {
                      if(setting.title ==="Attendance Policy" && attendancePolicy){
                        return<div>
                        <button
                          onClick={() =>
                            navigate(
                              `/webapp/attendance/attendance-policies?policy=${attendancePolicy}`
                            )
                          }
                          className="w-full text-left px-3 py-1 text-sm font-medium text-gray-800 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          {attendancePolicy}
                        </button>
                      </div>
                      }

                  return<div
                      key={index}
                      className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200"
                    >
                      <div className="p-2 bg-gray-200 rounded-lg">
                        <setting.icon className="h-4 w-4 text-gray-700" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {setting.title}
                        </h3>
                        {setting.details.map((detail, detailIndex) => (
                          <p
                            key={detailIndex}
                            className="text-gray-600 text-sm"
                          >
                            {detail}
                          </p>
                        ))}
  
                      </div>
                    </div>
})}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AttendanceSummary;
