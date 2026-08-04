import React from 'react';
import { Info } from 'lucide-react';
import { Typography } from '../../../shared/atoms/Typography';
import { useScreenSize } from '../../../../hooks/useScreenSize';

interface TimesheetMetricsProps {
  totals: {
    totalWeeklyHours: number;
    billableHours: number;
    nonBillableHours: number;
  };
  formatCellOnBlur: (hours: number) => string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  employeeDetails?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user?: any;
  company: string;
  timesheetStatus: string;
}

export const TimesheetMetrics: React.FC<TimesheetMetricsProps> = ({
  totals,
  formatCellOnBlur,
  employeeDetails,
  user,
  company,
  timesheetStatus
}) => {
  const { isDesktop } = useScreenSize();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      {/* Total logged hours progress bar */}
      <div className="md:col-span-2 space-y-3">
        <div className="flex justify-between items-center">
          <Typography variant="bodyMedium" color="body1" className="font-semibold flex items-center gap-1.5">
            Total Logs <Info className="w-4 h-4 text-gray-400" />
          </Typography>
          <Typography variant="body" color="title" className="font-semibold">
            {formatCellOnBlur(totals.totalWeeklyHours) || "0:00"} / 40:00 hrs
          </Typography>
        </div>
        <div className="w-full bg-gray-100 h-3.5 rounded-xl overflow-hidden">
          <div
            className="bg-primary h-full rounded-xl transition-all duration-300"
            style={{ width: `${Math.min((totals.totalWeeklyHours / 40) * 100, 100)}%` }}
          />
        </div>
        <div className="flex gap-4 pt-1">
          <Typography variant="caption" color="body2" className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            Billable: <strong className="text-gray-700">{formatCellOnBlur(totals.billableHours) || "0:00"}</strong>
          </Typography>
          <Typography variant="caption" color="body2" className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
            Non-Billable: <strong className="text-gray-700">{formatCellOnBlur(totals.nonBillableHours) || "0:00"}</strong>
          </Typography>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="flex flex-col justify-center border-t md:border-t-0 md:border-l border-gray-100 md:pl-6 space-y-2">
        <Typography variant="bodySmall" color="body2" className="font-medium">
          Employee: <strong className="text-gray-800">{employeeDetails?.employee_name || user?.full_name || "-"}</strong>
        </Typography>
        <Typography variant="bodySmall" color="body2" className="font-medium">
          Department: <strong className="text-gray-800">{employeeDetails?.department_name || "-"}</strong>
        </Typography>
        <Typography variant="bodySmall" color="body2" className="font-medium">
          Company: <strong className="text-gray-800">{company || "-"}</strong>
        </Typography>

        {!isDesktop && (
          <div className="flex items-center gap-2 pt-2 mt-2 border-t border-gray-100">
            <Typography variant="bodySmall" color="body1" className="font-semibold">Timesheet Status:</Typography>
            <Typography variant="caption" className={`px-2.5 py-1 rounded-xl font-semibold ${timesheetStatus === "Submitted" ? "bg-blue-50 text-blue-700 border border-blue-100" :
              timesheetStatus === "Billed" ? "bg-green-50 text-green-700 border border-green-100" :
                "bg-yellow-50 text-yellow-700 border border-yellow-100"
              }`}>
              {timesheetStatus}
            </Typography>
          </div>
        )}
      </div>
    </div>
  );
};
