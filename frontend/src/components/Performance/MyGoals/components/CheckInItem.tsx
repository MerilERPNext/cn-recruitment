import React, { memo } from 'react';
import { Paperclip, ExternalLink } from 'lucide-react';
import { Typography } from '../../../shared/atoms/Typography';
import type { GoalCheckIn, GoalCheckInSentiment } from '../../../../types/goal';

const dateFormatter = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatCheckInDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
};

export const sentimentStyles: Record<GoalCheckInSentiment, { active: string; dot: string }> = {
  'On Track': { active: 'border-green-300 bg-green-50 text-green-700 ring-1 ring-green-200', dot: 'bg-green-500' },
  'At Risk': { active: 'border-amber-300 bg-amber-50 text-amber-700 ring-1 ring-amber-200', dot: 'bg-amber-500' },
  Blocked: { active: 'border-red-300 bg-red-50 text-red-700 ring-1 ring-red-200', dot: 'bg-red-500' },
};

export interface CheckInItemProps {
  checkIn: GoalCheckIn;
}

export const CheckInItem: React.FC<CheckInItemProps> = memo(({ checkIn }) => {
  return (
    <div className="rounded-lg border border-gray-100 p-2.5 bg-gray-50/40 hover:border-gray-200 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Typography variant="bodySmall" className="font-semibold text-gray-800">
            {checkIn.progress}% progress
          </Typography>
          <Typography variant="caption" className="text-gray-400">
            {formatCheckInDate(checkIn.checkin_date || checkIn.creation)}
          </Typography>
        </div>
        <span
          className={`inline-flex items-center gap-1 whitespace-nowrap rounded-xl px-2 py-0.5 text-[10px] font-semibold ${
            sentimentStyles[checkIn.sentiment]?.active ?? 'bg-gray-100 text-gray-600'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              sentimentStyles[checkIn.sentiment]?.dot ?? 'bg-gray-400'
            }`}
          />
          {checkIn.sentiment}
        </span>
      </div>
      {checkIn.note && (
        <Typography
          variant="caption"
          className="mt-1.5 block whitespace-pre-wrap break-words [word-break:break-word] text-gray-600"
        >
          {checkIn.note}
        </Typography>
      )}
      {checkIn.attachment && (
        <a
          href={checkIn.attachment}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
        >
          <Paperclip className="h-3 w-3" />
          View attachment
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
      <Typography >
        {checkIn.manager_comment ?? ""}
        {checkIn.manager_comment_by ?? ""}
        {checkIn.manager_comment_on ?? ""}

      </Typography>
    </div>
  );
});

CheckInItem.displayName = 'CheckInItem';

export default CheckInItem;
