import React from 'react'

import {  ChevronLeft, ChevronRight } from 'lucide-react';

import DatePicker from 'react-datepicker';
import { AttendanceRecord } from '../../types/attendance';
import { gradientClassMap } from '../../utils/helperUtils';
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
    | "week-off";
  type AttendanceStatusInfo = {
    status: Status;
    firstHalf?: string;
    secondHalf?: string;
    events: AttendanceRecord[]; // all non-attendance-type records on the same day
    record?: AttendanceRecord; // the attendance record whose status is being used
  };

  const getEventDotColor = (doctype: string): string => {
    switch (doctype) {
      case "Attendance Request":
        return "bg-blue-500";
      case "Leave Request":
        return "bg-pink-500";
      case "Overtime Request":
        return "bg-orange-500";
      default:
        return "bg-gray-400";
    }
  };

type ShowDetailsType = {
  date: Date;
  status: string;
  data: AttendanceRecord;
};
type attendanceProps = {
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  getAttendanceStatus: (date: Date ) => AttendanceStatusInfo;
  setShowDetailsFor: (val: ShowDetailsType | null) => void;
};
const AttendanceCalendar: React.FC<attendanceProps> = ({
  selectedDate,
  setSelectedDate,
  getAttendanceStatus,
  setShowDetailsFor,
}) => {
  
  return (
 
    <div className="p-1 employee-datepicker-lg">
      <DatePicker
        selected={selectedDate}
        showPopperArrow={false}
        showMonthDropdown={false}
        onChange={(date) => {
          if (!date) return; 
          setSelectedDate(date);
          const attendance = getAttendanceStatus(date as Date);

          if (
            attendance?.status !== "default" &&
            attendance?.status !== "week-off"
          ) {
            setShowDetailsFor({
              date: date as Date,
              status: attendance?.status,
              data: attendance?.record as AttendanceRecord,
            });
          } else {
            setShowDetailsFor(null);
          }
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
            <button
              onClick={decreaseMonth}
              disabled={prevMonthButtonDisabled}
              className="p-1 rounded-md border-1 border-gray-200 bg-gray-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-semibold">
              {date.toLocaleString("default", { month: "long" })}{" "}
              {date.getFullYear()}
            </span>
            <button
              onClick={increaseMonth}
              disabled={nextMonthButtonDisabled}
              className="p-1 rounded-md border-1 border-gray-200 bg-gray-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
        renderDayContents={(day, date) => {
          const attendance = getAttendanceStatus(date);

          const isSelected =
            selectedDate?.toDateString() === date.toDateString();
          const baseClasses = "transition-all duration-200";
          const highlightClass = (() => {
            switch (attendance?.status) {
              case "present":
                return "!bg-green-100 !text-green-700 rounded-md";
              case "absent":
                return "!bg-red-100 !text-red-700 rounded-md";
              case "on-leave":
                return "!bg-yellow-100 !text-yellow-700 rounded-md";
              case "holiday":
                return "!bg-blue-100 !text-blue-700 rounded-md";
              case "week-off":
                return "!bg-gray-200 !text-gray-700 rounded-md";
              case "work-from-home":
                return "!bg-purple-100 !text-purple-800 rounded-md";
              default:
                return "hover:!bg-gray-100 !text-gray-700 rounded-md";
            }
          })();
          const selectedClass = isSelected
            ? "border-2 font-bold border-black rounded-md"
            : "";

          const dayClasses = `${baseClasses} ${highlightClass} ${selectedClass}`;
          const dayBoxStyles = `w-full h-full flex items-center justify-center text-base ${dayClasses}`;

          if (attendance?.status === "half-day") {
            const firstColor =
              gradientClassMap[attendance?.firstHalf?.toLowerCase() || ""];
            const secondColor =
              gradientClassMap[attendance?.secondHalf?.toLowerCase() || ""];
            const gradient = `linear-gradient(to bottom right, ${firstColor} 50%, ${secondColor} 50%)`;

            return (
              <div
                className={dayBoxStyles}
                style={{
                  backgroundImage: gradient,
                  borderRadius: "0.375rem",
                  color: "black",
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {day}
              </div>
            );
          }
          return (
            <div className={dayBoxStyles}>
              <div className="flex flex-col items-center gap-1">
                <span>{day}</span>
                {(attendance?.events ?? []).length > 0 && (
                  <div className="flex gap-1">
                    {Array.from(
                      new Set(
                        (attendance?.events ?? []).map((event) => event.doctype)
                      )
                    ).map((doctype, index) => (
                      <div
                        key={index}
                        className={`w-[6px] h-[6px] rounded-full ${getEventDotColor(
                          doctype
                        )}`}
                        title={doctype}
                      />
                    ))}
                  </div>
                )}
              </div>
         
            </div>
          );
        }}
      />
    </div>
  );
};

export default AttendanceCalendar
