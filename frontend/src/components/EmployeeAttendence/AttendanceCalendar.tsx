import React from 'react'
import AttendanceLegend from './AttendanceLegend';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useScreenSize } from '../../hooks/useScreenSize';
import DatePicker from 'react-datepicker';
import { AttendanceRecord } from '../../types/attendance';
type ShowDetailsType = {
  date: Date;
  status: string;
  data: AttendanceRecord;
};
type attendanceProps = {
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  getAttendanceStatus: (date: Date ) => AttendanceRecord;
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
        />
      </div>
    
  );
};

export default AttendanceCalendar
