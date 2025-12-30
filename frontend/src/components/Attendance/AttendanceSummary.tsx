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
} from "lucide-react";
import { useMemo, useState } from "react";


import {
  useAllAttendance,
  useGetEmployeeShift,
  useGetPolicyForDate,
  useGetQuickAttendanceSummary,
  useReqValidationsForOvertimeRequest,
} from "../../hooks/useAttendance";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import useCurrentUser from "../../hooks/useCurrentUser";
import { useNavigate } from "react-router-dom";
import { useScreenSize } from "../../hooks/useScreenSize";
import SummaryCard from "./SummaryCard";
import AttendanceChart from "../AttendanceChart";
import QuickActionCard, { QuickActionCardData } from "./QuickActionCard";
import AttendanceRequestFormV2 from "./AttendanceRequest/AttendanceRequestFormV2";
import { ViewAll } from "../shared/atoms/ViewAll";
import CreateOvertimeRequest from "./OvertimeRequests/CreateOvertimeRequest";

const AttendanceSummary = () => {
  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );

  const { data: employeeShift } = useGetEmployeeShift(
    currentEmployee?.user_id || ""
  );
  const { data: employeeOvertimePolicy } = useReqValidationsForOvertimeRequest(
    currentEmployee?.employee || ""
  );

  const { data: employeeAttendanceSummary } = useGetQuickAttendanceSummary(
    currentEmployee?.employee as string,
    format(startOfMonth(currentDate), "yyyy-MM-dd"),
    format(endOfMonth(currentDate), "yyyy-MM-dd")
  );
  const { data: attendancePolicy } = useGetPolicyForDate({
    employee: currentEmployee?.employee,
    as_of: format(new Date(), "yyyy-MM-dd"),
  }, !!currentEmployee?.employee);
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

  const [showAttendanceRequestModal, setShowAttendanceRequestModal] = useState(false);
  const [showOvertimeRequest, setShowOvertimeRequest] = useState(false);

  const quickAction: {
    section: string;
    cards: QuickActionCardData[];
  } = useMemo(() => ({
    section: "Quick Actions",
    cards: [
      {
        id: "my_requests",
        title: "My Attendance",
        subtitle: "Pending Requests",
        value: employeeAttendanceSummary?.my_attendance_requests || 0,
        icon: "FileText",
        color: "green",
        background: "bg-green-50",
        actions: [
          { label: "View My Requests", type: "link", href: "/webapp/attendance/attendance-request" },
          { label: "+ New Request", type: "primary", onClick: () => setShowAttendanceRequestModal(true) }
        ]
      },
      {
        id: "team_requests",
        title: "Team Attendance",
        subtitle: "Pending Requests",
        value: employeeAttendanceSummary?.team_attendance_requests || 0,
        icon: "Users",
        color: "yellow",
        background: "bg-yellow-50",
        actions: [
          { label: "Manage Team Requests", type: "link", href: "/webapp/attendance/team-attendance-requests" },
        ]
      },
      {
        id: "my_overtime",
        title: "My Overtime",
        subtitle: "Pending Requests",
        value: employeeAttendanceSummary?.my_overtime_requests || 0,
        icon: "FileText",
        color: "blue",
        background: "bg-blue-50",
        actions: [
          { label: "View My Overtime", type: "link", href: "/webapp/attendance/my-overtime-requests" },
          { label: "+ Log Overtime", type: "primary", onClick: () => setShowOvertimeRequest(true) }
        ]
      },
      {
        id: "team_overtime",
        title: "Team Overtime",
        subtitle: "Pending Requests",
        value: employeeAttendanceSummary?.team_overtime_requests || 0,
        icon: "Users",
        color: "purple",
        background: "bg-purple-50",
        actions: [
          { label: "Manage Team Overtime", type: "link", href: "/webapp/attendance/team-overtime-requests" },
        ]
      },
      {
        id: "shifts",
        title: "Shifts",
        subtitle: "Shift schedule overview",
        value: null,
        icon: "Calendar",
        color: "indigo",
        background: "bg-indigo-50",
        actions: [
          { label: "View My Shifts", type: "link", href: "/webapp/shift-request/all-shifts-dashboard" },
        ]
      }
    ]
  }), [employeeAttendanceSummary]);

  const getAttendanceMethod = () => {
    const methods = [];
    if (currentEmployee?.custom_enable_web_clockin) {
      methods.push("Web Clockin");
    }
    if (currentEmployee?.custom_allow_mobile_checkin) {
      methods.push("Mobile Clockin");
    }

    return methods;
  };

  const settingsData = [
    {
      icon: Clock,
      title: "Attendance Method",
      details: getAttendanceMethod(),
    },
    {
      icon: Users,
      title: "Current Shift",
      details: employeeShift ? [employeeShift?.shift] : [],
    },
    {
      icon: Shield,
      title: "Attendance Policy",
      details: attendancePolicy ? [attendancePolicy] : [],
    },
    {
      icon: Calendar,
      title: "Week Off",
      details: [currentEmployee?.custom_weekly_off || ""],
    },
    {
      icon: Timer,
      title: "Overtime Policy",
      details: [employeeOvertimePolicy || ""],
    },
  ];

  const getNavigatableSettingsButton = (
    settingType: string,
    data?: string
  ) => {
    if (!data) return null;

    let path: string | null = null;

    switch (settingType) {
      case "Attendance Policy":
        path = `/webapp/attendance/attendance-policies?policy=${data}`;
        break;

      case "Overtime Policy":
        path = `/webapp/attendance/overtime-policies?policy=${data}`;
        break;

      default:
        return null;
    }

    return (
      <button
        type="button"
        onClick={() => navigate(path!)}
        className="w-full text-left text-sm text-gray-800
                 hover:text-blue-600 rounded-lg transition-colors"
      >
        {data}
      </button>
    );
  };


  return (
    <>
      <div className="bg-gray-200 p-4">
        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-4 bg-white border border-gray-200 p-4 rounded-xl">
          <button
            className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
            onClick={goToPreviousMonth}
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="text-center">
            <h1 className="base-title md:text-xl font-bold text-gray-900">
              {format(currentDate, "MMMM yyyy")}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Attendance Overview</p>
          </div>
          <button
            className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
            onClick={goToNextMonth}
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <AttendanceChart
          present={employeeAttendanceSummary?.present || 0}
          absent={employeeAttendanceSummary?.absent || 0}
          leaves={employeeAttendanceSummary?.leaves || 0}
          week_offs={employeeAttendanceSummary?.week_offs || 0}
          avg_late_by={Number(employeeAttendanceSummary?.avg_late_by) || 0}
          avg_working_hours={
            Number(employeeAttendanceSummary?.avg_working_hours) || 0
          }
          avg_overtime={Number(employeeAttendanceSummary?.avg_overtime) || 0}
          selectedMonth={currentDate}
        />
        {isDesktop ? (
          // Desktop Layout
          <div className="flex py-4">
            {/* Left/Main Column */}
            <div className="flex-1 space-y-6">
              {/* Today's Team Summary */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex">
                  <h2 className="module-title">Today's Team Summary</h2>
                  <ViewAll className="ml-auto" title="View Team Calender" to="/webapp/attendance/team-attendance" />
                </div>
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
                <div className="space-y-3 border-b-1 bg-white border-gray-200 py-4 pt-0 mt-5">
                  <h2 className="module-title">Quick Actions</h2>
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {quickAction.cards.map(card => (
                      <QuickActionCard key={card.id} {...card} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Settings */}
            <div className="w-1/3 ml-6 bg-white border border-gray-200 rounded-xl p-4 mb-4">
              <h2 className="module-title mb-4">Settings</h2>
              <div className="space-y-4">
                {settingsData.map((setting, index) => {
                  const Icon = setting.icon;

                  return (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200"
                    >
                      <div className="p-2 bg-gray-200 rounded-lg">
                        <Icon className="h-4 w-4 text-gray-700" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {setting.title}
                        </h3>

                        {setting.details.length > 0 ? (
                          setting.details.map((detail, detailIndex) =>
                            getNavigatableSettingsButton(setting.title, detail) ?? (
                              <p
                                key={detailIndex}
                                className="text-sm text-gray-700"
                              >
                                {detail}
                              </p>
                            )
                          )
                        ) : (
                          <p className="text-sm text-gray-500">
                            No policy defined
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          // Mobile Layout
          <div className="bg-white p-4 mt-4">
            {/* Header */}
            <div className="mb-4">
              {/* Team Summary */}
              <div className="space-y-3 border-b bg-white border-gray-200 pt-0 mt-4">

                <div className="flex">
                  <h2 className="base-title">Today's Team Summary</h2>
                  <ViewAll className="ml-auto" title="View Team Calender" to="/webapp/attendance/team-attendance" />
                </div>
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

                <div className="space-y-3  bg-white border-gray-200 py-4 pt-0 mt-4">
                  <h2 className="base-title">Quick Actions</h2>
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {quickAction.cards.map(card => (
                      <QuickActionCard key={card.id} {...card} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div className="bg-white border-gray-200 py-4">
                <div
                  className={isDesktop ? "grid grid-cols-2 gap-4" : "space-y-4"}
                >
                  {settingsData.map((setting, index) => {
                    const Icon = setting.icon;

                    return (
                      <div
                        key={index}
                        className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200"
                      >
                        <div className="p-2 bg-gray-200 rounded-lg">
                          <Icon className="h-4 w-4 text-gray-700" />
                        </div>
                        <div className="flex-1">
                          <h3 className="card-title mb-1">{setting.title}</h3>

                          {setting.details.length > 0 ? (
                            setting.details.map((detail, detailIndex) =>
                              getNavigatableSettingsButton(setting.title, detail) ?? (
                                <p
                                  key={detailIndex}
                                  className="text-sm text-gray-700"
                                >
                                  {detail}
                                </p>
                              )
                            )

                          ) : (
                            <p className="text-sm text-gray-500">
                              No policy assigned
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {showAttendanceRequestModal && (
          <AttendanceRequestFormV2
            onClose={() => setShowAttendanceRequestModal(false)}
          />
        )}
        {showOvertimeRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <CreateOvertimeRequest
                onCancel={() => setShowOvertimeRequest(false)}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AttendanceSummary;
