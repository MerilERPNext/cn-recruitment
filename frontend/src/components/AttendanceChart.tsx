import React from 'react';
import { CheckCircle, XCircle, Timer, Calendar } from 'lucide-react';

interface AttendanceChartProps {
  present?: number;
  absent?: number;
  leaves?: number;
  className?: string;
}

const AttendanceChart: React.FC<AttendanceChartProps> = ({
  present = 20,
  absent = 1,
  leaves = 2,
  className = ''
}) => {
  const total = present + absent + leaves;
  const presentPercent = total > 0 ? (present / total) * 100 : 0;
  const absentPercent = total > 0 ? (absent / total) * 100 : 0;
  const leavesPercent = total > 0 ? (leaves / total) * 100 : 0;


  // Convert percentages to angles (360 degrees = 100%)
  const presentAngle = (presentPercent / 100) * 360;
  const absentAngle = (absentPercent / 100) * 360;

  // SVG path for donut segments
  const createArcPath = (startAngle: number, endAngle: number, outerRadius: number, innerRadius: number) => {
    const startAngleRad = (startAngle - 90) * (Math.PI / 180);
    const endAngleRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = 100 + outerRadius * Math.cos(startAngleRad);
    const y1 = 100 + outerRadius * Math.sin(startAngleRad);
    const x2 = 100 + outerRadius * Math.cos(endAngleRad);
    const y2 = 100 + outerRadius * Math.sin(endAngleRad);

    const x3 = 100 + innerRadius * Math.cos(endAngleRad);
    const y3 = 100 + innerRadius * Math.sin(endAngleRad);
    const x4 = 100 + innerRadius * Math.cos(startAngleRad);
    const y4 = 100 + innerRadius * Math.sin(startAngleRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  const weeklyData = [
    { day: 'Mon', present: 1, absent: 0, leave: 0 },
    { day: 'Tue', present: 1, absent: 0, leave: 0 },
    { day: 'Wed', present: 0, absent: 0, leave: 1 },
    { day: 'Thu', present: 1, absent: 0, leave: 0 },
    { day: 'Fri', present: 1, absent: 0, leave: 0 },
    { day: 'Sat', present: 0, absent: 0, leave: 0 },
    { day: 'Sun', present: 0, absent: 0, leave: 0 },
  ];

  return (
    <div className={`bg-white p-6 rounded-lg border border-gray-200 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">📊 Attendance Overview</h3>
          <p className="text-sm text-gray-600">Monthly attendance summary</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{total}</p>
          <p className="text-sm text-gray-500">Total Days</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Donut Chart */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <svg width="300" height="300" viewBox="0 0 200 200" className="transform -rotate-90">
              {/* Present segment */}
              <path
                d={createArcPath(0, presentAngle, 80, 50)}
                fill="#10b981"
                className="transition-all duration-700 hover:opacity-80"
              />
              
              {/* Absent segment */}
              <path
                d={createArcPath(presentAngle, presentAngle + absentAngle, 80, 50)}
                fill="#ef4444"
                className="transition-all duration-700 hover:opacity-80"
              />
              
              {/* Leaves segment */}
              <path
                d={createArcPath(presentAngle + absentAngle, 360, 80, 50)}
                fill="#f59e0b"
                className="transition-all duration-700 hover:opacity-80"
              />
            </svg>
            
            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{presentPercent.toFixed(0)}%</p>
                <p className="text-xs text-gray-500">Present</p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100 hover:bg-green-100 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-green-800">Present Days</p>
                <p className="text-sm text-green-600">{presentPercent.toFixed(1)}% of total</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-800">{present}</p>
              <div className="w-12 h-1 bg-green-300 rounded-lg">
                <div 
                  className="h-1 bg-green-600 rounded-lg transition-all duration-500"
                  style={{ width: `${presentPercent}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100 hover:bg-red-100 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-red-800">Absent Days</p>
                <p className="text-sm text-red-600">{absentPercent.toFixed(1)}% of total</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-red-800">{absent}</p>
              <div className="w-12 h-1 bg-red-300 rounded-lg">
                <div 
                  className="h-1 bg-red-600 rounded-lg transition-all duration-500"
                  style={{ width: `${Math.max(absentPercent, 5)}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-100 hover:bg-amber-100 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <Timer className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-amber-800">Leave Days</p>
                <p className="text-sm text-amber-600">{leavesPercent.toFixed(1)}% of total</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-amber-800">{leaves}</p>
              <div className="w-12 h-1 bg-amber-300 rounded-lg">
                <div 
                  className="h-1 bg-amber-600 rounded-lg transition-all duration-500"
                  style={{ width: `${Math.max(leavesPercent, 5)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Bar Chart */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          This Week's Activity
        </h4>
        <div className="flex items-end justify-between space-x-2 h-24">
          {weeklyData.map((day) => {
            const dayTotal = day.present + day.absent + day.leave;
            const maxHeight = 60;
            
            return (
              <div key={day.day} className="flex-1 flex flex-col items-center">
                <div className="flex flex-col space-y-0.5 mb-2" style={{ height: maxHeight }}>
                  {/* Present bar */}
                  {day.present > 0 && (
                    <div 
                      className="w-full bg-green-500 rounded-sm transition-all duration-500 hover:bg-green-600"
                      style={{ height: `${(day.present / 1) * maxHeight}px` }}
                      title={`Present: ${day.present}`}
                    ></div>
                  )}
                  
                  {/* Leave bar */}
                  {day.leave > 0 && (
                    <div 
                      className="w-full bg-amber-500 rounded-sm transition-all duration-500 hover:bg-amber-600"
                      style={{ height: `${(day.leave / 1) * maxHeight}px` }}
                      title={`Leave: ${day.leave}`}
                    ></div>
                  )}
                  
                  {/* Absent bar */}
                  {day.absent > 0 && (
                    <div 
                      className="w-full bg-red-500 rounded-sm transition-all duration-500 hover:bg-red-600"
                      style={{ height: `${(day.absent / 1) * maxHeight}px` }}
                      title={`Absent: ${day.absent}`}
                    ></div>
                  )}
                  
                  {/* Empty state */}
                  {dayTotal === 0 && (
                    <div 
                      className="w-full bg-gray-200 rounded-sm"
                      style={{ height: '8px' }}
                      title="No data"
                    ></div>
                  )}
                </div>
                <span className={`text-xs font-medium ${
                  dayTotal > 0 ? 'text-gray-700' : 'text-gray-400'
                }`}>
                  {day.day}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="flex justify-center space-x-6 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
            <span className="text-xs text-gray-600">Present</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-amber-500 rounded-sm"></div>
            <span className="text-xs text-gray-600">Leave</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
            <span className="text-xs text-gray-600">Absent</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceChart;
