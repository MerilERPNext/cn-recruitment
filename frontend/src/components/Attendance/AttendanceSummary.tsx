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
  useGetEmployeeShift,
  useGetPolicyForDate,
  useGetQuickAttendanceSummary,
  useGetTeamCheckinSummary,
  useReqValidationsForOvertimeRequest,
  useWeeklyOff,
} from "../../hooks/useAttendance";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import useCurrentUser from "../../hooks/useCurrentUser";
import { useScreenSize } from "../../hooks/useScreenSize";
import SummaryCard from "./SummaryCard";
import QuickActionCard, { QuickActionCardData } from "./QuickActionCard";
import AttendanceRequestFormV2 from "./AttendanceRequest/AttendanceRequestFormV2";
import { ViewAll } from "../shared/atoms/ViewAll";
import CreateOvertimeRequest from "./OvertimeRequests/CreateOvertimeRequest";
import PolicyDrawer from "./PolicyDrawer";
import { Typography } from "../shared/atoms/Typography";
import { Card } from "../shared/atoms/Card";
import Button from "../shared/atoms/Button";
import { useFrappeDocumentList } from "../../hooks/useFrappeQuery";
import { Attendance } from "../../types/attendance";
// import EmployeeWorkingHoursBarChart from "./EmployeeWorkingHoursBarChart";
// import AttendanceSummaryCards from "./AttendanceSummaryCards";
import AttendanceChart from "../AttendanceChart";
import { useTargetUser } from "../../context/ViewedUserContext";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { isActionEnabled } from "../../utils/uiPermission";
import { DRAWER_SETTINGS } from "./constants";
import { createPortal } from "react-dom";

export interface PolicyDrawerConfig {
  title: string;
  doctypeName: string;
  targetDoctype: string;
}

