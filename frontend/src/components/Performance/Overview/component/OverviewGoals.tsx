import React from 'react';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Typography } from '../../../shared/atoms/Typography';
import Badge, { type BadgeVariant } from '../../../shared/Badge';
import { useMyGoals } from '../../../../hooks/usePerformance';
import type { MyGoalsGoal } from '../../../../types/goal';
import PerformanceSkeleton from '../../PerformanceSkeleton';

const getStatusVariant = (status?: string): BadgeVariant => {
  const s = (status ?? '').toLowerCase();
  if (s === 'on-track' || s === 'completed') return 'success';
  if (s === 'at-risk' || s === 'in progress') return 'warning';
  if (s === 'off-track' || s === 'cancelled') return 'danger';
  if (s === 'not started') return 'default';
  return 'default';
};

const getBarColor = (status?: string): string => {
  const s = (status ?? '').toLowerCase();
  if (s === 'on-track' || s === 'completed') return 'bg-green-500';
  if (s === 'at-risk' || s === 'in progress') return 'bg-yellow-500';
  if (s === 'off-track' || s === 'cancelled') return 'bg-red-500';
  return 'bg-blue-500';
};

const OverviewGoals: React.FC = () => {
  const navigate = useNavigate();
  const { data: myGoalsResponse, isLoading, isError, error } = useMyGoals();

  const goalsData = myGoalsResponse?.data;
  const allGoals: MyGoalsGoal[] = goalsData?.goals ?? [];
  const designation = goalsData?.designation_title ?? '';
  // Show top 5 goals
  const topGoals = allGoals.slice(0, 5);

  if (isLoading) {
    return <PerformanceSkeleton count={3} className="grid-cols-1" />;
  }

  if (isError) {
    return (
      <article aria-label="My Goals Container" className="min-w-0 space-y-6">
        <section className="min-w-0 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-6">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <Typography variant="bodySmall" className="text-red-600">
                {error?.message || 'Failed to load goals.'}
              </Typography>
            </div>
          </div>
        </section>
      </article>
    );
  }

  return (
    <article aria-label="My Goals Container" className="min-w-0 space-y-6">
      <section aria-label="Goals List Area" className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <header className="mb-4 flex min-w-0 flex-col items-start gap-3 sm:mb-6 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Typography variant="h4" className="font-bold">My Goals</Typography>
          </div>
          <div className="flex w-full min-w-0 items-center justify-between gap-3 text-sm md:w-auto md:justify-end">
            <button
              onClick={() => navigate('/webapp/performance-app/my-goals')}
              className="flex shrink-0 items-center gap-1 font-medium text-primary hover:underline"
              aria-label="Open all goals"
            >
              Open all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </header>

        <div aria-label="Goals Cards" className="space-y-3 max-w-3xl max-h-[300px] overflow-y-auto  sm:space-y-4">
          {topGoals.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-center rounded-lg border border-dashed border-border bg-card">
              <Typography variant="bodySmall" color="body2" className="font-medium">
                No goals found.
              </Typography>
            </div>
          ) : (
            topGoals.map((goal) => (
              <article
                key={goal.goal_key || goal.name}
                aria-label={`Goal: ${goal.title}`}
                className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-slate-500/10 sm:p-4 lg:flex-row lg:items-center lg:gap-4 cursor-pointer"
                onClick={() => navigate(`/webapp/performance-app/my-goals/${goal.goal_key || goal.name}`)}
              >
                <div className="flex w-full min-w-0 flex-1 items-start gap-3">
                  <div className="self-start mt-1">
                    <Badge label={goal.goal_type} variant="purple" size="sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Typography variant="bodySmall" className="mb-1 block break-words font-semibold">{goal.title}</Typography>
                    <Typography variant="caption" color="body2" className="block break-words leading-5">
                      Weightage <span className="font-semibold text-text-title">{goal.weightage}%</span>
                      {goal.department_title && (
                        <> &middot; {goal.department_title}</>
                      )}
                      {designation && (
                        <> &middot; {designation}</>
                      )}
                    </Typography>
                  </div>
                </div>
                <div className="mt-1 flex w-full min-w-0 flex-col gap-3 lg:mt-0 lg:w-auto lg:flex-row lg:items-center lg:gap-4">
                  <div className="flex w-full min-w-0 flex-col items-end gap-2 lg:w-32">
                    <div className="flex w-full min-w-0 items-center gap-3">
                      <Typography variant="caption" color="body2" className="w-8 shrink-0 font-medium">{goal.weightage}%</Typography>
                      <div className="h-1.5 w-full min-w-0 overflow-hidden rounded-md bg-slate-500/20">
                        <div className={`h-1.5 rounded-md ${getBarColor(goal.status)}`} style={{ width: `${goal.weightage}%` }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full justify-start lg:w-24 lg:justify-end">
                    <Badge
                      label={goal.status}
                      variant={getStatusVariant(goal.status)}
                      size="sm"
                      pulse={{ show: true }}
                      
                    />
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </article>
  );
};

export default React.memo(OverviewGoals);
