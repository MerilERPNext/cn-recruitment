import React from 'react';
import { Check } from 'lucide-react';
import { Typography } from '../../../shared/atoms/Typography';

interface TimesheetHeaderProps {
  isReadOnly: boolean;
}

export const TimesheetHeader: React.FC<TimesheetHeaderProps> = ({ isReadOnly }) => {
  return (
    <div className="flex flex-shrink-0 flex-col justify-between gap-4 border-b border-border bg-card px-6 py-4 md:flex-row md:items-center">
      <div>
        <Typography variant="h4" className="text-gray-900 flex items-center gap-3">
          <span>Weekly Timesheet Entry</span>
        </Typography>
        <Typography variant="bodySmall" color="body2" className="mt-1">
          Log your daily project and task timesheets.
        </Typography>
      </div>

      <div className="flex items-center gap-3">
        {isReadOnly && (
          <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-xs font-semibold border border-blue-200">
            <Check className="w-3.5 h-3.5" /> Checked / Locked
          </span>
        )}
      </div>
    </div>
  );
};
