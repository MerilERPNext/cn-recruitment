import React, { memo } from 'react';
import { ChevronDown, AlertCircle, RotateCw } from 'lucide-react';
import { Typography } from '../../../shared/atoms/Typography';
import Badge from '../../../shared/Badge';
import { useGoalCheckIns } from '../../../../hooks/usePerformance';
import type { GoalDetailKeyResult } from '../../../../types/goal';
import CheckInItem from './CheckInItem';

export interface KRCheckInsAccordionProps {
  kr: GoalDetailKeyResult;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}

export const KRCheckInsAccordion: React.FC<KRCheckInsAccordionProps> = memo(
  ({ kr, index, isOpen, onToggle }) => {
    const krId = kr.goal_key || kr.goal || '';
    const { data: krCheckInsResponse, isLoading, isError, error, refetch, isFetching } = useGoalCheckIns(krId, { enabled: !!krId });
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
                  <CheckInItem key={checkIn.name} checkIn={checkIn} />
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
