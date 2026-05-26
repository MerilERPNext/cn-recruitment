import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Filter } from 'lucide-react';
import { Typography } from '../../shared/atoms/Typography';
import Badge, { type BadgeVariant } from '../../shared/Badge';
import Button from '../../shared/atoms/Button';
import { useScreenSize } from '../../../hooks/useScreenSize';

export type GoalStatus = 'On-track' | 'At-risk' | 'Off-track';

export interface GoalKeyResult {
  id: string;
  title: string;
  percentage: number;
}

export interface Goal {
  type: string;
  label: string;
  title: string;
  subtitle: string;
  current: number;
  target: number;
  unit: string;
  percentage: number;
  weight: number;
  status: GoalStatus;
  state: string;
  barColor: string;
  krs?: GoalKeyResult[];
}

// eslint-disable-next-line react-refresh/only-export-components
export const goals: Goal[] = [
  {
    type: "OKR",
    label: "Individual",
    title: "Ship Oxygen 2.0 dashboard to 100% of PW employees",
    subtitle: "Lead the design + research for the redesigned dashboard. Drive adoption past 80% WAU.",
    current: 64,
    target: 100,
    unit: "% rollout",
    percentage: 64,
    weight: 30,
    status: "On-track",
    state: "In Progress",
    barColor: "bg-green-500",
    krs: [
      { id: "KR 1", title: "Design system v2 components shipped (24 of 32)", percentage: 75 },
      { id: "KR 2", title: "Dashboard usability score ≥ 4.4 / 5", percentage: 88 },
      { id: "KR 3", title: "WAU adoption ≥ 80% by Q3", percentage: 90 },
    ]
  },
  {
    type: "OKR",
    label: "Functional",
    title: "Reduce design → engineering handoff time by 40%",
    subtitle: "From 4.2 days median to <2.5 days. Drive Figma → Storybook automation.",
    current: 3.4,
    target: 2.5,
    unit: "Days median",
    percentage: 42,
    weight: 20,
    status: "At-risk",
    state: "In Progress",
    barColor: "bg-yellow-500",
  },
  {
    type: "OKR",
    label: "Development",
    title: "Mentor 2 junior designers to mid-level promotion",
    subtitle: "Bi-weekly 1:1s; portfolio review; pair on 4+ shipped features each.",
    current: 1.6,
    target: 2,
    unit: "Promotion eligible",
    percentage: 80,
    weight: 15,
    status: "On-track",
    state: "In Progress",
    barColor: "bg-green-500",
  },
  {
    type: "OKR",
    label: "Functional",
    title: "Maintain CSAT for design partnership ≥ 4.5 / 5",
    subtitle: "Quarterly cross-functional partner survey of PMs and Eng Leads.",
    current: 4.6,
    target: 4.5,
    unit: "CSAT",
    percentage: 91,
    weight: 20,
    status: "On-track",
    state: "In Progress",
    barColor: "bg-green-500",
  },
  {
    type: "OKR",
    label: "Org",
    title: "Launch design-thinking workshop series across 5 BUs",
    subtitle: "Internal capability building. Quarterly cohort of 25 employees per BU.",
    current: 1,
    target: 5,
    unit: "BUs covered",
    percentage: 18,
    weight: 15,
    status: "Off-track",
    state: "In Progress",
    barColor: "bg-red-500",
  }
];

const getStatusVariant = (status: GoalStatus): BadgeVariant => {
  if (status === 'On-track') return 'success';
  if (status === 'At-risk') return 'warning';
  if (status === 'Off-track') return 'danger';
  return 'default';
};

