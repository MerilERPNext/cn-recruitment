import { Calendar, Clock, Shield, Timer, Users } from "lucide-react";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../../../hooks/useEmployee";
import { useGetEmployeeShift, useGetPolicyForDate, useReqValidationsForOvertimeRequest } from "../../../../hooks/useAttendance";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Typography } from "../../../shared/atoms/Typography";
import PolicyDrawer from "../../PolicyDrawer";
import { useState } from "react";
import { PolicyDrawerConfig } from "../../AttendanceSummary";

const ViewPolicies = () => {
    const navigate = useNavigate()
    const [openPolicyDrawer, setOpenPolicyDrawer] = useState(false);

    const [policyDrawerConfig, setPolicyDrawerConfig] =
        useState<PolicyDrawerConfig | null>(null);

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
            details: employeeOvertimePolicy ? [employeeOvertimePolicy] : [],
        },
    ];

    const getNavigatableSettingsButton = (settingType: string, data?: string) => {
        if (!data) return null;

        const drawerSettings: Record<
            string,
            { doctypeName: string; useEmployeeAsTarget?: boolean }
        > = {
            "Current Shift": { doctypeName: "Shift Type" },
            "Attendance Method": {
                doctypeName: "Employee",
                useEmployeeAsTarget: true,
            },
            "Week Off": { doctypeName: "Week Off" },
        };

        const settingConfig = drawerSettings[settingType];
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
                                : data,
                        });
                        setOpenPolicyDrawer(true);
                    }}
                    className="w-full text-left font-semibold text-primary-600 hover:text-primary-700 cursor-pointer transition-colors"
                >
                    {data}
                </Typography>
            );
        }

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
            <Typography
                variant="bodySmall"
                onClick={() => navigate(path!)}
                className="w-full text-left font-semibold text-primary-600 hover:text-primary-700 cursor-pointer transition-colors"
            >
                {data}
            </Typography>
        );
    };

    return (
        <div >
            <div className="space-y-2">
                {settingsData.map((setting, index) => {
                    const Icon = setting.icon;

                    return (
                        <div
                            key={index}
                            className="group flex items-start gap-4 p-4 rounded-2xl border border-gray-100 hover-lift transition-all duration-300"
                        >
                            <div className="p-2 bg-primary-100 rounded-lg">
                                <Icon className="h-4 w-4 text-primary-700" />
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
                                                        {detail}
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