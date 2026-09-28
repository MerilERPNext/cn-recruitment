import { addWeeks, endOfWeek, format, parseISO, startOfWeek, subWeeks } from "date-fns";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useTeamStatus } from "../../../hooks/useAttendance";
import { TeamStatusEmployee, TeamStatusRecord } from "../../../types/attendance";
import Avatar from "../../shared/Avatar";

const getSundayOfWeek = (date: Date) => startOfWeek(date, { weekStartsOn: 0 });
const getSaturdayOfWeek = (date: Date) => endOfWeek(date, { weekStartsOn: 0 });

const getStatusBadge = (records: TeamStatusRecord[]) => {
    if (!records.length) return null;

    // Find today's record first if it exists in the current week
    const todayStr = format(new Date(), "yyyy-MM-dd");
    let targetRecord = records.find((r) => r.date === todayStr);

    // Fallback to the latest record with a valid status if today's is not found or empty
    if (!targetRecord || !targetRecord.status) {
        targetRecord = [...records]
            .reverse()
            .find((r) => !!r.status && !r.holiday_name);
    }

    if (!targetRecord) return null;
    const status = targetRecord.status.toLowerCase();

    if (targetRecord.holiday_name) return null;

    if (status === "present") return { label: "In Office", className: "bg-green-100 text-green-700" };
    if (status === "work from home") return { label: "Remotely", className: "bg-blue-100 text-blue-700" };
    if (status === "half day") return { label: "Half Day", className: "bg-orange-100 text-orange-700" };
    if (status === "on leave" || targetRecord.leave_type) return { label: "On Leave", className: "bg-amber-100 text-amber-700" };
    if (status === "absent") return { label: "Absent", className: "bg-red-100 text-red-700" };
    if (status === "weekly off" || status === "week off" || status === "week-off" || status === "weeklyoff" || status === "wo") {
        return { label: "Weekly Off", className: "bg-purple-100 text-purple-700" };
    }
    return null;
};

const DayIcon = ({ record }: { record: TeamStatusRecord }) => {
    if (record.holiday_name) {
        return (
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-bold text-blue-500">H</span>
            </div>
        );
    }

    const status = record.status?.toLowerCase();

    if (!status) {
        return (
            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-gray-400">-</span>
            </div>
        );
    }

    if (status === "present" || status === "work from home" || status === "half day") {
        return (
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 size={20} className="text-green-500" strokeWidth={2} />
            </div>
        );
    }

    if (status === "absent") {
        return (
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                <XCircle size={20} className="text-red-400" strokeWidth={2} />
            </div>
        );
    }

    if (status === "on leave") {
        return (
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                <span className="text-sm font-bold text-amber-500">L</span>
            </div>
        );
    }

    if (status === "weekly off" || status === "week off" || status === "week-off" || status === "weeklyoff" || status === "wo") {
        return (
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
                <span className="text-xs font-bold text-purple-600">WO</span>
            </div>
        );
    }

    return (
        <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
            <span className="text-sm font-semibold text-gray-400">-</span>
        </div>
    );
};

