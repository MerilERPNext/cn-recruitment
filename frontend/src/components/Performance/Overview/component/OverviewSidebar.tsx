import React, { useState } from 'react';
import { Calendar, Check, Sparkles, ChevronRight, X, Loader2, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Typography } from '../../../shared/atoms/Typography';
import Badge, { type BadgeVariant } from '../../../shared/Badge';
import Modal from '../../../shared/Modal';
import { useMyGoals } from '../../../../hooks/usePerformance';
import type { MyGoalsGoal } from '../../../../types/goal';

const getStatusVariant = (status?: string): BadgeVariant => {
  const s = (status ?? '').toLowerCase();
  if (s === 'on-track' || s === 'completed') return 'success';
  if (s === 'at-risk' || s === 'in progress') return 'warning';
  if (s === 'off-track' || s === 'cancelled') return 'danger';
  if (s === 'not started') return 'default';
  return 'default';
};

const OverviewSidebar: React.FC = () => {
  const navigate = useNavigate();
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const { data: myGoalsResponse, isLoading } = useMyGoals();

  const goalsData = myGoalsResponse?.data;
  const allGoals: MyGoalsGoal[] = goalsData?.goals ?? [];

  return (
    <div aria-label="Sidebar Content" className="min-w-0 space-y-4 sm:space-y-6">
      {/* Tasks Awaiting Section */}
      <section aria-label="Tasks Section" className="min-w-0 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
        <header className="mb-4 flex min-w-0 items-center gap-3 sm:mb-6">
          <Typography variant="h4" className="font-bold text-gray-900">Tasks Awaiting You</Typography>
        </header>

        <div aria-label="Task List" className="space-y-3 sm:space-y-4">
          {/* Task 1: Complete Self-Review → navigates to Review tab */}
          <article aria-label="Task: Complete Q1 Self-Review" className="flex min-w-0 flex-col gap-3 rounded-xl border border-gray-100 p-3.5 text-left min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between lg:border-0 lg:p-0">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <Typography variant="bodySmall" className="block break-words font-semibold text-gray-900 leading-snug">Complete Q1 Self-Review</Typography>
                <Typography variant="caption" className="mt-0.5 block break-words text-gray-500 text-xs">Due in 9 days</Typography>
              </div>
            </div>
            <button
              onClick={() => navigate('/webapp/performance-app/review')}
              className="min-h-9 w-full shrink-0 rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 min-[420px]:w-auto sm:px-4"
              aria-label="Continue to review"
            >
              Continue
            </button>
          </article>

          {/* Task 2: Nominate peer reviewers */}
          <article aria-label="Task: Nominate 4 peer reviewers" className="flex min-w-0 flex-col gap-3 rounded-xl border border-gray-100 p-3.5 text-left min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between lg:border-0 lg:p-0">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <Typography variant="bodySmall" className="block break-words font-semibold text-gray-900 leading-snug">Nominate 4 peer reviewers</Typography>
                <Typography variant="caption" className="mt-0.5 block break-words text-gray-500 text-xs">Due in 4 days</Typography>
              </div>
            </div>
            <button
              className="min-h-9 w-full shrink-0 rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 min-[420px]:w-auto sm:px-4"
              aria-label="Nominate"
            >
              Nominate
            </button>
          </article>

          {/* Task 3: Update progress → opens Check-in modal */}
          <article aria-label="Task: Update progress on goals" className="flex min-w-0 flex-col gap-3 rounded-xl border border-gray-100 p-3.5 text-left min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between lg:border-0 lg:p-0">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <Typography variant="bodySmall" className="block break-words font-semibold text-gray-900 leading-snug">Update progress on your goals</Typography>
                <Typography variant="caption" className="mt-0.5 block break-words text-gray-500 text-xs">Track and update your goal progress regularly</Typography>
              </div>
            </div>
            <button
              onClick={() => setIsCheckInModalOpen(true)}
              className="min-h-9 w-full shrink-0 rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 min-[420px]:w-auto sm:px-4"
              aria-label="Check in"
            >
              Check in
            </button>
          </article>
        </div>
      </section>

      {/* Recent Feedback Section */}
      <section aria-label="Feedback Section" className="min-w-0 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
        <header className="mb-2 flex min-w-0 items-center gap-3">
          <Typography variant="h4" className="font-bold text-gray-900">Recent Feedback</Typography>
        </header>
        <Typography variant="bodySmall" className="text-gray-500 mb-6">Last 30 days</Typography>

        <div aria-label="Feedback List" className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
            <svg className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
            </svg>
          </div>
          <Typography variant="bodySmall" className="font-medium text-gray-500">No feedback received yet</Typography>
          <Typography variant="caption" className="mt-1 text-gray-400">Feedback from your peers and managers will appear here</Typography>
        </div>
      </section>

      {/* Check-in Modal: Goals List */}
      <Modal isOpen={isCheckInModalOpen} onClose={() => setIsCheckInModalOpen(false)} size="md" className="sm:rounded-2xl">
        <div className="flex flex-col">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5 sm:px-5 sm:py-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Target className="h-4 w-4" />
              </div>
              <Typography variant="h4" className="font-bold text-gray-900 text-sm sm:text-base leading-tight">Select a Goal to Check In</Typography>
            </div>
            <button
              onClick={() => setIsCheckInModalOpen(false)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="max-h-[70vh] sm:max-h-[60vh] overflow-y-auto p-3 sm:p-5">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  <Typography variant="bodySmall" className="text-slate-500">Loading goals…</Typography>
                </div>
              </div>
            ) : allGoals.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Target className="h-8 w-8 text-gray-300" />
                  <Typography variant="bodySmall" className="font-medium text-gray-500">No goals found</Typography>
                  <Typography variant="caption" className="text-gray-400">Create goals first to check in on them</Typography>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 sm:space-y-3">
                {allGoals.map((goal) => (
                  <button
                    key={goal.goal_key || goal.name}
                    onClick={() => {
                      setIsCheckInModalOpen(false);
                      navigate(`/webapp/performance-app/my-goals/${goal.goal_key || goal.name}`);
                    }}
                    className="group flex w-full flex-col gap-2.5 rounded-xl border border-gray-100 bg-white p-3.5 text-left transition-all hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:gap-3">
                      <div className="mt-0.5 shrink-0">
                        <Badge label={goal.goal_type} variant="purple" size="sm" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Typography variant="bodySmall" className="font-semibold text-gray-900 leading-snug break-words">
                          {goal.title}
                        </Typography>
                        <Typography variant="caption" className="mt-0.5 block text-xs text-gray-500 break-words">
                          Weightage <span className="font-semibold text-gray-700">{goal.weightage}%</span>
                          {goal.department_title && <> &middot; {goal.department_title}</>}
                        </Typography>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-3 pt-2 border-t border-gray-100/60 sm:border-t-0 sm:pt-0 sm:justify-end">
                      <Badge
                        label={goal.status}
                        variant={getStatusVariant(goal.status)}
                        size="sm"
                        pulse={{ show: true }}
                      />
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 transition-colors group-hover:text-blue-500" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default React.memo(OverviewSidebar);
