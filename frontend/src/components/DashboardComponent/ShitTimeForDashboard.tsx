import React from "react";
import { Clock, CheckCircle, XCircle } from "lucide-react";

interface DailyTimingsProps {
  shiftStart?: string | null;
  shiftEnd?: string | null;
  inTime?: string | null;
  outTime?: string | null;
  formatTime: (time: string) => string;
}

const DailyTimings: React.FC<DailyTimingsProps> = ({
  shiftStart,
  shiftEnd,
  inTime,
  outTime,
  formatTime,
}) => {
  return (
    <div className="bg-white rounded-lg mb-2 p-6 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-4">Daily Timings</h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Shift Start */}
        <div className="bg-blue-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 tracking-wide">
                SHIFT START
              </p>
              <p className="text-lg sm:text-xl font-bold text-blue-600">
                {shiftStart ? formatTime(shiftStart) : "--:--"}
              </p>
            </div>
          </div>
        </div>

        {/* In Time */}
        <div className="bg-green-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 tracking-wide">
                IN TIME
              </p>
              <p className="text-lg sm:text-xl font-bold text-green-600">
                {inTime ? formatTime(inTime) : "--:--"}
              </p>
            </div>
          </div>
        </div>

        {/* Shift End */}
        <div className="bg-blue-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 tracking-wide">
                SHIFT END
              </p>
              <p className="text-lg sm:text-xl font-bold text-blue-600">
                {shiftEnd ? formatTime(shiftEnd) : "--:--"}
              </p>
            </div>
          </div>
        </div>

        {/* Out Time */}
        <div className="bg-red-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 tracking-wide">
                OUT TIME
              </p>
              <p className="text-lg sm:text-xl font-bold text-red-600">
                {outTime ? formatTime(outTime) : "--:--"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyTimings;
