import { Calendar, Clock, Shield, Timer, Users } from "lucide-react";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../../hooks/useEmployee";
import { useGetEmployeeShift, useGetPolicyForDate, useReqValidationsForOvertimeRequest, useWeeklyOff } from "../../../../hooks/useAttendance";
import { format } from "date-fns";

import { Typography } from "../../../shared/atoms/Typography";
import PolicyDrawer from "../../PolicyDrawer";
import { useState } from "react";
import { PolicyDrawerConfig } from "../../AttendanceSummary";
import { DRAWER_SETTINGS } from "../../constants";
import { useTargetUser } from "../../../../context/ViewedUserContext";

const ViewPolicies = () => {

    const { targetEmployeeId } = useTargetUser();
    const [openPolicyDrawer, setOpenPolicyDrawer] = useState(false);

    const [policyDrawerConfig, setPolicyDrawerConfig] =
        useState<PolicyDrawerConfig | null>(null);

    const { data: currentUser } = useCurrentUser();
    const { data: currentEmployee } = useCurrentEmployeeAllDetails(
        currentUser?.name as string,
        targetEmployeeId || ""
    );
    const { data: employeeShift } = useGetEmployeeShift(
        currentEmployee?.user_id || ""
    );
    const { data: weeklyOff } = useWeeklyOff(
        [["name", "=", currentEmployee?.custom_weekly_off]]
    );
    const { data: employeeOvertimePolicy } = useReqValidationsForOvertimeRequest(
        currentEmployee?.employee || ""
    );
    const { data: attendancePolicy } = useGetPolicyForDate({
        employee: currentEmployee?.employee,
        as_of: format(new Date(), "yyyy-MM-dd"),
    }, !!currentEmployee?.employee);
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
        if (!data) return "N/A ";
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
        <div >
            <div className="space-y-2">
                {settingsData.map((setting, index) => {
                    const Icon = setting.icon;

                    return (
                        <div
                            key={index}
                            className="group flex items-start gap-4 p-4 shadow-sm hover-lift transition-all duration-300"
                        >
                            <div className={`p-2 rounded-lg ${setting.background}`}>
                                <Icon className={`h-4 w-4 ${setting.color}`} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 mb-1">
                                    {setting.title}
                                </h3>

                                {setting.details.length > 0 ? (
                                    <div className="space-y-1">
                                        {setting.details.map(
                                            (detail, detailIndex) =>
                                                getNavigatableSettingsButton(
                                                    setting.title,
                                                    detail
                                                ) ?? (
                                                    <Typography
                                                        key={detailIndex}
                                                        variant="bodySmall"
                                                        className="font-medium text-gray-600 block"
                                                    >
                                                        {detail || "N/A"}
                                                    </Typography>
                                                )
                                        )}
                                    </div>
                                ) : (
                                    <Typography variant="bodySmall" className="text-gray-400 italic">
                                        Not configured
                                    </Typography>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {
                openPolicyDrawer && policyDrawerConfig && (
                    <PolicyDrawer
                        isOpen={openPolicyDrawer}
                        onClose={() => setOpenPolicyDrawer(false)}
                        title={policyDrawerConfig.title}
                        doctypeName={policyDrawerConfig.doctypeName}
                        targetDoctype={policyDrawerConfig.targetDoctype}
                    />
                )
            }
        </div>
    )
}
export default ViewPolicies