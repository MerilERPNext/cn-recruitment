import React, { useEffect } from "react";

import { Calendar, CalendarRange, CheckCircle2, ChevronLeft, ChevronRight, CircleX, Columns2, Gift, Home, XCircle } from "lucide-react";

import DatePicker from "react-datepicker";
import { AttendanceRecord } from "../../../../types/attendance";

import Button from "../../../shared/atoms/Button";
import { useSearchParams } from "react-router-dom";
import Tooltip from "../../../shared/Tooltip";
import { useCompoffLateDetailsEnabled } from "../../../../hooks/useAttendance";

type Status =
    | "present"
    | "absent"
    | "on-leave"
    | "half-day"
    | "half-day-first-half"
    | "half-day-second-half"
    | "work-from-home"
    | "default"
    | "holiday"
    | "unpaid"
    | "week-off";
type AttendanceStatusInfo = {
    status: Status;
    firstHalf?: string;
    secondHalf?: string;
    events: AttendanceRecord[]; // all non-attendance-type records on the same day
    record?: AttendanceRecord; // the attendance record whose status is being used
    isWeeklyOff?: boolean;
};

const getEventBadgeStyle = (doctype: string): { label: string; borderClass: string } => {
    switch (doctype) {
        case "Attendance Request":
            return { label: "Attendance Request", borderClass: "border-l-2 border-blue-400" };
        case "Leave Request":
            return { label: "Leave Request", borderClass: "border-l-2 border-pink-400" };
        case "Overtime Request":
            return { label: "Overtime Request", borderClass: "border-l-2 border-orange-400" };
        case "Out Duty":
            return { label: "Out Duty", borderClass: "border-l-2 border-purple-400" };
        default:
            return { label: doctype, borderClass: "border-l-2 border-gray-400" };
    }
};


const getHalfDayColor = (status: string): string => {
    switch (status?.toLowerCase()) {
        case "present": return "text-green-500";
        case "absent": return "text-red-500";
        case "leave": return "text-yellow-500";
        case "work from home": return "text-purple-500";
        case "holiday": return "text-blue-500";
        case "week off": return "text-gray-400";
        default: return "text-gray-400";
    }
};

const getStatusBgStyle = (status: string): string => {
    switch (status) {
        case "Approved":
            return "bg-green-50 text-green-700 border-l-2 border-green-400";
        case "Rejected":
            return "bg-red-50 text-red-700 border-l-2 border-red-400";
        case "Pending":
        case "Open":
            return "bg-yellow-50 text-yellow-700 border-l-2 border-yellow-400";
        case "Revoked":
            return "bg-purple-50 text-purple-700 border-l-2 border-purple-400";
        default:
            return "bg-gray-50 text-gray-600 border-l-2 border-gray-400";
    }
};

const getEventDetail = (event: AttendanceRecord): string => {
    return (
        event?.leave_type_name ||
        event?.leave_type ||
        event?.request_type ||
        event?.title ||
        event?.doctype ||
        ""
    );
};

type ExtraMarker = { text: string; className: string; title: string };

// Comp-Off (Co+/Co-) + Late Entry / Early Exit markers. These fields are only
// present on records when the "Show Comp-Off and Late Entry Details in Calendar"
// Attendance Setting is enabled (gated in cn_leave_shift_managment.get_events),
// so nothing renders unless the admin has turned the feature on.
const getExtraMarkers = (attendance: AttendanceStatusInfo): ExtraMarker[] => {
    const all = [attendance?.record, ...(attendance?.events ?? [])].filter(
        Boolean
    ) as AttendanceRecord[];
    const markers: ExtraMarker[] = [];
    if (all.some((r) => r?.comp_off === "earned"))
        markers.push({ text: "Co+", className: "bg-green-600 text-white", title: "Compensatory Off Earned" });
    // Co- only for live requests: docstatus 0 (draft) or 1 (submitted), not Rejected
    if (
        all.some(
            (r) =>
                r?.comp_off === "applied" &&
                [0, 1].includes(Number(r?.docstatus ?? 0)) &&
                r?.status !== "Rejected"
        )
    )
        markers.push({ text: "Co-", className: "bg-red-600 text-white", title: "Compensatory Off Applied" });
    if (attendance?.record?.late_entry)
        markers.push({ text: "LE", className: "bg-amber-500 text-white", title: "Late Entry" });
    if (attendance?.record?.early_exit)
        markers.push({ text: "EE", className: "bg-violet-500 text-white", title: "Early Exit" });
    return markers;
};

