import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Typography } from '../../../shared/atoms/Typography';
import Badge from '../../../shared/Badge';

interface GoalItem {
  id: string;
  type: string;
  typeBgColor: string;
  typeTextColor: string;
  title: string;
  weightage: string;
  category: string;
  progressText: string;
  progressPercentage: number;
  progressColor: string;
  status: string;
  statusBgColor: string;
  statusTextColor: string;
  statusPulse: string;
}

const goalsData: GoalItem[] = [
  {
    id: 'g1',
    type: 'OKR',
    typeBgColor: 'bg-blue-100 ring-1 ring-inset ring-blue-300',
    typeTextColor: 'text-blue-700',
    title: 'Ship Oxygen 2.0 dashboard to 100% of PW employees',
    weightage: '30%',
    category: 'Individual',
    progressText: '64 / 100 % rollout',
    progressPercentage: 64,
    progressColor: 'bg-green-500',
    status: 'On-track',
    statusBgColor: 'bg-green-100 ',
    statusTextColor: 'text-green-700',
    statusPulse: 'bg-green-700'
  },
  {
    id: 'g2',
    type: 'OKR',
    typeBgColor: 'bg-blue-100 ring-1 ring-inset ring-blue-300',
    typeTextColor: 'text-blue-700',
    title: 'Reduce design \u2192 engineering handoff time by 40%',
    weightage: '20%',
    category: 'Functional',
    progressText: '3.4 / 2.5 Days median',
    progressPercentage: 42,
    progressColor: 'bg-yellow-500',
    status: 'At-risk',
    statusBgColor: 'bg-yellow-100 ',
    statusTextColor: 'text-yellow-700',
    statusPulse: 'bg-yellow-700'
  },
  {
    id: 'g3',
    type: 'OKR',
    typeBgColor: 'bg-blue-100 ring-1 ring-inset ring-blue-300',
    typeTextColor: 'text-blue-700',
    title: 'Mentor 2 junior designers to mid-level promotion',
    weightage: '15%',
    category: 'Development',
    progressText: '1.6 / 2 Promotion eligible',
    progressPercentage: 80,
    progressColor: 'bg-green-500',
    status: 'On-track',
    statusBgColor: 'bg-green-100 ',
    statusTextColor: 'text-green-700',
    statusPulse: 'bg-green-700'
  },
  {
    id: 'g4',
    type: 'OKR',
    typeBgColor: 'bg-blue-100 ring-1 ring-inset ring-blue-300',
    typeTextColor: 'text-blue-700',
    title: 'Maintain CSAT for design partnership \u2265 4.5 / 5',
    weightage: '20%',
    category: 'Functional',
    progressText: '4.6 / 4.5 CSAT',
    progressPercentage: 91,
    progressColor: 'bg-green-500',
    status: 'On-track',
    statusBgColor: 'bg-green-100 ',
    statusTextColor: 'text-green-700',
    statusPulse: 'bg-green-700'
  },
  {
    id: 'g5',
    type: 'OKR',
    typeBgColor: 'bg-blue-100 ring-1 ring-inset ring-blue-300',
    typeTextColor: 'text-blue-700',
    title: 'Launch design-thinking workshop series across 5 BUs',
    weightage: '15%',
    category: 'Org',
    progressText: '1 / 5 BUs covered',
    progressPercentage: 18,
    progressColor: 'bg-red-500',
    status: 'Off-track',
    statusBgColor: 'bg-red-100 ',
    statusTextColor: 'text-red-700',
    statusPulse: 'bg-red-700'
  }
];

import { useScreenSize } from '../../../../hooks/useScreenSize';

const OverviewGoals: React.FC = () => {
  const { isMobile } = useScreenSize();

  return (
    <article aria-label="My Goals Container" className=" space-y-6">
      <section aria-label="Goals List Area" className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm sm:p-6">
        <header className={`flex ${isMobile ? 'flex-col items-start gap-3' : 'justify-between items-center'} mb-4 sm:mb-6`}>
          <div className="flex items-center gap-3">
            <Typography variant="h4" className="font-bold text-gray-900">My Goals</Typography>
            <div className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">{goalsData.length}</div>
          </div>
          <div className={`flex ${isMobile ? 'justify-between w-full' : 'items-center'} gap-3 text-sm`}>
            <Typography variant="bodySmall" className="text-gray-500">Sum of weightage: <span className="font-semibold text-gray-900">100%</span></Typography>
            <button className="flex shrink-0 items-center gap-1 font-medium text-blue-600 hover:text-blue-700">
              Open all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </header>

        <div aria-label="Goals Cards" className="space-y-3 sm:space-y-4">
          {goalsData.map((goal) => (
            <article key={goal.id} aria-label={`Goal: ${goal.title}`} className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center gap-4'} p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors sm:p-4`}>
              <div className="flex w-full flex-1 items-start gap-3">
                <div className="self-start mt-1">
                  <Badge label={goal.type} backgroundColor={goal.typeBgColor} textColor={goal.typeTextColor} size="sm" />
                </div>
                <div className="min-w-0 flex-1">
                  <Typography variant="bodySmall" className="font-semibold text-gray-900 mb-1">{goal.title}</Typography>
                  <Typography variant="caption" className="block leading-5 text-gray-500">Weightage <span className="font-semibold text-gray-700">{goal.weightage}</span> &middot; {goal.category} &middot; {goal.progressText}</Typography>
                </div>
              </div>
              <div className={`flex ${isMobile ? 'w-full flex-col gap-3 mt-1' : 'items-center gap-4'}`}>
                <div className={`${isMobile ? 'w-full' : 'w-32'} flex flex-col items-end gap-2`}>
                  <div className="w-full flex items-center gap-3">
                    <Typography variant="caption" className="w-8 shrink-0 font-medium text-gray-500">{goal.progressPercentage}%</Typography>
                    <div className="w-full bg-gray-100 rounded-md h-1.5 overflow-hidden">
                      <div className={`h-1.5 rounded-md ${goal.progressColor}`} style={{ width: `${goal.progressPercentage}%` }}></div>
                    </div>
                  </div>
                </div>
                <div className={`${isMobile ? 'w-full' : 'w-24 flex justify-end'}`}>
                  <Badge label={goal.status} backgroundColor={goal.statusBgColor} textColor={goal.statusTextColor} size="sm" pulse={{ show: true, color: goal.statusPulse }} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </article>
  );
};

export default React.memo(OverviewGoals);
