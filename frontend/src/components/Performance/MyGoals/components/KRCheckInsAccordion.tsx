import React, { memo } from 'react';
import { ChevronDown, Paperclip, ExternalLink, AlertCircle, RotateCw } from 'lucide-react';
import { Typography } from '../../../shared/atoms/Typography';
import Badge from '../../../shared/Badge';
import { useGoalCheckIns } from '../../../../hooks/usePerformance';
import type { GoalCheckInSentiment, GoalDetailKeyResult } from '../../../../types/goal';

const dateFormatter = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

const formatCheckInDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
};

const sentimentStyles: Record<GoalCheckInSentiment, { active: string; dot: string }> = {
  'On Track': { active: 'border-green-300 bg-green-50 text-green-700 ring-1 ring-green-200', dot: 'bg-green-500' },
  'At Risk': { active: 'border-amber-300 bg-amber-50 text-amber-700 ring-1 ring-amber-200', dot: 'bg-amber-500' },
  Blocked: { active: 'border-red-300 bg-red-50 text-red-700 ring-1 ring-red-200', dot: 'bg-red-500' },
};

export interface KRCheckInsAccordionProps {
  kr: GoalDetailKeyResult;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}

export const KRCheckInsAccordion: React.FC<KRCheckInsAccordionProps> = memo(
  ({ kr, index, isOpen, onToggle }) => {
    const krId = kr.goal_key || kr.goal || '';
    const { data: krCheckInsResponse, isLoading, isError, error, refetch, isFetching } = useGoalCheckIns(krId, { enabled: isOpen && !!krId });
    const checkIns = krCheckInsResponse?.data?.check_ins ?? [];

    return (
      <div className="border border-gray-200 rounded-xl overflow-hidden mb-3 bg-white shadow-2xs transition-shadow hover:shadow-xs">
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between p-3 bg-gray-50/80 hover:bg-gray-100 transition-colors text-left cursor-pointer select-none"
        >
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <Badge label={`KR ${index + 1}`} variant="purple" size="sm" />
            <span className="text-xs font-semibold text-gray-800 truncate" title={kr.title}>
              {kr.title || `KR ${index + 1}`}
            </span>
            <span className="text-[10px] text-gray-500 font-medium shrink-0 bg-gray-200/60 px-1.5 py-0.5 rounded-md">
              {checkIns.length} {checkIns.length === 1 ? 'check-in' : 'check-ins'}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0 text-gray-400 hover:text-gray-600">
            <ChevronDown
              className={`w-4 h-4 transform transition-transform duration-300 ease-in-out ${
                isOpen ? 'rotate-180' : 'rotate-0'
              }`}
            />
          </div>
        </button>

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
            isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="p-3 space-y-2.5 max-h-[280px] overflow-y-auto border-t border-gray-100 bg-white">
              {isError ? (
                <div className="flex flex-col items-center justify-center p-4 text-center rounded-lg border border-red-100 bg-red-50/60 my-1">
                  <AlertCircle className="w-5 h-5 text-red-500 mb-1.5" />
                  <Typography variant="caption" className="text-red-700 font-medium mb-2">
                    {error?.message || 'Failed to load check-ins.'}
                  </Typography>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:text-red-800 bg-red-100/80 hover:bg-red-200/80 disabled:opacity-50 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                    {isFetching ? 'Retrying...' : 'Retry'}
                  </button>
                </div>
              ) : isLoading ? (
                <div className="space-y-2.5">
                  {[1, 2].map((item) => (
                    <div key={item} className="rounded-lg border border-gray-100 p-2.5 bg-white animate-pulse">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1.5 flex-1">
                          <div className="h-4 w-28 rounded bg-slate-200" />
                          <div className="h-3 w-16 rounded bg-slate-100" />
                        </div>
                        <div className="h-5 w-16 rounded-xl bg-slate-100" />
                      </div>
                      <div className="mt-2 h-3 w-3/4 rounded bg-slate-100" />
                    </div>
                  ))}
                </div>
              ) : checkIns.length ? (
                checkIns.map((checkIn) => (
                  <div
                    key={checkIn.name}
                    className="rounded-lg border border-gray-100 p-2.5 bg-gray-50/40 hover:border-gray-200 transition-colors"
                  >
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
                  </div>
                ))
              ) : (
                <Typography variant="caption" className="text-gray-400 block text-center py-2">
                  No check-ins yet for this KR
                </Typography>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) =>
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.index === nextProps.index &&
    (prevProps.kr.goal_key || prevProps.kr.goal) === (nextProps.kr.goal_key || nextProps.kr.goal)
);

KRCheckInsAccordion.displayName = 'KRCheckInsAccordion';

export default KRCheckInsAccordion;