const ExtraMarkers: React.FC<{ attendance: AttendanceStatusInfo }> = ({ attendance }) => {
    const markers = getExtraMarkers(attendance);
    if (markers.length === 0) return null;
    return (
        <div className="flex gap-1 flex-wrap">
            {markers.map((m, i) => (
                <span
                    key={i}
                    title={m.title}
                    className={`text-[9px] leading-none font-bold px-1 py-0.5 rounded ${m.className}`}
                >
                    {m.text}
                </span>
            ))}
        </div>
    );
};

const getEventDisplay = (event: AttendanceRecord): { label: string; className: string } => {
    const detail = getEventDetail(event);
    const detailText = detail ? ` (${detail})` : "";
    const doctype = event?.doctype || "Request";
    const status = event?.status || "";
    const baseClass = "border-l-2";

    if (doctype === "Leave Request" && status === "Approved") {
        return {
            label: `On Leave${detailText}`,
            className: `${baseClass} border-green-500 bg-green-50 text-green-800`,
        };
    }

    if (status === "Pending" || status === "Open") {
        return {
            label: `Request Pending${detailText}`,
            className: `${baseClass} border-yellow-400 bg-yellow-50 text-gray-700`,
        };
    }

    return {
        label: `${[getEventBadgeStyle(doctype).label, status].filter(Boolean).join(" ")}${detailText}`,
        className: getStatusBgStyle(status),
    };
};

