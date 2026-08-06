import React from "react";
import { CheckCircle, XCircle, Calendar, Timer, Clock, Clock8 } from "lucide-react";
import { useScreenSize } from "../../hooks/useScreenSize";
import SummaryCard from "./SummaryCard";
import { NoDataFound } from "../shared/atoms/NoDataFound";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { getActionsEnabled } from "../../utils/uiPermission";

interface AttendanceSummaryCardsProps {
    present?: number;
    absent?: number;
    leaves?: number;
    week_offs?: number;
    avg_late_by?: number;
    avg_working_hours?: number;
    avg_overtime?: number;
    className?: string;
}

const AttendanceSummaryCards: React.FC<AttendanceSummaryCardsProps> = ({
    present = 0,
    absent = 0,
    leaves = 0,
    week_offs = 0,
    avg_working_hours = 0,
    avg_overtime = 0,
    avg_late_by = 0,
    className = "",
}) => {
    const { isDesktop } = useScreenSize();
    
    const { data: userUiPermission } = useGetUiPermission("Attendance");
    const enabledActions = getActionsEnabled(
      userUiPermission,
      [
        "show_total_days_card",
        "show_present_card",
        "show_absent_card",
        "show_leaves_card",
        "show_avg_ot_card",
        "show_week_offs_card",
        "show_avg_hours_card",
        "show_avg_late_card",
      ],
      "Attendance Summary",
    );

    const total = present + absent + leaves;
    const hasAnyCardPermission = Object.values(enabledActions).some(Boolean);

    return (
        <div className={`${isDesktop ? "min-w-[29.8%]" : "w-full"} ${className}`}>
            {hasAnyCardPermission ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-4">
                    {enabledActions.show_total_days_card && (
                    <SummaryCard
                        icon={CheckCircle}
                        iconColor="text-primary-600"
                        bgColor="bg-primary-50"
                        borderColor="border-primary-100"
                        value={total}
                        label="Total Days"
                        isDesktop={isDesktop}
                        isMetric={true}
                    />
                )}
                {enabledActions.show_present_card && (
                    <SummaryCard
                        icon={CheckCircle}
                        iconColor="text-emerald-600"
                        bgColor="bg-emerald-50"
                        borderColor="border-emerald-100"
                        value={present}
                        label="Present"
                        isDesktop={isDesktop}
                        isMetric={true}
                    />
                )}
                {enabledActions.show_absent_card && (
                    <SummaryCard
                        icon={XCircle}
                        iconColor="text-rose-600"
                        bgColor="bg-rose-50"
                        borderColor="border-rose-100"
                        value={absent}
                        label="Absent"
                        isDesktop={isDesktop}
                        isMetric={true}
                    />
                )}
                {enabledActions.show_leaves_card && (
                    <SummaryCard
                        icon={Calendar}
                        iconColor="text-amber-600"
                        bgColor="bg-amber-50"
                        borderColor="border-amber-100"
                        value={leaves}
                        label="Leaves"
                        isDesktop={isDesktop}
                        isMetric={true}
                    />
                )}
                {enabledActions.show_avg_ot_card && (
                    <SummaryCard
                        icon={Timer}
                        iconColor="text-yellow-600"
                        bgColor="bg-yellow-50"
                        borderColor="border-yellow-100"
                        value={avg_late_by}
                        label="Avg. OT"
                        isDesktop={isDesktop}
                        isMetric={true}
                    />
                )}
                {enabledActions.show_week_offs_card && (
                    <SummaryCard
                        icon={Timer}
                        iconColor="text-pink-600"
                        bgColor="bg-pink-50"
                        borderColor="border-pink-100"
                        value={week_offs}
                        label="Week Offs"
                        isDesktop={isDesktop}
                        isMetric={true}
                    />
                )}
                {enabledActions.show_avg_hours_card && (
                    <SummaryCard
                        icon={Clock}
                        iconColor="text-blue-600"
                        bgColor="bg-blue-50"
                        borderColor="border-blue-100"
                        value={avg_working_hours}
                        label="Avg. Hours"
                        isDesktop={isDesktop}
                        isMetric={true}
                    />
                )}
                {enabledActions.show_avg_late_card && (
                    <SummaryCard
                        icon={Clock8}
                        iconColor="text-violet-600"
                        bgColor="bg-violet-50"
                        borderColor="border-violet-100"
                        value={avg_overtime}
                        label="Avg. Late"
                        isDesktop={isDesktop}
                        isMetric={true}
                    />
                )}
                </div>
            ) : (
                <NoDataFound 
                    title="No Metrics Available" 
                    subtitle="You don't have permission to view these metrics." 
                />
            )}
        </div>
    );
};

export default AttendanceSummaryCards;
