import React from 'react';
import { Calendar, Check, Sparkles } from 'lucide-react';
import { Typography } from '../../../shared/atoms/Typography';
import Badge from '../../../shared/Badge';

interface TaskItem {
  id: string;
  title: string;
  dueDate: string;
  icon: React.ElementType;
  iconBgColor: string;
  iconTextColor: string;
  buttonText: string;
}

interface FeedbackItem {
  id: string;
  authorInitials: string;
  authorName: string;
  authorRole: string;
  type: string;
  typeBgColor: string;
  typeTextColor: string;
  quote?: string;
}

const tasksData: TaskItem[] = [
  {
    id: 't1',
    title: 'Complete Q1 Self-Review',
    dueDate: 'Due in 9 days',
    icon: Sparkles,
    iconBgColor: 'bg-blue-50',
    iconTextColor: 'text-blue-500',
    buttonText: 'Continue'
  },
  {
    id: 't2',
    title: 'Nominate 4 peer reviewers',
    dueDate: 'Due in 4 days',
    icon: Check,
    iconBgColor: 'bg-purple-50',
    iconTextColor: 'text-purple-500',
    buttonText: 'Nominate'
  },
  {
    id: 't3',
    title: 'Update progress on Goal: Oxygen 2.0',
    dueDate: 'Not updated in 12 days',
    icon: Calendar,
    iconBgColor: 'bg-orange-50',
    iconTextColor: 'text-orange-500',
    buttonText: 'Check in'
  }
];

const feedbackData: FeedbackItem[] = [
  {
    id: 'f1',
    authorInitials: 'KI',
    authorName: 'Karthik Iyer',
    authorRole: 'Eng Lead',
    type: 'Praise',
    typeBgColor: 'bg-green-100 ',
    typeTextColor: 'text-green-700',
    quote: '"Pallavi\'s design system v2 audit unblocked a major release."'
  },
  {
    id: 'f2',
    authorInitials: 'NP',
    authorName: 'Neha Patel',
    authorRole: 'Product Manager',
    type: 'Praise',
    typeBgColor: 'bg-green-100 ',
    typeTextColor: 'text-green-700',
    quote: '"Excellent stakeholder management during the dashboard rebuild."'
  },
  {
    id: 'f3',
    authorInitials: 'RK',
    authorName: 'Rohit Khanna',
    authorRole: 'Manager \u00b7 1:1',
    type: 'Coaching',
    typeBgColor: 'bg-purple-100 ring-1 ring-inset ring-purple-300',
    typeTextColor: 'text-purple-700',
  }
];

const OverviewSidebar: React.FC = () => {
  return (
    <div aria-label="Sidebar Content" className="min-w-0 space-y-4 sm:space-y-6">
      <section aria-label="Tasks Section" className="min-w-0 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
        <header className="mb-4 flex min-w-0 items-center gap-3 sm:mb-6">
          <Typography variant="h4" className="font-bold text-gray-900">Tasks Awaiting You</Typography>
          <div className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">{tasksData.length}</div>
        </header>

        <div aria-label="Task List" className="space-y-3 sm:space-y-4">
          {tasksData.map((task) => {
            const Icon = task.icon;
            return (
              <article key={task.id} aria-label={`Task: ${task.title}`} className="flex min-w-0 flex-col gap-3 rounded-xl border border-gray-100 p-3 text-left min-[420px]:flex-row min-[420px]:items-center lg:border-0 lg:p-0">
                <div className={`w-10 h-10 rounded-lg ${task.iconBgColor} ${task.iconTextColor} flex items-center justify-center shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <Typography variant="bodySmall" className="mb-1 block break-words font-medium text-gray-900">{task.title}</Typography>
                  <Typography variant="caption" className="block break-words text-gray-500">{task.dueDate}</Typography>
                </div>
                <button className="min-h-9 w-full shrink-0 rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 min-[420px]:w-auto sm:px-4" aria-label={task.buttonText}>
                  {task.buttonText}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-label="Feedback Section" className="min-w-0 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
        <header className="mb-2 flex min-w-0 items-center gap-3">
          <Typography variant="h4" className="font-bold text-gray-900">Recent Feedback</Typography>
          <div className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">{feedbackData.length + 2 /* keeping original count */}</div>
        </header>
        <Typography variant="bodySmall" className="text-gray-500 mb-6">Last 30 days</Typography>

        <div aria-label="Feedback List" className="space-y-5 sm:space-y-6">
          {feedbackData.map((feedback, index) => (
            <React.Fragment key={feedback.id}>
              <article aria-label={`Feedback from ${feedback.authorName}`} className="min-w-0">
                <div className="mb-2 flex min-w-0 flex-col gap-2 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between min-[420px]:gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-medium text-sm">{feedback.authorInitials}</div>
                    <div className="min-w-0">
                      <Typography variant="bodyMedium" className="block break-words font-medium leading-snug text-gray-900">{feedback.authorName} <Typography component="span" variant="caption" className="font-normal sm:ml-1">&middot; {feedback.authorRole}</Typography></Typography>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Badge label={feedback.type} backgroundColor={feedback.typeBgColor} textColor={feedback.typeTextColor} size="sm" />
                  </div>
                </div>
                {feedback.quote && (
                  <Typography variant="bodySmall" className="block break-words text-gray-600 min-[420px]:pl-11">
                    {feedback.quote}
                  </Typography>
                )}
              </article>
              {index < feedbackData.length - 1 && <div className="h-px bg-gray-100 min-[420px]:ml-11"></div>}
            </React.Fragment>
          ))}
        </div>
      </section>
    </div>
  );
};

export default React.memo(OverviewSidebar);
