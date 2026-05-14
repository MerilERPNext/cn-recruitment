import React, { useEffect } from "react";

import { CheckCircle2, ChevronLeft, ChevronRight, Home, XCircle } from "lucide-react";

import DatePicker from "react-datepicker";
import { AttendanceRecord } from "../../../../types/attendance";
import { gradientClassMap } from "../../../../utils/helperUtils";
import Button from "../../../shared/atoms/Button";
import { useSearchParams } from "react-router-dom";

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
};

const getEventBadgeStyle = (doctype: string): { label: string; className: string } => {
    switch (doctype) {
        case "Attendance Request":
            return { label: "Att. Request", className: "bg-blue-50 text-blue-700 border-l-2 border-blue-400" };
        case "Leave Request":
            return { label: "Leave Req.", className: "bg-pink-50 text-pink-700 border-l-2 border-pink-400" };
        case "Overtime Request":
            return { label: "Overtime", className: "bg-orange-50 text-orange-700 border-l-2 border-orange-400" };
        case "Out Duty":
            return { label: "Out Duty", className: "bg-purple-50 text-purple-700 border-l-2 border-purple-400" };
        default:
            return { label: doctype, className: "bg-gray-50 text-gray-600 border-l-2 border-gray-400" };
    }
};

type ShowDetailsType = {
    date: Date;
    status: string;
    data: AttendanceRecord;
    events?: AttendanceRecord[];
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

    useEffect(() => {
        if (!selectedDate && !searchParams.get("date")) return;

        const newParams = new URLSearchParams(searchParams);
        const dateStr = selectedDate?.toISOString() || "";
        if (newParams.get("date") === dateStr) return;

        newParams.set("date", dateStr);
        setSearchParams(newParams, { replace: true });
    }, [selectedDate, setSearchParams, searchParams]);

    const getAttendanceEvents = (attendance: AttendanceStatusInfo) => {
        const validEvents = (attendance?.events ?? []).filter(
            (event) => event.status !== "Revoked"
        );

        if (validEvents.length === 0) return null;

        const uniqueEvents = Array.from(
            validEvents.reduce((map, event) => {
                const key =
                    event?.doctype === "Attendance Request" &&
                        event?.request_type === "Out Duty"
                        ? "Out Duty"
                        : event?.doctype;
                if (!map.has(key)) map.set(key, event);
                return map;
            }, new Map<string, AttendanceRecord>()).values()
        );

        return (
            <div className="flex flex-col gap-0.5">
                {uniqueEvents.map((event, index) => {
                    const doctypeKey =
                        event?.doctype === "Attendance Request" &&
                            event?.request_type === "Out Duty"
                            ? "Out Duty"
                            : event?.doctype;
                    const badge = getEventBadgeStyle(doctypeKey);
                    return (
                        <div
                            key={index}
                            onClick={(e) => {
                                e.stopPropagation();
                                // console.log(event, "-----------------------")
                            }}
                            className={`w-fit text-[10px] font-medium pl-1.5 pr-1 py-0.5 leading-tight ${badge.className}`}
                            title={doctypeKey}
                        >
                            {badge.label}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderStatusIcon = (attendance: AttendanceStatusInfo) => {
        switch (attendance?.status) {
            case "present":
                return <div className="p-1 bg-green-50 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                </div>
            case "absent":
            case "unpaid":
                return <div className="p-1 bg-red-50 rounded-lg">

                    <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                </div>
            case "work-from-home":
                return <div className="p-1 bg-purple-50 rounded-lg">
                    <Home className="w-4 h-4 text-purple-600 flex-shrink-0" />
                </div>
            case "on-leave":
                return <div className="p-1 bg-yellow-50 rounded-lg">
                    <Home className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                </div>
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
                    });
                }}
                onMonthChange={(date) => {
                    setSelectedDate(date);
                }}
                openToDate={selectedDate as Date}
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
                    const isWeekOff = attendance?.status === "week-off";
                    const isHalfDay = attendance?.status === "half-day";

                    const cellBase =
                        "w-full h-full flex flex-col p-1.5 transition-all duration-200";
                    const weekOffBg = isWeekOff ? "bg-gray-100" : "";
                    const selectedRing = isSelected
                        ? "ring-2 ring-inset ring-gray-800"
                        : "hover:bg-gray-50";

                    if (isHalfDay) {
                        const firstColor =
                            gradientClassMap[attendance?.firstHalf?.toLowerCase() || ""];
                        const secondColor =
                            gradientClassMap[attendance?.secondHalf?.toLowerCase() || ""];
                        const gradient = `linear-gradient(to bottom right, ${firstColor} 50%, ${secondColor} 50%)`;

                        return (
                            <div
                                className={`${cellBase} ${selectedRing}`}
                                style={{ backgroundImage: gradient }}
                            >
                                <div className="flex justify-between items-start">
                                    <span className="text-sm font-semibold text-gray-800">
                                        {day}
                                    </span>
                                </div>
                                <div className="mt-auto">
                                    {getAttendanceEvents(attendance)}
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div className={`${cellBase} ${weekOffBg} ${selectedRing}`}>
                            <div className="flex justify-start items-center gap-2">
                                <span
                                    className={`text-sm font-semibold ${isWeekOff ? "text-gray-400" : "text-gray-800"}`}
                                >
                                    {day}
                                </span>
                                {renderStatusIcon(attendance)}
                            </div>
                            <div className="mt-auto flex flex-col gap-1">
                                {renderStatusBadge(attendance)}
                                {getAttendanceEvents(attendance)}
                            </div>
                        </div>
                    );
                }}
            />
        </div>
    );
};

export default DesktopAttendanceCalendar;
