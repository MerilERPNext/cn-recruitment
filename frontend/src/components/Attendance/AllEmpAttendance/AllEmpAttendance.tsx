import { useNavigate } from "react-router";
import LayoutHeader from "../../shared/LayoutHeader";
import { CalendarDays } from "lucide-react";
import { useState, useMemo } from "react";
import SelectByMonth, { MonthOption } from "./SelectByMonth";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import FrappeListView from "../../ListView";
import { BaseItem } from "../../Notices/types/noticeItem";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { endOfMonth, format } from "date-fns";

const AllEmpAttendance = () => {
    const navigate = useNavigate();
    const [showSelectByMonth, setShowSelectByMonth] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<MonthOption>({
        label: format(new Date(), 'MMM-yyyy'),
        value: format(new Date(), 'yyyy-MM'),
    });

    const { data: userId } = useLoggedInUser();
    const { data: currentUser } = useCurrentUser();
    const { data: currentEmployee } = useCurrentEmployeeAllDetails(currentUser?.name as string)
    const defaultFilters = useMemo(() => {
        if (!userId) return undefined;

        const startOfMonth = `${selectedMonth.value}-01`;

        const end = format(endOfMonth(new Date(selectedMonth?.value)), 'yyyy-MM-dd')

        return {
            employee: currentEmployee?.employee,
            attendance_date: ["between", [startOfMonth, end]],
        } as const;
    }, [userId, selectedMonth, currentEmployee]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "present":
                return "text-green-600";
            case "absent":
                return "text-red-600";
            case "on-leave":
                return "text-orange-600";
            case "half-day":
                return "text-yellow-500";
            case "work-from-home":
                return "text-purple-600";
            default:
                return "hover:bg-gray-100 text-gray-600";
        }
    };

    type AttendanceItem = BaseItem & {
        attendance_date: string;
        status?: string;
        shift?: string;
    };

    type TransformedItem = {
        date: number;
        month: string;
        day: string;
        status: string;
        statusLabel: string;
        location: string;
    };

    const transformItem = (item: AttendanceItem): TransformedItem => {
        const dateObj = new Date(item.attendance_date);
        const date = dateObj.getDate();
        const month = dateObj.toLocaleString("default", { month: "short" });
        const day = dateObj.toLocaleString("default", { weekday: "short" });

        let statusKey = item.status?.toLowerCase() || "unknown";
        const statusLabel = item.status || "Unknown";

        if (statusKey === "half day" || statusKey === "half-day") {
            statusKey = "half-day";
        } else if (statusKey === "work from home") {
            statusKey = "work-from-home";
        } else if (statusKey === "on leave") {
            statusKey = "on-leave";
        }

        return {
            date,
            month,
            day,
            status: statusKey,
            statusLabel,
            location: item.shift || "General (Office)",
        };
    };

    return (
        <>
            <LayoutHeader
                tab={"All Attendance"}
                onBack={() => navigate(-1)}
                children={
                    <button onClick={() => setShowSelectByMonth(true)}>
                        <CalendarDays />
                    </button>
                }
            />

            <div className="max-w-md mx-auto bg-white h-screen mt-14 px-4">
                <h2 className="font-semibold text-lg text-center py-2">
                    {selectedMonth?.label}
                </h2>

                <FrappeListView
                    doctype="Attendance"
                    defaultFields={[
                        "name", "status", "attendance_date", "shift", "employee"
                    ]}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    defaultFilters={defaultFilters as any}
                    infiniteScroll
                    isFilter={false}
                    isSearch={false}
                    showRefereshButton={false}
                    ItemComponent={({ item }) => {
                        const day = transformItem(item as AttendanceItem);
                        return (
                            <div className="flex items-center py-2 px-6 border-1 border-gray-100 bg-white shadow-sm rounded-xl">
                                <div className="flex flex-col items-center w-12 mr-4">
                                    <div className="text-lg font-semibold text-gray-900">{day.date}</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wide">{day.month}</div>
                                    <div className="text-xs text-gray-500 capitalize">{day.day}</div>
                                </div>
                                <div className="flex-1">
                                    <div className={`font-medium ${getStatusColor(day.status)} mb-1`}>
                                        {day.statusLabel}
                                    </div>
                                    <div className="text-sm text-gray-400">{day.location}</div>
                                </div>
                            </div>
                        );
                    }}
                />
            </div>

            {showSelectByMonth && (
                <SelectByMonth
                    onClose={() => setShowSelectByMonth(false)}
                    selected={selectedMonth}
                    onChange={(monthObj) => {
                        setSelectedMonth(monthObj);
                        setShowSelectByMonth(false);
                    }}
                />
            )}
        </>
    );
};

export default AllEmpAttendance;
