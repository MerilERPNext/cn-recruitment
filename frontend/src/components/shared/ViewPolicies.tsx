import { Calendar, Clock, Shield, Timer, Users } from "lucide-react";
import useCurrentUser from "../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import { useGetEmployeeShift, useGetPolicyForDate, useReqValidationsForOvertimeRequest } from "../../hooks/useAttendance";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const ViewPolicies = () => {
    const navigate = useNavigate()
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
    });
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


    return (
        <div >
            <div className="space-y-2">
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
                                    setting.details.map((detail, detailIndex) => {
                                        if (
                                            setting.title === "Attendance Policy" &&
                                            attendancePolicy
                                        ) {
                                            return (
                                                <button
                                                    key={detailIndex}
                                                    onClick={() =>
                                                        navigate(
                                                            `/webapp/attendance/attendance-policies?policy=${attendancePolicy}`
                                                        )
                                                    }
                                                    className="w-full text-left px-3 py-1 text-sm font-medium text-gray-800 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                                                >
                                                    {detail}
                                                </button>
                                            );
                                        }

                                        return (
                                            <p
                                                key={detailIndex}
                                                className="text-sm text-gray-700"
                                            >
                                                {detail}
                                            </p>
                                        );
                                    })
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
    )
}
export default ViewPolicies