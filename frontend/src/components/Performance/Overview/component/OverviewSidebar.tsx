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
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Typography variant="h4" className="font-bold text-gray-900">Tasks Awaiting You</Typography>
          <div className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">{tasksData.length}</div>
        </div>

        <div className="space-y-4">
          {tasksData.map((task) => {
            const Icon = task.icon;
            return (
              <div key={task.id} className="flex items-center lg:flex-row flex-col text-center lg:text-left flex-wrap gap-4">
                <div className={`w-10 h-10 rounded-lg ${task.iconBgColor} ${task.iconTextColor} flex items-center justify-center shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <Typography variant="bodySmall" className="font-medium text-gray-900 mb-1">{task.title}</Typography>
                  <Typography variant="caption" className="text-gray-500">{task.dueDate}</Typography>
                </div>
                <button className="px-4 py-1.5 border border-blue-200 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">
                  {task.buttonText}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <Typography variant="h4" className="font-bold text-gray-900">Recent Feedback</Typography>
          <div className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">{feedbackData.length + 2 /* keeping original count */}</div>
        </div>
        <Typography variant="bodySmall" className="text-gray-500 mb-6">Last 30 days</Typography>

        <div className="space-y-6">
          {feedbackData.map((feedback, index) => (
            <React.Fragment key={feedback.id}>
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-medium text-sm">{feedback.authorInitials}</div>
                    <div>
                      <Typography variant="bodyMedium" className="font-medium text-gray-900">{feedback.authorName} <Typography component="span" variant="caption" className="font-normal ml-1">&middot; {feedback.authorRole}</Typography></Typography>
                    </div>
                  </div>
                  <Badge label={feedback.type} backgroundColor={feedback.typeBgColor} textColor={feedback.typeTextColor} size="sm" />
                </div>
                {feedback.quote && (
                  <Typography variant="bodySmall" className="text-gray-600 pl-11">
                    {feedback.quote}
                  </Typography>
                )}
              </div>
              {index < feedbackData.length - 1 && <div className="h-px bg-gray-100 ml-11"></div>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(OverviewSidebar);
