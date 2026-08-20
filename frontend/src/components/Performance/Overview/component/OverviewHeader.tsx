import React from 'react';
import { ArrowRight, Check } from 'lucide-react'
import Badge from '../../../shared/Badge'
import { Typography } from '../../../shared/atoms/Typography'
import Button from '../../../shared/atoms/Button';
import { useScreenSize } from '../../../../hooks/useScreenSize';
import { useNavigate } from 'react-router-dom';
import { usePerformanceOverview } from '../../../../hooks/usePerformance';

const steps = [
  { n: null, label: "Goal Setting", done: true },
  { n: 2, label: "Self-Review", active: true },
  { n: 3, label: "Manager Review", done: false },
  { n: 4, label: "Calibration", done: false },
  { n: 5, label: "Released", done: false },
];
export const formatDate = (date?: string) => date
  ? new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`))
  : '';
const OverviewHeader = () => {
  const { isMobile, isTablet } = useScreenSize();
  const navigate = useNavigate();
  const isCompact = isMobile || isTablet;
  const { data: overviewResponse } = usePerformanceOverview();
  const overview = overviewResponse?.data;

  return (
     <article aria-label="Cycle Information" className="min-w-0 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
              <div aria-label="Cycle Details" className="mb-5 flex min-w-0 flex-col justify-between gap-4 sm:mb-8 lg:flex-row lg:items-end">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge label={overview?.status ? `CYCLE ${overview.status.toUpperCase()}` : 'CYCLE LIVE'} backgroundColor="bg-blue-100 " textColor="text-blue-700" size="sm" pulse={{ show: true, color: "bg-blue-600" }} />
                    <Typography variant="bodySmall" className="break-words text-gray-500">
                      {overview ? `${formatDate(overview.start_date)} → ${formatDate(overview.end_date)} · ${overview.company}` : 'Apr 2026 → Mar 2027 · India Tech'}
                    </Typography>
                  </div>
                  <Typography variant="h3" className="break-words text-xl leading-tight sm:text-2xl">{overview?.cycle_name || 'FY26 Annual Performance Cycle'}</Typography>
                  <Typography variant="bodySmall" className="mt-1 block break-words text-gray-500">
                    {overview ? `Configured by ${overview.configured_by} · ${overview.framework} · ${overview.participants.toLocaleString()} participant${overview.participants === 1 ? '' : 's'}` : 'Configured by HR · India Tech BU · 2,140 participants'}
                  </Typography>
                </div>
                <div className="flex w-full min-w-0 flex-col items-start lg:w-auto lg:items-end">
                  <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center lg:w-auto lg:justify-end">
            <Button
              variant="contain"
              bgColor="primary"
              onClick={() => navigate("/webapp/performance-app/review")}
              className={`${isCompact ? "w-full sm:w-auto" : "px-5 py-2.5"} bg-[#1a73e8] hover:bg-blue-600 font-semibold rounded-lg shadow-sm text-sm inline-flex items-center justify-center`}
            >
              Continue Self-Review <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
                  </div>
                </div>
              </div>
    
              {/* Stepper */}
              {(!overview?.stages || overview.stages.length > 0) && (
                <div className="flex items-center gap-0 overflow-x-auto pb-1 scrollbar-hide">
                  {steps.map((step, idx) => (
                    <React.Fragment key={step.label}>
                      {idx > 0 && <div className="h-px w-10 shrink-0 bg-gray-200 mx-3" />}
                      <div
                        className={`flex items-center gap-2 shrink-0 ${!step.done && !step.active ? "opacity-40" : ""}`}
                      >
                        {step.done ? (
                          <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        ) : (
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step.active ? "bg-[#1a73e8] text-white" : "bg-gray-100 text-gray-500"}`}
                          >
                            {step.n}
                          </div>
                        )}
                        <Typography
                          variant="caption"
                          className={`whitespace-nowrap font-medium text-[11px] ${step.active ? "text-[#1a73e8] font-bold" : step.done ? "text-green-600 font-bold" : "text-gray-500"}`}
                        >
                          {step.label}
                        </Typography>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </article>
    
  )
}

export default React.memo(OverviewHeader);