const EmployeeTeamCard = ({ employee }: { employee: TeamStatusEmployee }) => {
    const badge = getStatusBadge(employee.records);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-3 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <div className="flex items-center gap-3">
                    <Avatar
                        src={employee.image ?? undefined}
                        name={employee.employee_name}
                        avatarBgColor="bg-indigo-100"
                        avatarTextColor="text-indigo-700"
                    />
                    <div>
                        <p className="text-sm font-semibold text-gray-800 leading-tight">{employee.employee_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{employee.employee}</p>
                    </div>
                </div>
                {badge && (
                    <span className={`text-xs font-medium px-3 py-1 rounded-xl ${badge.className}`}>
                        {badge.label}
                    </span>
                )}
            </div>

            {/* Divider */}
            {employee.records.length > 0 && <div className="border-t border-gray-100 mx-4" />}

            {/* Days grid */}
            {employee.records.length > 0 && (
                <div className="px-4 py-3">
                    <div
                        className="grid gap-2"
                        style={{ gridTemplateColumns: `repeat(${employee.records.length}, minmax(0, 1fr))` }}
                    >
                        {employee.records.map((record) => (
                            <div key={record.date} className="flex flex-col items-center gap-1.5">
                                <span className="text-xs text-gray-400 font-medium">
                                    {format(parseISO(record.date), "EEE").slice(0, 3)}
                                </span>
                                <DayIcon record={record} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const formatOrdinal = (date: Date) => {
    const d = date.getDate();
    const suffix = ["th", "st", "nd", "rd"][((d % 100) - 20) % 10] ?? ["th", "st", "nd", "rd"][d % 100] ?? "th";
    return `${d}${suffix} ${format(date, "MMM")}`;
};

const WeekSelector = ({
    weekStart,
    onPrev,
    onNext,
    onDateSelect,
}: {
    weekStart: Date;
    onPrev: () => void;
    onNext: () => void;
    onDateSelect: (date: Date) => void;
}) => {
    const weekEnd = getSaturdayOfWeek(weekStart);
    const [pickerOpen, setPickerOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const label = `${formatOrdinal(weekStart)} - ${formatOrdinal(weekEnd)} ${format(weekEnd, "yyyy")}`;

    useEffect(() => {
        if (!pickerOpen) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setPickerOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [pickerOpen]);

    return (
        <div ref={containerRef} className="relative flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
            {/* Prev */}
            <button
                onClick={onPrev}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors flex-shrink-0"
            >
                <ChevronLeft size={18} />
            </button>

            {/* Date pill */}
            <button
                onClick={() => setPickerOpen((o) => !o)}
                className="flex items-center border border-gray-200 rounded-xl overflow-hidden mx-2 flex-1 max-w-xs"
            >
                <span className="flex-1 text-center text-sm font-medium text-gray-700 px-3 py-2 whitespace-nowrap">
                    {label}
                </span>
                <span className="bg-blue-400 px-2.5 py-2 flex items-center justify-center self-stretch">
                    <CalendarDays size={16} className="text-white" />
                </span>
            </button>

            {/* Next */}
            <button
                onClick={onNext}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors flex-shrink-0"
            >
                <ChevronRight size={18} />
            </button>

            {/* Calendar dropdown */}
            {pickerOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 flex justify-center px-4">
                    <div className="shadow-xl rounded-xl overflow-hidden border border-gray-100 bg-white w-full max-w-xs">
                        <DatePicker
                            inline
                            selected={weekStart}
                            onChange={(date) => {
                                if (!date) return;
                                onDateSelect(getSundayOfWeek(date));
                                setPickerOpen(false);
                            }}
                            highlightDates={Array.from({ length: 7 }, (_, i) => {
                                const d = new Date(weekStart);
                                d.setDate(d.getDate() + i);
                                return d;
                            })}
                            calendarClassName="!w-full"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

const TeamStatus = () => {
    const [weekStart, setWeekStart] = useState<Date>(() => getSundayOfWeek(new Date()));

    const weekEnd = getSaturdayOfWeek(weekStart);
    const fromDate = format(weekStart, "yyyy-MM-dd");
    const toDate = format(weekEnd, "yyyy-MM-dd");

    const {
        data: teamStatus,
        isLoading,
        isError,
    } = useTeamStatus(fromDate, toDate);

    return (
        <div className="h-full flex flex-col min-h-0 bg-white">
            <WeekSelector
                weekStart={weekStart}
                onPrev={() => setWeekStart((w) => getSundayOfWeek(subWeeks(w, 1)))}
                onNext={() => setWeekStart((w) => getSundayOfWeek(addWeeks(w, 1)))}
                onDateSelect={setWeekStart}
            />

            <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3">
                {isLoading && (
                    <div className="animate-pulse space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-gray-100 rounded-2xl h-28" />
                        ))}
                    </div>
                )}

                {isError && (
                    <div className="h-full flex items-center justify-center">
                        <p className="text-sm text-red-400">Failed to load team status.</p>
                    </div>
                )}

                {!isLoading && !isError && !teamStatus?.length && (
                    <div className="h-full flex items-center justify-center">
                        <p className="text-sm text-gray-400">No team status data available.</p>
                    </div>
                )}

                {!isLoading && !isError && teamStatus?.map((employee) => (
                    <EmployeeTeamCard key={employee.employee} employee={employee} />
                ))}
            </div>
        </div>
    );
};

export default TeamStatus;