const AttendanceSummary = () => {
  const { targetEmployeeId } = useTargetUser();

  const { isDesktop } = useScreenSize();
  const [currentDate, setCurrentDate] = useState(new Date());

  const [openPolicyDrawer, setOpenPolicyDrawer] = useState(false);

  const [policyDrawerConfig, setPolicyDrawerConfig] =
    useState<PolicyDrawerConfig | null>(null);

  const { data: currentUser } = useCurrentUser();

  const { data: currentEmployee } = useCurrentEmployeeAllDetails({
    user_id: currentUser?.name || "",
    name: targetEmployeeId || "",
    fields: ["employee", "user_id", "custom_allow_mobile_checkin", "custom_enable_web_clockin", "custom_weekly_off"],
  });

  const { data: userUiPermission } = useGetUiPermission("Attendance");
  const canCreateOvertimeRequest = isActionEnabled(
    userUiPermission,
    "create_overtime_request",
    "My Overtime",
  );
  const canCreateAttendanceRequest = isActionEnabled(
    userUiPermission,
    "create_attendance_request",
    "Attendance Summary",
  );

  const { data: employeeShift } = useGetEmployeeShift(
    currentEmployee?.user_id || "",
  );
  const { data: teamCheckInSummary } = useGetTeamCheckinSummary(
    currentEmployee?.user_id || "",
  );
  // TODO: Add working hours bar chart
  // const { data: employeeWorkingHours, isLoading: isEmployeeWorkingHoursLoading } = useGetEmployeeWorkingHours(
  //   currentEmployee?.user_id || "",
  //   format(startOfMonth(currentDate), "yyyy-MM-dd").toString() || "",
  //   format(endOfMonth(currentDate), "yyyy-MM-dd").toString() || "",
  // );

  const { data: employeeOvertimePolicy } = useReqValidationsForOvertimeRequest(
    currentEmployee?.employee || "",
  );

  const { data: employeeAttendanceSummary } = useGetQuickAttendanceSummary(
    currentEmployee?.employee as string,
    format(startOfMonth(currentDate), "yyyy-MM-dd"),
    format(endOfMonth(currentDate), "yyyy-MM-dd"),
  );
  const { data: attendancePolicy } = useGetPolicyForDate(
    {
      employee: currentEmployee?.employee,
      as_of: format(new Date(), "yyyy-MM-dd"),
    },
    !!currentEmployee?.employee,
  );
  const { data: weeklyOff } = useWeeklyOff(
    [["name", "=", currentEmployee?.custom_weekly_off]]
  );
  const { data: attendanceData } = useFrappeDocumentList("Attendance", {
    fields: ["*"],
    filters: [
      ["status", "=", "On Leave"],
      [
        "attendance_date",
        "between",
        [startOfDay(currentDate), endOfDay(currentDate)],
      ],
    ],
  });

  function useUniqueAttendanceLeaveCount(records: Attendance[]) {
    return useMemo(() => {
      if (!Array.isArray(records)) {
        return 0;
      }

      const attendanceLeaveSet = new Set();

      for (const record of records) {
        if (record.status === "On Leave") {
          attendanceLeaveSet.add(record.employee);
        }
      }

      return attendanceLeaveSet.size;
    }, [records]);
  }

  const goToPreviousMonth = () => {
    setCurrentDate((prev) => subMonths(prev, 1));
  };
  const goToNextMonth = () => setCurrentDate((prev) => addMonths(prev, 1));

  const teamSummaryData = [
    {
      icon: CheckCircle,
      color: "green",
      label: "Logged In",
      value: teamCheckInSummary?.data?.checked_in_count || 0,
    },
    {
      icon: AlertCircle,
      color: "red",
      label: "Not Logged In",
      value: teamCheckInSummary?.data?.not_checked_in_count || 0,
    },
    {
      icon: Calendar,
      color: "orange",
      label: "On Leave",
      value:
        useUniqueAttendanceLeaveCount((attendanceData as Attendance[]) || []) ||
        0,
    },
  ];

  const [showAttendanceRequestModal, setShowAttendanceRequestModal] =
    useState(false);
  const [showOvertimeRequest, setShowOvertimeRequest] = useState(false);

  const quickAction: {
    section: string;
    cards: QuickActionCardData[];
  } = useMemo(
    () => ({
      section: "Quick Actions",
      cards: [
        {
          id: "my_requests",
          title: "My Attendance",
          subtitle: "Pending Requests",
          value: employeeAttendanceSummary?.my_attendance_requests || 0,
          icon: "FileText",
          color: "text-green-500",
          background: "bg-green-50",
          actions: [
            {
              label: "View My Requests",
              type: "link",
              href: "/webapp/attendance/attendance-request",
            },
            {
              label: "+ New Request",
              type: "primary",
              disabled: !canCreateAttendanceRequest,
              onClick: () => setShowAttendanceRequestModal(true),
            },
          ],
        },
        {
          id: "team_requests",
          title: "Team Attendance",
          subtitle: "Pending Requests",
          value: employeeAttendanceSummary?.team_attendance_requests || 0,
          icon: "Users",
          color: "text-yellow-500",
          background: "bg-yellow-50",
          actions: [
            {
              label: "Manage Team Requests",
              type: "link",
              href: "/webapp/attendance/team-attendance-requests",
            },
          ],
        },
        {
          id: "my_overtime",
          title: "Planned Overtime",
          subtitle: "Pending Requests",
          value: employeeAttendanceSummary?.my_overtime_requests || 0,
          icon: "FileText",
          color: "text-blue-500",
          background: "bg-blue-50",
          actions: [
            {
              label: "View My Overtime",
              type: "link",
              href: "/webapp/attendance/my-overtime-requests",
            },
            {
              label: "+ Log Overtime",
              type: "primary",
              disabled: !canCreateOvertimeRequest,
              onClick: () => setShowOvertimeRequest(true),
            },
          ],
        },
        {
          id: "team_overtime",
          title: "Team Overtime",
          subtitle: "Pending Requests",
          value: employeeAttendanceSummary?.team_overtime_requests || 0,
          icon: "Users",
          color: "text-purple-500",
          background: "bg-purple-50",
          actions: [
            {
              label: "Manage Team Overtime",
              type: "link",
              href: "/webapp/attendance/team-overtime-requests",
            },
          ],
        },
        {
          id: "shifts",
          title: "Shifts",
          subtitle: "Shift schedule overview",
          value: null,
          icon: "Calendar",
          color: "text-indigo-500",
          background: "bg-indigo-50",
          actions: [
            {
              label: "View My Shifts",
              type: "link",
              href: "/webapp/shift-request/all-shifts-dashboard",
            },
          ],
        },
      ],
    }),
    [employeeAttendanceSummary],
  );

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
      color: "text-green-500",
      background: "bg-green-50",
      title: "Attendance Method",
      details: getAttendanceMethod(),
    },
    {
      icon: Users,
      color: "text-yellow-500",
      background: "bg-yellow-50",
      title: "Current Shift",
      details: employeeShift ? [employeeShift?.shift_name || employeeShift?.shift] : [],
    },
    {
      icon: Shield,
      color: "text-blue-500",
      background: "bg-blue-50",
      title: "Attendance Policy",
      details: attendancePolicy ? [attendancePolicy] : [],
    },
    {
      icon: Calendar,
      color: "text-indigo-500",
      background: "bg-indigo-50",
      title: "Week Off",
      details: [weeklyOff?.[0] ? [weeklyOff?.[0].weekly_off, weeklyOff?.[0]?.name] : []]
    },
    {
      icon: Timer,
      color: "text-purple-500",
      background: "bg-purple-50",
      title: "Overtime Policy",
      details: employeeOvertimePolicy ? [employeeOvertimePolicy] : [],
    },
  ];

  const getNavigatableSettingsButton = (
    settingType: string,
    data?: string | string[],
  ) => {
    if (!data) return "N/A";
    const displayLabel = Array.isArray(data) ? data[0] : data;
    const redirectId = Array.isArray(data) ? (data[1] as string) : data;



    const settingConfig = DRAWER_SETTINGS[settingType];
    if (settingConfig) {
      const { doctypeName, useEmployeeAsTarget } = settingConfig;
      return (
        <Typography
          variant="bodySmall"
          onClick={() => {
            setPolicyDrawerConfig({
              title: settingType,
              doctypeName,
              targetDoctype: useEmployeeAsTarget
                ? currentEmployee?.employee || ""
                : redirectId,
            });
            setOpenPolicyDrawer(true);
          }}
          className="w-full text-left font-semibold text-primary-600 hover:text-primary-700 cursor-pointer transition-colors"
        >
          {displayLabel}
        </Typography>
      );
    }

    return null;
  };

  return (
    <div className="h-full overflow-y-auto p-0 md:p-4 space-y-4 min-h-0">
      {/* Date Navigation */}
      <Card
        padding="sm"
        radius="xl"
        shadow="none"
        className="flex items-center justify-between mb-4  px-4 py-3"
      >
        <Button
          variant="subtle"
          size="sm"
          className="p-2 rounded-lg bg-slate-100 transition-colors"
          onClick={goToPreviousMonth}
        >
          <ChevronLeft className="h-5 w-5 text-slate-600" />
        </Button>
        <div className="text-center">
          <Typography
            variant="h3"
            className="font-bold text-slate-900 tracking-tight"
          >
            {format(currentDate, "MMMM yyyy")}
          </Typography>
          <Typography
            variant="label"
            color="secondary"
            className="font-medium mt-0.5 uppercase tracking-widest text-[10px]"
          >
            Attendance Overview
          </Typography>
        </div>
        <Button
          variant="subtle"
          size="sm"
          className="p-2 rounded-lg bg-slate-100 transition-colors"
          onClick={goToNextMonth}
        >
          <ChevronRight className="h-5 w-5 text-slate-600" />
        </Button>
      </Card>
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
      />
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-4 items-start">
        <div className="w-full lg:w-[70%] space-y-6">
          {/* Today's Team Summary */}
          {(!!teamCheckInSummary?.data?.have_team) && (
            <Card radius="xl" className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <Typography variant="subheading">Today's Team Summary</Typography>
                <ViewAll
                  className="text-sm"
                  title="View Calendar"
                  to="/webapp/attendance/team-attendance"
                />
              </div>
              {/* Using same grid as Summary Cards in Chart */}
              <div
                className={`grid gap-4 ${isDesktop ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}
              >
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
            </Card>
          )}
          {/* Quick Actions */}
          <Card radius="xl" className="space-y-4">
            <div className="px-1">
              <Typography variant="subheading" className="mb-4">
                Quick Actions
              </Typography>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickAction.cards.map((card) => (
                <QuickActionCard key={card.id} {...card} />
              ))}
            </div>
          </Card>
        </div>
        {/* Right Column: Settings - 30% */}
        <Card radius="xl" className="w-full lg:w-[30%] h-fit">
          <Typography variant="subheading" className="mb-4">
            Settings & Policies
          </Typography>
          <div className="space-y-3">
            {settingsData.map((setting, index) => {
              const Icon = setting.icon;
              return (
                <div
                  key={index}
                  className="group flex items-start gap-4 p-4  shadow-sm hover-lift transition-all duration-300"
                >
                  <div
                    className={`flex-shrink-0 p-2.5 rounded-xl shadow-sm group-hover:scale-105 transition-transform ${setting.background}`}
                  >
                    <Icon className={`h-5 w-5 ${setting.color}`} />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <Typography
                      variant="bodyMedium"
                      className="font-semibold text-gray-900 mb-1"
                    >
                      {setting.title}
                    </Typography>

                    {setting.details.length > 0 ? (
                      <div className="space-y-1">
                        {setting.details.map(
                          (detail, detailIndex) =>
                            getNavigatableSettingsButton(
                              setting.title,
                              detail,
                            ) ?? (
                              <Typography
                                key={detailIndex}
                                variant="bodySmall"
                                className="font-medium text-gray-600 block"
                              >
                                {detail || "N/A"}
                              </Typography>
                            ),
                        )}
                      </div>
                    ) : (
                      <Typography
                        variant="bodySmall"
                        className="text-gray-400 italic"
                      >
                        Not configured
                      </Typography>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      {showAttendanceRequestModal && (createPortal(
        <AttendanceRequestFormV2
          onClose={() => setShowAttendanceRequestModal(false)}
        />,
        document.body
      )
      )}
      {showOvertimeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <CreateOvertimeRequest
              onCancel={() => setShowOvertimeRequest(false)}
            />
          </div>
        </div>
      )}

      {openPolicyDrawer && policyDrawerConfig && (
        <PolicyDrawer
          isOpen={openPolicyDrawer}
          onClose={() => setOpenPolicyDrawer(false)}
          title={policyDrawerConfig.title}
          doctypeName={policyDrawerConfig.doctypeName}
          targetDoctype={policyDrawerConfig.targetDoctype}
        />
      )}
    </div>
  );
};

export default AttendanceSummary;