const MyGoals: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile, isDesktop } = useScreenSize();

  return (
    <div className="min-h-full overflow-y-auto overflow-x-hidden bg-[#f8fafc] px-3 py-4 font-sans sm:px-4 sm:py-5 lg:px-6 lg:py-6">
      <div className="mx-auto w-full max-w-[1440px] min-w-0 space-y-4 sm:space-y-6">
        
        {/* Header Section */}
        <div className="mb-4 flex min-w-0 flex-col gap-4 sm:mb-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <Typography variant="h3" className="text-xl leading-tight text-gray-900 sm:text-2xl">My Goals &middot; FY26</Typography>
            <Typography variant="bodySmall" className="mt-1 block break-words text-gray-500">
              5 goals &middot; 100% weightage &middot; Goal lock 21 May 2026
            </Typography>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-3 lg:w-auto lg:flex-row lg:flex-wrap lg:items-center">
            {!isMobile && (
              <div className="flex h-9 items-center overflow-hidden rounded-lg border border-gray-200 bg-white text-sm">
                <button className="px-4 h-full text-gray-600 hover:bg-gray-50 font-medium transition-colors" aria-label="Show goals as list">List</button>
                <button className="px-4 h-full bg-blue-500 text-white font-medium transition-colors" aria-label="Show goals as tree">Tree</button>
                <button className="px-4 h-full text-gray-600 hover:bg-gray-50 font-medium transition-colors" aria-label="Show goal alignment">Alignment</button>
              </div>
            )}
            <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:items-center lg:w-auto">
              <Button variant="outline" bgColor="text" size="sm" icon={<Filter className="h-4 w-4" />} className="h-10 w-full justify-center bg-white sm:h-9 sm:w-auto">
                Filter
              </Button>
              <Button onClick={() => navigate("/webapp/performance-app/my-goals/new-goal")} variant="contain" bgColor="primary" size="sm" icon={<Plus className="h-4 w-4" />} className="h-10 w-full justify-center sm:h-9 sm:w-auto">
                New Goal
              </Button>
            </div>
            {isMobile && (
              <div className="mt-1 flex h-10 w-full items-center overflow-hidden rounded-lg border border-gray-200 bg-white text-sm">
                <button className="min-w-0 flex-1 h-full text-gray-600 hover:bg-gray-50 font-medium transition-colors" aria-label="Show goals as list">List</button>
                <button className="min-w-0 flex-1 h-full bg-blue-500 text-white font-medium transition-colors" aria-label="Show goals as tree">Tree</button>
                <button className="min-w-0 flex-1 h-full text-gray-600 hover:bg-gray-50 font-medium transition-colors" aria-label="Show goal alignment">Align</button>
              </div>
            )}
          </div>
        </div>

        {/* Main Card */}
        <div className="min-h-[70vh] min-w-0 rounded-xl border border-gray-100 bg-white p-3 shadow-sm sm:p-4 lg:p-6">
          
          {/* Parent Goal Box */}
          <div className="relative z-10 mb-4 flex min-w-0 flex-col gap-3 rounded-xl border border-blue-100 bg-[#f0f7ff] p-3 sm:mb-6 sm:p-4 md:flex-row md:items-center md:justify-between">
             <div className="flex min-w-0 items-start gap-3">
               <div className="shrink-0 mt-1">
                 <Badge label="ORG" variant="blue" size="md" />
               </div>
               <div className="min-w-0">
                 <Typography variant="bodyMedium" className="mb-0.5 block break-words font-semibold leading-snug text-gray-900">
                  PW FY26 &middot; Become the #1 EdTech platform in India by Q4
                 </Typography>
                 <Typography variant="caption" className="block break-words leading-relaxed text-gray-500">
                  Cascaded from Alakh Pandey &middot; OKR &middot; 8 org-level KRs
                 </Typography>
               </div>
             </div>
             <div className="self-start md:self-center">
               <Badge label="Aligned" variant="white" size="sm" />
             </div>
          </div>

          {/* Tree Section */}
          <div className="relative min-w-0 space-y-4 sm:space-y-6 md:pl-10">
             {/* Main Vertical Tree Line */}
             {!isMobile && <div className="absolute left-[20px] top-[0px] bottom-[40px] w-px bg-gray-200 z-0"></div>}

             {goals.map((goal, index) => (
                <div 
                  key={index} 
                  onClick={() => navigate(`/webapp/performance-app/my-goals/${index}`)}
                  className="relative z-10 min-w-0 cursor-pointer overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                >
                   {/* Horizontal Tree Line to OKR */}
                   {!isMobile && <div className="absolute left-[-20px] top-[40px] w-[20px] h-px bg-gray-200 z-0"></div>}
                   
                   {/* OKR Row */}
                   <div className="relative z-10 flex min-w-0 flex-col gap-4 bg-white p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
                      {/* Left Side: Info */}
                      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                         <div className="mt-0.5 flex shrink-0 flex-wrap items-center gap-2 sm:w-[100px] sm:flex-col sm:items-start sm:gap-1">
                            <div className="self-start">
                               <Badge label={goal.type} variant="purple" size="sm" />
                            </div>
                            <Typography variant="caption" className="text-gray-500 sm:ml-1">{goal.label}</Typography>
                         </div>
                         <div className="min-w-0 flex-1">
                            <Typography variant="bodyMedium" className="mb-1 block break-words font-semibold leading-snug text-gray-900">
                              {goal.title}
                            </Typography>
                            <Typography variant="caption" className="block break-words leading-relaxed text-gray-500">
                              {goal.subtitle}
                            </Typography>
                         </div>
                      </div>

                      {/* Right Side: Progress & Badges */}
                      <div className="mt-1 flex w-full min-w-0 shrink-0 flex-col gap-3 sm:mt-2 md:flex-row md:items-center md:justify-end lg:w-[400px]">
                         <div className="grid w-full min-w-0 grid-cols-[minmax(76px,96px)_minmax(0,1fr)] items-center gap-3 md:mr-4 lg:mr-6 lg:border-r lg:border-gray-100 lg:pr-6">
                            <div className="min-w-0 md:text-right">
                               <Typography variant="bodyMedium" className="block whitespace-nowrap font-bold text-gray-900">
                                {goal.current} <span className="font-normal text-gray-500">/ {goal.target}</span>
                               </Typography>
                               <Typography variant="caption" className="mt-0.5 block break-words text-gray-500">{goal.unit}</Typography>
                            </div>
                            <div className="flex min-w-0 flex-col gap-1.5 md:w-[128px] md:shrink-0">
                               <Typography variant="caption" className="text-gray-500 text-right">{goal.percentage}% - {goal.weight}w</Typography>
                               <div className="w-full bg-gray-100 rounded-md h-1.5 overflow-hidden">
                                  <div className={`h-1.5 rounded-md ${goal.barColor}`} style={{ width: `${goal.percentage}%` }} />
                               </div>
                            </div>
                         </div>
                         <div className="flex w-full min-w-0 shrink-0 flex-wrap gap-2 md:w-auto md:min-w-fit md:flex-col md:items-end md:justify-center">
                            <Badge label={goal.status} variant={getStatusVariant(goal.status)} size="sm" pulse={{ show: true }} />
                            <Badge label={goal.state} variant="info" size="sm" />
                         </div>
                      </div>
                   </div>

                   {/* KRs Row (if any) */}
                   {goal.krs && (
                      <div className="relative z-10 border-t border-gray-100 bg-gray-50/50 p-3 sm:p-4">
                         <div className="relative min-w-0 space-y-3 sm:space-y-4 md:pl-12">
                            {/* Vertical line for KRs */}
                            {!isMobile && <div className="absolute left-[24px] top-[-16px] bottom-4 w-px bg-gray-200 z-0" />}
                            {goal.krs.map((kr: GoalKeyResult, kIdx: number) => (
                               <div key={kIdx} className="relative flex min-w-0 flex-col gap-2 rounded-lg bg-white p-3 lg:flex-row lg:items-center lg:bg-transparent lg:p-0">
                                  {/* Horizontal line to KR */}
                                  {!isMobile && <div className="absolute left-[-24px] top-[14px] w-[24px] h-px bg-gray-200 z-0" />}
                                  
                                  <div className="flex min-w-0 flex-1 items-start gap-3 md:pl-4 lg:items-center">
                                     <div className="mt-0.5 flex-shrink-0">
                                        <Badge label={kr.id} variant="purple-outline" size="sm" />
                                     </div>
                                     <Typography variant="caption" className="min-w-0 break-words leading-relaxed text-gray-600">{kr.title}</Typography>
                                  </div>
                                  
                                  <div className="flex w-full min-w-0 shrink-0 items-center justify-start lg:w-[400px] xl:justify-end">
                                     <div className="flex w-full min-w-0 items-center gap-4 lg:mr-6 lg:pr-6">
                                        <div className="w-[90px] hidden xl:block"></div>
                                        <div className="mt-1 flex min-w-0 flex-1 flex-col gap-1 lg:w-[128px] lg:flex-none">
                                           {!isDesktop && <Typography variant="caption" className="text-gray-500 text-right">{kr.percentage}%</Typography>}
                                           <div className="w-full bg-gray-200 rounded-md h-1.5 overflow-hidden">
                                              <div className="h-1.5 rounded-md bg-blue-500" style={{ width: `${kr.percentage}%` }} />
                                           </div>
                                        </div>
                                     </div>
                                     <div className="w-[90px] shrink-0 hidden xl:block" />
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
