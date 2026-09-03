import React, { memo } from 'react';
import { Paperclip, ExternalLink, MessageSquare } from 'lucide-react';
import { Typography } from '../../../shared/atoms/Typography';
import type { GoalCheckIn, GoalCheckInSentiment } from '../../../../types/goal';

const dateFormatter = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const parseDateString = (value: string): Date | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const formattedStr = trimmed.includes(' ') ? trimmed.replace(' ', 'T') : trimmed;
  const date = new Date(formattedStr);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatCheckInDate = (value?: string) => {
  if (!value) return '-';
  const date = parseDateString(value);
  return date ? dateFormatter.format(date) : value;
};

export const formatCheckInDateTime = (value?: string) => {
  if (!value) return '-';
  const date = parseDateString(value);
  return date ? dateTimeFormatter.format(date) : value;
};

export const sentimentStyles: Record<GoalCheckInSentiment, { active: string; dot: string }> = {
  'On Track': { active: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20', dot: 'bg-emerald-500' },
  'At Risk': { active: 'border-amber-500/30 bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20', dot: 'bg-amber-500' },
  Blocked: { active: 'border-red-500/30 bg-red-500/10 text-red-500 ring-1 ring-red-500/20', dot: 'bg-red-500' },
};

export interface CheckInItemProps {
  checkIn: GoalCheckIn;
}

export const CheckInItem: React.FC<CheckInItemProps> = memo(({ checkIn }) => {
  const hasManagerComment = Boolean(checkIn.manager_comment && checkIn.manager_comment.trim());

  return (
    <div className="rounded-lg border border-border p-2.5 bg-card hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Typography variant="bodySmall" className="font-semibold text-text-title">
            {checkIn.progress}% progress
          </Typography>
          <Typography variant="caption" color="body2">
            {formatCheckInDate(checkIn.checkin_date || checkIn.creation)}
          </Typography>
        </div>
        <span
          className={`inline-flex items-center gap-1 whitespace-nowrap rounded-xl px-2 py-0.5 text-[10px] font-semibold ${
            sentimentStyles[checkIn.sentiment]?.active ?? 'bg-slate-500/10 text-text-body2'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              sentimentStyles[checkIn.sentiment]?.dot ?? 'bg-slate-400'
            }`}
          />
          {checkIn.sentiment}
        </span>
      </div>
      {checkIn.note && (
        <Typography
          variant="caption"
          color="body2"
          className="mt-1.5 block whitespace-pre-wrap break-words [word-break:break-word]"
        >
          {checkIn.note}
        </Typography>
      )}
      {checkIn.attachment && (
        <a
          href={checkIn.attachment}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <Paperclip className="h-3 w-3" />
          View attachment
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
      {hasManagerComment && (
        <div className="mt-2.5 rounded-lg border border-primary/30 bg-primary/10 p-2.5 text-xs">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-semibold text-primary inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3 text-primary" />
              Manager Comment
            </span>
            {checkIn.manager_comment_on && (
              <span className="text-[10px] text-primary/80 font-medium">
                {formatCheckInDateTime(checkIn.manager_comment_on)}
              </span>
            )}
          </div>
          <p className="whitespace-pre-wrap break-words [word-break:break-word] text-text-title text-xs font-medium">
            {checkIn.manager_comment}
          </p>
          {checkIn.manager_comment_by && (
            <span className="mt-1 block text-[10px] text-text-body2">
              — {checkIn.manager_comment_by}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

CheckInItem.displayName = 'CheckInItem';

export default CheckInItem;

