import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Plus, Target, Timer, Weight } from 'lucide-react';
import { Typography } from '../../shared/atoms/Typography';
import Badge, { type BadgeVariant } from '../../shared/Badge';
import Button from '../../shared/atoms/Button';
import { useScreenSize } from '../../../hooks/useScreenSize';
import { goals } from './data';
import type { GoalKeyResult, GoalStatus } from './types';

const getStatusVariant = (status: GoalStatus): BadgeVariant => {
  if (status === 'On-track') return 'success';
  if (status === 'At-risk') return 'warning';
  if (status === 'Off-track') return 'danger';
  return 'default';
};

const MyGoals: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile, isTablet, isDesktop } = useScreenSize();
  const isCompact = isMobile || isTablet;

  return (
    <div className="min-h-full overflow-y-auto overflow-x-hidden bg-[#f6f8fb] px-3 py-4 font-sans sm:px-4 sm:py-5 lg:px-6 lg:py-6">
      <div className="mx-auto w-full  min-w-0 space-y-4 sm:space-y-5">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex min-w-0 flex-col gap-4 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <Typography variant="h3" className="text-xl leading-tight text-slate-950 sm:text-2xl">
                My Goals &middot; FY26
              </Typography>
              <Typography variant="bodySmall" className="mt-1 block break-words text-slate-500">
                5 goals &middot; 100% weightage &middot; Goal lock 21 May 2026
              </Typography>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-2 min-[520px]:grid-cols-3 lg:w-[650px] lg:max-w-[650px]">
              {[
                { icon: Target, label: 'Goals', value: '5' },
                { icon: Weight, label: 'Weightage', value: '100%' },
                { icon: Timer, label: 'Locked', value: '21 May' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="min-w-0 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <Typography variant="caption" className="truncate text-slate-500">
                      {label}
                    </Typography>
                  </div>
                  <Typography variant="bodySmall" className="mt-1 block truncate font-semibold text-slate-950">
                    {value}
                  </Typography>
                </div>
              ))}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3 p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex h-10 w-full min-w-0 items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-1 text-sm md:max-w-[580px]">
              <button className="h-full min-w-0 flex-1 rounded-md px-3 font-medium text-slate-600 transition-colors hover:bg-white lg:flex-none" aria-label="Show goals as list">
                List
              </button>
              <button className="h-full min-w-0 flex-1 rounded-md bg-white px-3 font-semibold text-blue-600 shadow-sm ring-1 ring-slate-200 lg:flex-none" aria-label="Show goals as tree">
                Tree
              </button>
              <button className="h-full min-w-0 flex-1 rounded-md px-3 font-medium text-slate-600 transition-colors hover:bg-white lg:flex-none" aria-label="Show goal alignment">
                {isCompact ? 'Align' : 'Alignment'}
              </button>
            </div>

            <div className="grid w-full shrink-0 grid-cols-2 gap-3 sm:flex sm:items-center md:w-auto">
              <Button variant="outline" bgColor="text" size="sm" icon={<Filter className="h-4 w-4" />} className="h-10 w-full justify-center bg-white sm:w-auto">
                Filter
              </Button>
              <Button onClick={() => navigate('/webapp/performance-app/my-goals/new-goal')} variant="contain" bgColor="primary" size="sm" icon={<Plus className="h-4 w-4" />} className="h-10 w-full justify-center sm:w-auto">
                New Goal
              </Button>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex min-w-0 flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 shadow-sm sm:p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="shrink-0">
              <Badge label="ORG" variant="blue" size="md" />
            </div>
            <div className="min-w-0">
              <Typography variant="bodyMedium" className="mb-0.5 block break-words font-semibold leading-snug text-slate-950">
                PW FY26 &middot; Become the #1 EdTech platform in India by Q4
              </Typography>
              <Typography variant="caption" className="block break-words leading-relaxed text-slate-600">
                Cascaded from Alakh Pandey &middot; OKR &middot; 8 org-level KRs
              </Typography>
            </div>
          </div>
          <div className="self-start md:self-center">
            <Badge label="Aligned" variant="white" size="sm" />
          </div>
        </div>

        <div className="relative min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 lg:p-5">
          {!isCompact && <div className="absolute bottom-8 left-[38px] top-5 w-px bg-slate-200" />}

          <div className="relative min-w-0 space-y-3 sm:space-y-4 md:pl-9 lg:pl-12">
            {goals.map((goal, index) => (
              <div
                key={index}
                onClick={() => navigate(`/webapp/performance-app/my-goals/${index}`)}
                className="relative z-10 min-w-0 cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
              >
                {!isCompact && <div className="absolute left-[-28px] top-12 h-px w-[28px] bg-slate-200" />}

                <div className="relative z-10 flex min-w-0 flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between lg:p-5">
                  <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:w-[104px] sm:flex-col sm:items-start sm:gap-1">
                      <Badge label={goal.type} variant="purple" size="sm" />
                      <Typography variant="caption" className="text-slate-500 sm:ml-1">
                        {goal.label}
                      </Typography>
                    </div>
                    <div className="min-w-0 flex-1">
                      <Typography variant="bodyMedium" className="mb-1 block break-words font-semibold leading-snug text-slate-950">
                        {goal.title}
                      </Typography>
                      <Typography variant="caption" className="block break-words leading-relaxed text-slate-500">
                        {goal.subtitle}
                      </Typography>
                    </div>
                  </div>

                  <div className="flex w-full min-w-0 shrink-0 flex-col gap-3 rounded-lg bg-slate-50 p-3 md:flex-row md:items-center md:justify-between lg:w-[400px] lg:bg-transparent lg:p-0">
                    <div className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 lg:border-r lg:border-slate-100 lg:pr-5">
                      <div className="min-w-0">
                        <Typography variant="bodyMedium" className="block whitespace-nowrap font-bold text-slate-950">
                          {goal.current} <span className="font-normal text-slate-500">/ {goal.target}</span>
                        </Typography>
                        <Typography variant="caption" className="mt-0.5 block break-words text-slate-500">
                          {goal.unit}
                        </Typography>
                      </div>
                      <div className="flex min-w-0 flex-col gap-1.5">
                        <Typography variant="caption" className="text-right text-slate-500">
                          {goal.percentage}% - {goal.weight}w
                        </Typography>
                        <div className="h-2 w-full overflow-hidden rounded-md bg-slate-200">
                          <div className={`h-2 rounded-md ${goal.barColor}`} style={{ width: `${goal.percentage}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 md:flex-col md:items-end">
                      <Badge label={goal.status} variant={getStatusVariant(goal.status)} size="sm" pulse={{ show: true }} />
                      <Badge label={goal.state} variant="info" size="sm" />
                    </div>
                  </div>
                </div>

                {goal.krs && (
                  <div className="relative z-10 border-t border-slate-100 bg-slate-50/70 p-3 sm:p-4">
                    <div className="relative min-w-0 space-y-3 md:pl-8">
                      {!isCompact && <div className="absolute bottom-4 left-[16px] top-[-16px] w-px bg-slate-200" />}
                      {goal.krs.map((kr: GoalKeyResult, kIdx: number) => (
                        <div key={kIdx} className="relative flex min-w-0 flex-col gap-2 rounded-lg border border-slate-100 bg-white p-3 lg:flex-row lg:items-center">
                          {!isCompact && <div className="absolute left-[-16px] top-[18px] h-px w-[16px] bg-slate-200" />}

                          <div className="flex min-w-0 flex-1 items-start gap-3 lg:items-center">
                            <div className="mt-0.5 flex-shrink-0">
                              <Badge label={kr.id} variant="purple-outline" size="sm" />
                            </div>
                            <Typography variant="caption" className="min-w-0 break-words leading-relaxed text-slate-600">
                              {kr.title}
                            </Typography>
                          </div>

                          <div className="flex w-full min-w-0 shrink-0 items-center justify-start lg:w-[240px] xl:w-[320px]">
                            <div className="flex w-full min-w-0 flex-col gap-1">
                              {!isDesktop && (
                                <Typography variant="caption" className="text-right text-slate-500">
                                  {kr.percentage}%
                                </Typography>
                              )}
                              <div className="h-1.5 w-full overflow-hidden rounded-md bg-slate-200">
                                <div className="h-1.5 rounded-md bg-blue-500" style={{ width: `${kr.percentage}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyGoals;