type ShowDetailsType = {
    date: Date;
    status: string;
    data: AttendanceRecord;
    events?: AttendanceRecord[];
    isWeeklyOff?: boolean;
};
type attendanceProps = {
    selectedDate: Date | null;
    setSelectedDate: (date: Date | null) => void;
    getAttendanceStatus: (date: Date) => AttendanceStatusInfo;
    setShowDetailsFor: (val: ShowDetailsType | null) => void;
};
const DesktopAttendanceCalendar: React.FC<attendanceProps> = ({
    selectedDate,
    setSelectedDate,
    getAttendanceStatus,
    setShowDetailsFor,
}) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { data: showCompoffLate = false } = useCompoffLateDetailsEnabled();

    useEffect(() => {
        if (!selectedDate && !searchParams.get("date")) return;

        const newParams = new URLSearchParams(searchParams);
        const dateStr = selectedDate?.toISOString() || "";
        if (newParams.get("date") === dateStr) return;

        newParams.set("date", dateStr);
        setSearchParams(newParams, { replace: true });
    }, [selectedDate, setSearchParams, searchParams]);

    const getAttendanceEvents = (attendance: AttendanceStatusInfo) => {
        const validEvents = (attendance?.events ?? []).filter((event) => {
            return !["Rejected", "Revoked", "Cancelled"].includes(event?.status || "");

        });

        if (validEvents?.length === 0) return null;

        // const uniqueEvents = Array.from(
        //     attendance?.events?.reduce((map, event) => {
        //         const key =
        //             event?.doctype === "Attendance Request" &&
        //                 event?.request_type === "Out Duty"
        //                 ? "Out Duty"
        //                 : event?.doctype;
        //         if (!map.has(key)) map.set(key, event);
        //         return map;
        //     }, new Map<string, AttendanceRecord>()).values()
        // );
        const prioritized = new Set(["Approved", "Rejected"]);
        const events = (validEvents?.map((event) => ({
            ...event,
            doctype:
                event?.doctype === "Attendance Request" &&
                    event?.request_type === "Out Duty"
                    ? "Out Duty"
                    : event?.doctype || "Request",
        })) || []).sort((a, b) =>
            (prioritized.has(a?.status || "") ? 0 : 1) - (prioritized.has(b?.status || "") ? 0 : 1)
        );
        return (
            <div className="flex items-end gap-1 overflow-hidden">
                <div className="flex flex-col gap-0.5 overflow-hidden min-w-0 flex-1">
                    {events.slice(0, 3).map((event, index) => {
                        const doctypeKey =
                            event?.doctype === "Attendance Request" &&
                                event?.request_type === "Out Duty"
                                ? "Out Duty"
                                : event?.doctype;
                        if (doctypeKey === "Employee Checkin") {
                            return null;
                        }
                        // Comp-off earned is surfaced compactly via the Co+ marker instead.
                        if (doctypeKey === "Compensatory Leave Request") {
                            return null;
                        }
                        const eventDisplay = getEventDisplay({ ...event, doctype: doctypeKey });
                        return (
                            <Tooltip content={eventDisplay.label}>

                                <div
                                    key={index}
                                    // onClick={(e) => {
                                    // e.stopPropagation();
                                    // }}
                                    className={`min-w-0 text-[10px] text-left font-semibold pl-1.5 pr-1 py-0.5 leading-tight truncate rounded-sm ${eventDisplay.className}`}
                                    title={eventDisplay.label}
                                >
                                    {eventDisplay.label}
                                </div>
                            </Tooltip>
                        );
                    })}
                </div>
                {events.length > 3 && (
                    <div className="flex-shrink-0 text-[10px] font-semibold px-1 py-0.5 rounded text-blue-600 leading-tight">
                        +{events.length - 3} more
                    </div>
                )}
            </div>
        );
    };

    const renderStatusIcon = (attendance: AttendanceStatusInfo) => {
        if (attendance?.status === "week-off") {
            return <div className="p-1 bg-gray-50 rounded-lg">
                <CircleX className="w-4 h-4 text-gray-600 flex-shrink-0" />
            </div>;
        }
        const approvedLeave = attendance.events?.find((e) => e.status === "Approved" && e.doctype === "Leave Request");
        if (approvedLeave) {
            return <div className="p-1 bg-yellow-50 rounded-lg">
                <Calendar className="w-4 h-4 text-yellow-600 flex-shrink-0" />
            </div>;
        }

        const approvedOther = attendance.events?.find((e) => e.status === "Approved" && e.doctype !== "Leave Request");
        if (approvedOther) {
            return <div className="p-1 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            </div>;
        }
        if (attendance.record?.is_optional_leave) {
            return <div className="p-1 bg-blue-50 rounded-lg">
                <CalendarRange className="w-4 h-4 text-blue-600 flex-shrink-0" />
            </div>
        }
        switch (attendance?.status) {
            case "present": {
                const hasApproved = attendance.events?.some((e) => e.status === "Approved");
                const hasPending = attendance.events?.some((e) => e.status === "Pending" || e.status === "Open");
                if (hasPending && !hasApproved) return null;
                return <div className="p-1 bg-green-50 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                </div>;
            }
            case "absent":
            case "unpaid":
                return <div className="p-1 bg-red-50 rounded-lg">
                    <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                </div>
            case "work-from-home":
                return <div className="p-1 bg-purple-50 rounded-lg">
                    <Home className="w-4 h-4 text-purple-600 flex-shrink-0" />
                </div>
            case "holiday":
                return <div className="p-1 bg-blue-50 rounded-lg">
                    <Gift className="w-4 h-4 text-blue-600 flex-shrink-0" />
                </div>
            case "on-leave":
                return <div className="p-1 bg-yellow-50 rounded-lg">
                    <Calendar className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                </div>
            case "half-day": {
                const hasAbsent =
                    attendance?.firstHalf?.toLowerCase() === "absent" ||
                    attendance?.secondHalf?.toLowerCase() === "absent";
                if (hasAbsent) return null;
                const firstColor = getHalfDayColor(attendance?.firstHalf || "");
                const secondColor = getHalfDayColor(attendance?.secondHalf || "");
                return (
                    <div className="p-1 bg-gray-50 rounded-lg">
                        <div className="relative w-4 h-4 flex-shrink-0">
                            <div className="absolute inset-0" style={{ clipPath: "inset(0 50% 0 0)" }}>
                                <Columns2 className={`w-4 h-4 ${firstColor}`} />
                            </div>
                            <div className="absolute inset-0" style={{ clipPath: "inset(0 0 0 50%)" }}>
                                <Columns2 className={`w-4 h-4 ${secondColor}`} />
                            </div>
                        </div>
                    </div>
                );
            }
            default:
                return null;
        }
    };

    const renderStatusBadge = (attendance: AttendanceStatusInfo) => {
        const status = attendance?.record?.is_optional_leave
            ? "optional_leave"
            : attendance?.status;

        switch (status) {
            case "holiday":
                return (
                    <span className="w-fit text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 leading-tight">
                        Holiday
                    </span>
                );
            case "optional_leave":
                return (
                    <span className="w-fit text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 leading-tight">
                        Opt. Holiday
                    </span>
                );
            case "unpaid":
                return (
                    <span className="w-fit inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-700 leading-tight">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        Unpaid
                    </span>
                );
            case "half-day": {
                const hasAbsent =
                    attendance?.firstHalf?.toLowerCase() === "absent" ||
                    attendance?.secondHalf?.toLowerCase() === "absent";
                if (!hasAbsent) return null;
                return (
                    <span className="w-fit text-[10px] font-medium pl-1.5 pr-1 py-0.5 border-l-2 border-red-400 bg-red-50 text-red-600 leading-tight">
                        Half Day Absent
                    </span>
                );
            }
            default:
                return null;
        }
    };

    return (
        <div className="employee-datepicker-lg desktop-att-cal">
            <DatePicker
                selected={selectedDate}
                showPopperArrow={false}
                showMonthDropdown={false}
                onChange={(date) => {
                    if (!date) return;
                    setSelectedDate(date);
                    const attendance = getAttendanceStatus(date as Date);

                    setShowDetailsFor({
                        date: date as Date,
                        status: attendance?.status,
                        data: attendance?.record as AttendanceRecord,
                        events: attendance?.events as AttendanceRecord[],
                        isWeeklyOff: attendance?.isWeeklyOff,
                    });
                }}
                onMonthChange={(date) => {
                    setSelectedDate(date);
                }}
                openToDate={selectedDate as Date}
                formatWeekDay={(day) => day}
                inline
                renderCustomHeader={({
                    date,
                    decreaseMonth,
                    increaseMonth,
                    prevMonthButtonDisabled,
                    nextMonthButtonDisabled,
                }) => (
                    <div className="flex items-center justify-between px-2 py-2">
                        <Button
                            variant="subtle"
                            onClick={decreaseMonth}
                            disabled={prevMonthButtonDisabled}
                            className="p-1 rounded-md bg-gray-50"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <span className="base-title">
                            {date.toLocaleString("default", { month: "long" })}{" "}
                            {date.getFullYear()}
                        </span>
                        <Button
                            variant="subtle"
                            onClick={increaseMonth}
                            disabled={nextMonthButtonDisabled}
                            className="p-1 rounded-md bg-gray-50"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>
                )}
                renderDayContents={(day, date) => {
                    const attendance = getAttendanceStatus(date);
                    const isSelected =
                        selectedDate?.toDateString() === date.toDateString();
                    const isWeekOff = attendance?.status === "week-off" || !!attendance?.isWeeklyOff;

                    const cellBase =
                        "w-full h-full flex flex-col p-2 transition-all duration-200";
                    const weekOffBg = isWeekOff ? "bg-gray-100" : "";
                    const selectedRing = isSelected
                        ? "ring-1 ring-inset ring-primary-400 rounded-lg"
                        : "hover:bg-gray-50";

                    return (
                        <div className={`${cellBase} ${weekOffBg} ${selectedRing}`}>
                            <div className="flex justify-start items-center gap-2">
                                <span
                                    className={`text-sm font-semibold ${isWeekOff ? "text-gray-400" : "text-gray-800"} ${new Date().toDateString() === date.toDateString() ? "bg-primary-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs" : ""}`}
                                >
                                    {day}
                                </span>
                                <Tooltip content={attendance?.status.toUpperCase()}>

                                    {renderStatusIcon(attendance)}
                                </Tooltip>
                            </div>
                            <div className="mt-auto flex flex-col gap-1">
                                {renderStatusBadge(attendance)}
                                <ExtraMarkers attendance={attendance} />
                                {getAttendanceEvents(attendance)}
                            </div>
                        </div>
                    );
                }}
            />

            {/* Legend */}
            <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1.5 px-3 py-2.5 border-t border-gray-100 text-[11px] text-gray-600">
                <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <span>Present</span>
                </div>
                <div className="flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                    <span>Absent</span>
                </div>
                
                <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-yellow-500" />
                    <span>On Leave</span>
                </div>
                <div className="flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-grey-500" />
                    <span>Week Off</span>
                </div>
                <div className="flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5 text-blue-500" />
                    <span>Holiday</span>
                </div>
                <div className="flex items-center gap-1">
                    <CalendarRange className="w-3.5 h-3.5 text-blue-500" />
                    <span>Optional Holiday</span>
                </div>

                {showCompoffLate && (
                    <>
                        <div className="w-px h-3.5 bg-gray-200 mx-1" />

                        <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-green-600 text-white leading-none">Co+</span>
                            <span>Comp Off Earned</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-red-600 text-white leading-none">Co-</span>
                            <span>Comp Off Applied</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-500 text-white leading-none">LE</span>
                            <span>Late Entry</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-violet-500 text-white leading-none">EE</span>
                            <span>Early Exit</span>
                        </div>
                    </>
                )}

                <div className="w-px h-3.5 bg-gray-200 mx-1" />

              
                {/* <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                    <span>Rejected</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
                    <span>Revoked</span> */}
                {/* </div> */}
            </div>
        </div >
    );
};

export default DesktopAttendanceCalendar;
