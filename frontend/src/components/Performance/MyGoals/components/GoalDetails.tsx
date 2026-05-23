import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Paperclip, Mic } from 'lucide-react';
import { Typography } from '../../../shared/atoms/Typography';
import Badge, { type BadgeVariant } from '../../../shared/Badge';
import Button from '../../../shared/atoms/Button';
import { goals, type Goal, type GoalKeyResult } from '../MyGoals';

const getStatusVariant = (status: Goal['status']): BadgeVariant => {
  if (status === 'On-track') return 'success';
  if (status === 'At-risk') return 'warning';
  if (status === 'Off-track') return 'danger';
  return 'default';
};

const CircularProgress = ({ percentage }: { percentage: number }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;


  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg className="transform -rotate-90 w-24 h-24">
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-gray-100"
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-blue-500"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-gray-900">{percentage}%</span>
        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">of 100%</span>
      </div>
    </div>
  );
};

const GoalDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goalIndex = id ? Number(id) : Number.NaN;
  const goal = Number.isInteger(goalIndex) ? goals[goalIndex] : undefined;
  const topRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    // scrollIntoView works regardless of which parent is the scroll container
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  if (!goal) {
    return (
      <div className="p-6">
        <Typography variant="bodyMedium">Goal not found.</Typography>
        <Button variant="outline" bgColor="text" onClick={() => navigate(-1)} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div ref={topRef} id="goal-details-container" className="min-h-full bg-[#f8fafc] overflow-y-auto p-3 font-sans sm:p-6">
      <div className="mx-auto max-w-screen space-y-4 sm:space-y-6">
        
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Goals
        </button>

        {/* Top Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row justify-between gap-6">
            <div className="min-w-0 space-y-4 lg:max-w-xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge label={goal.type} variant="purple" size="sm" />
                <Badge label={goal.label} variant="default" size="sm" />
                <Badge label={goal.state} variant="info" size="sm" />
                <Badge 
                  label={goal.status} 
                  variant={getStatusVariant(goal.status)}
                  size="sm" 
                  pulse={{ show: true }} 
                />
              </div>
              
              <div>
                <Typography variant="h3" className="mb-2 text-xl leading-tight sm:text-2xl">{goal.title}</Typography>
                <Typography variant="bodySmall" className="text-gray-500">{goal.subtitle}</Typography>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 sm:grid-cols-3 lg:grid-cols-5">
                <div className="rounded-lg bg-gray-50 p-3 lg:bg-transparent lg:p-0">
                  <Typography variant="caption" className="text-gray-500 uppercase tracking-wider block mb-1 font-semibold">Weightage</Typography>
                  <Typography variant="bodySmall" className="font-semibold text-gray-900">{goal.weight}%</Typography>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 lg:bg-transparent lg:p-0">
                  <Typography variant="caption" className="text-gray-500 uppercase tracking-wider block mb-1 font-semibold">Start</Typography>
                  <Typography variant="bodySmall" className="font-semibold text-gray-900">1 Apr 2026</Typography>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 lg:bg-transparent lg:p-0">
                  <Typography variant="caption" className="text-gray-500 uppercase tracking-wider block mb-1 font-semibold">End</Typography>
                  <Typography variant="bodySmall" className="font-semibold text-gray-900">31 Mar 2027</Typography>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 lg:bg-transparent lg:p-0">
                  <Typography variant="caption" className="text-gray-500 uppercase tracking-wider block mb-1 font-semibold">Owner</Typography>
                  <Typography variant="bodySmall" className="font-semibold text-gray-900">Pallavi Mahar</Typography>
                </div>
                <div className="col-span-2 rounded-lg bg-gray-50 p-3 sm:col-span-1 lg:bg-transparent lg:p-0">
                  <Typography variant="caption" className="text-gray-500 uppercase tracking-wider block mb-1 font-semibold">Aligned To</Typography>
                  <Typography variant="bodySmall" className="font-semibold text-gray-900">Alakh Pandey · Org OKR</Typography>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-center justify-center bg-gray-50 rounded-xl p-4 sm:p-6 lg:w-[200px]">
              <CircularProgress percentage={goal.percentage} />
              <Typography variant="caption" className="text-gray-500 mt-3 text-center">
                {goal.current} / {goal.target} {goal.unit}
              </Typography>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          
          {/* Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            
            {/* Key Results */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
                <div className="flex items-center gap-2">
                  <Typography variant="h4">Key Results</Typography>
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-semibold">{goal.krs?.length || 0}</span>
                </div>
                <Button variant="outline" bgColor="primary" size="sm" icon={<Plus className="w-4 h-4" />} className="shrink-0">
                  Add KR
                </Button>
              </div>

              <div className="space-y-4 sm:space-y-6">
                {goal.krs?.map((kr: GoalKeyResult, idx: number, krs: GoalKeyResult[]) => (
                  <div key={idx} className="relative">
                    <div className="flex flex-col gap-2 mb-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3 sm:items-center">
                        <Badge label={kr.id} variant="purple" size="sm" />
                        <Typography variant="bodyMedium" className="font-medium leading-snug text-gray-900">{kr.title}</Typography>
                      </div>
                      <Typography variant="bodyMedium" className="font-bold text-gray-900 sm:text-right">{kr.percentage}%</Typography>
                    </div>
                    <Typography variant="caption" className="text-gray-500 mb-2 block">
                      Current {Math.round((kr.percentage / 100) * 32)} / Target 32
                    </Typography>
                    <div className="w-full bg-gray-100 rounded-md h-2 overflow-hidden">
                      <div 
                        className={`h-2 rounded-md ${kr.percentage >= 75 ? 'bg-green-500' : kr.percentage >= 50 ? 'bg-yellow-500' : 'bg-blue-500'}`} 
                        style={{ width: `${kr.percentage}%` }}
                      />
                    </div>
                    {idx !== krs.length - 1 && <hr className="mt-6 border-gray-100" />}
                  </div>
                ))}
                {(!goal.krs || goal.krs.length === 0) && (
                  <Typography variant="bodyMedium" className="text-gray-500 text-center py-4">No Key Results found.</Typography>
                )}
              </div>
            </div>

            {/* Quick Check-in */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-200 overflow-hidden">
              <div className="p-4 sm:p-6">
                <Typography variant="h4" className="mb-1">Quick Check-in</Typography>
                <Typography variant="bodySmall" className="text-gray-500 mb-6">Update your progress · Last check-in 12 days ago</Typography>

                <div className="grid grid-cols-1 gap-4 mb-4 sm:mb-6 md:grid-cols-3 md:gap-6">
                  <div>
                    <Typography variant="caption" className="text-gray-700 font-medium block mb-2">New Value</Typography>
                    <div className="flex items-center">
                      <input 
                        type="text" 
                        defaultValue={goal.current}
                        className="w-full border border-gray-300 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="bg-gray-50 border border-l-0 border-gray-300 rounded-r-lg px-3 py-2 text-sm text-gray-500 whitespace-nowrap">
                        {goal.unit.split(' ')[0]}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <Typography variant="caption" className="text-gray-700 font-medium block mb-2">Auto Progress</Typography>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 flex min-h-[38px] items-center">
                      <span className="text-blue-600 font-bold text-sm mr-2">{goal.percentage}%</span>
                      <span className="text-gray-400 text-sm">+4 from 64%</span>
                    </div>
                  </div>

                  <div>
                    <Typography variant="caption" className="text-gray-700 font-medium block mb-2">Self-declared Health</Typography>
                    <div className="grid grid-cols-3 gap-2">
                      
                        <Badge label="On-track" backgroundColor="bg-green-50  w-full" textColor="text-green-700" size="sm"  />
                      
                      
                        <Badge label="At-risk" backgroundColor="bg-white border border-gray-200 hover:bg-gray-50 w-full" textColor="text-gray-600" size="sm" />
                      
                      
                        <Badge label="Off-track" backgroundColor="bg-white border border-gray-200 hover:bg-gray-50 w-full" textColor="text-gray-600" size="sm" />
                      
                    </div>
                  </div>
                </div>

                <textarea 
                  className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[100px] mb-4"
                  placeholder="Add details about your progress..."
                  defaultValue="Shipped Goals list + tree view. Calibration screen blocked on data model — coordinating with backend."
                ></textarea>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                    <Button variant="outline" bgColor="text" size="sm" icon={<Paperclip className="w-4 h-4" />}>
                      Attach
                    </Button>
                    <Button variant="outline" bgColor="text" size="sm" icon={<Mic className="w-4 h-4" />}>
                      Voice note
                    </Button>
                  </div>
                  <Button variant="contain" bgColor="primary" size="sm" className="justify-center">
                    Submit Check-in
                  </Button>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column (1/3) */}
          <div className="space-y-4 sm:space-y-6">
            
            {/* Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <Typography variant="h4" className="mb-1">Activity</Typography>
              <Typography variant="bodySmall" className="text-gray-500 mb-6">Last 30 days</Typography>

              <div className="relative border-l border-gray-200 ml-3 space-y-6">
                
                <div className="relative pl-6">
                  <div className="absolute w-2 h-2 bg-blue-500 rounded-full -left-[4.5px] top-1.5 border-2 border-white ring-2 ring-blue-100"></div>
                  <Typography variant="bodySmall" className="font-medium text-gray-900 block">Check-in submitted</Typography>
                  <Typography variant="caption" className="text-gray-500">Pallavi · 12 days ago · 60→64%</Typography>
                </div>

                <div className="relative pl-6">
                  <div className="absolute w-2 h-2 bg-purple-500 rounded-full -left-[4.5px] top-1.5 border-2 border-white ring-2 ring-purple-100"></div>
                  <Typography variant="bodySmall" className="font-medium text-gray-900 block">KR added by Manager</Typography>
                  <Typography variant="caption" className="text-gray-500">Rohit Khanna · 18 days ago · WAU adoption ≥ 80%</Typography>
                </div>

                <div className="relative pl-6">
                  <div className="absolute w-2 h-2 bg-green-500 rounded-full -left-[4.5px] top-1.5 border-2 border-white ring-2 ring-green-100"></div>
                  <Typography variant="bodySmall" className="font-medium text-gray-900 block">Goal approved</Typography>
                  <Typography variant="caption" className="text-gray-500">Rohit Khanna · 24 days ago</Typography>
                </div>

                <div className="relative pl-6">
                  <div className="absolute w-2 h-2 bg-yellow-500 rounded-full -left-[4.5px] top-1.5 border-2 border-white ring-2 ring-yellow-100"></div>
                  <Typography variant="bodySmall" className="font-medium text-gray-900 block">Goal submitted</Typography>
                  <Typography variant="caption" className="text-gray-500">Pallavi · 25 days ago</Typography>
                </div>

              </div>
            </div>

            {/* Auto-pull source */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <Typography variant="caption" className="text-gray-500 uppercase tracking-wider block mb-4 font-semibold">Auto-pull source</Typography>
              
              <div className="border border-gray-100 rounded-lg p-3 flex flex-col gap-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded flex items-center justify-center font-bold text-xs">JR</div>
                  <div className="min-w-0">
                    <Typography variant="bodySmall" className="font-medium text-gray-900 block">Jira · OXY-2.0</Typography>
                    <Typography variant="caption" className="text-gray-500 block">Synced 4h ago · 48/76 issues done</Typography>
                  </div>
                </div>
                <div className="w-fit px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded">Connected</div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default GoalDetails;
