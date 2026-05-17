import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Filter } from 'lucide-react';
import { Typography } from '../../shared/atoms/Typography';
import Badge from '../../shared/Badge';
import Button from '../../shared/atoms/Button';
import { useScreenSize } from '../../../hooks/useScreenSize';

export const goals = [
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

const getStatusVariant = (status: string) => {
  if (status === 'On-track') return 'success';
  if (status === 'At-risk') return 'warning';
  if (status === 'Off-track') return 'danger';
  return 'default';
};

const MyGoals: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile, isDesktop } = useScreenSize();

  return (
    <div className={`min-h-full bg-[#f8fafc] overflow-y-scroll ${isMobile ? 'p-4' : 'p-6'} font-sans`}>
      <div className="max-w-[1200px] mx-auto space-y-6">
        
        {/* Header Section */}
        <div className={`flex ${isMobile ? 'flex-col gap-4' : 'flex-row justify-between items-center'} mb-6`}>
          <div>
            <Typography variant="h3">My Goals &middot; FY26</Typography>
            <Typography variant="bodySmall" className="text-gray-500">5 goals &middot; 100% weightage &middot; Goal lock 21 May 2026</Typography>
          </div>
          <div className={`flex ${isMobile ? 'flex-col w-full gap-3' : 'flex-wrap items-center gap-3'}`}>
            {!isMobile && (
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white text-sm h-9">
                <button className="px-4 h-full text-gray-600 hover:bg-gray-50 font-medium transition-colors">List</button>
                <button className="px-4 h-full bg-blue-500 text-white font-medium transition-colors">Tree</button>
                <button className="px-4 h-full text-gray-600 hover:bg-gray-50 font-medium transition-colors">Alignment</button>
              </div>
            )}
            <div className={`flex items-center gap-3 ${isMobile ? 'w-full' : ''}`}>
              <Button variant="outline" bgColor="text" size="sm" icon={<Filter className="w-4 h-4" />} className={`bg-white h-9 ${isMobile ? 'flex-1 justify-center' : ''}`}>
                Filter
              </Button>
              <Button variant="contain" bgColor="primary" size="sm" icon={<Plus className="w-4 h-4" />} className={`h-9 ${isMobile ? 'flex-1 justify-center' : ''}`}>
                New Goal
              </Button>
            </div>
            {isMobile && (
              <div className="flex w-full items-center border border-gray-200 rounded-lg overflow-hidden bg-white text-sm h-10 mt-1">
                <button className="flex-1 h-full text-gray-600 hover:bg-gray-50 font-medium transition-colors">List</button>
                <button className="flex-1 h-full bg-blue-500 text-white font-medium transition-colors">Tree</button>
                <button className="flex-1 h-full text-gray-600 hover:bg-gray-50 font-medium transition-colors">Alignment</button>
              </div>
            )}
          </div>
        </div>

        {/* Main Card */}
        <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${isMobile ? 'p-4' : 'p-6'} min-h-[70vh]`}>
          
          {/* Parent Goal Box */}
          <div className={`bg-[#f0f7ff] border border-blue-100 rounded-xl p-4 flex ${isMobile ? 'flex-col gap-3' : 'flex-row items-center justify-between'} mb-6 z-10 relative`}>
             <div className="flex items-start gap-3">
               <div className="shrink-0 mt-1">
                 <Badge label="ORG" variant="blue" size="md" />
               </div>
               <div>
                 <Typography variant="bodyMedium" className="font-semibold text-gray-900 mb-0.5">PW FY26 &middot; Become the #1 EdTech platform in India by Q4</Typography>
                 <Typography variant="caption" className="text-gray-500">Cascaded from Alakh Pandey &middot; OKR &middot; 8 org-level KRs</Typography>
               </div>
             </div>
             <div className={isMobile ? "self-start ml-11" : ""}>
               <Badge label="Aligned" variant="white" size="sm" />
             </div>
          </div>

          {/* Tree Section */}
          <div className={`relative ${isMobile ? '' : 'pl-10'} space-y-6`}>
             {/* Main Vertical Tree Line */}
             {!isMobile && <div className="absolute left-[20px] top-[0px] bottom-[40px] w-px bg-gray-200 z-0"></div>}

             {goals.map((goal, index) => (
                <div 
                  key={index} 
                  onClick={() => navigate(`/webapp/performance-app/my-goals/${index}`)}
                  className="relative z-10 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
                >
                   {/* Horizontal Tree Line to OKR */}
                   {!isMobile && <div className="absolute left-[-20px] top-[40px] w-[20px] h-px bg-gray-200 z-0"></div>}
                   
                   {/* OKR Row */}
                   <div className={`p-4 flex ${isDesktop ? 'flex-row items-center justify-between' : 'flex-col'} bg-white relative z-10 gap-4`}>
                      {/* Left Side: Info */}
                      <div className="flex items-start md:flex-row flex-col gap-3 flex-1">
                         <div className={`flex flex-col gap-1 ${isMobile ? 'w-16' : 'w-[100px]'} shrink-0 mt-0.5`}>
                            <div className="self-start">
                               <Badge label={goal.type} variant="purple" size="sm" />
                            </div>
                            <Typography variant="caption" className="text-gray-500 ml-1">{goal.label}</Typography>
                         </div>
                         <div className="flex-1 pr-2">
                            <Typography variant="bodyMedium" className="font-semibold text-gray-900 mb-1">{goal.title}</Typography>
                            <Typography variant="caption" className="text-gray-500">{goal.subtitle}</Typography>
                         </div>
                      </div>

                      {/* Right Side: Progress & Badges */}
                      <div className={`${isDesktop ? 'w-[400px]' : 'w-full'} shrink-0 flex ${isMobile ? 'flex-col gap-4' : 'flex-row items-center justify-end'} mt-2`}>
                         <div className={`flex items-center gap-4 ${isDesktop ? 'border-r border-gray-100 pr-6 mr-6' : isMobile ? 'justify-between w-full' : 'mr-4'}`}>
                            <div className={isMobile ? "" : "w-[90px] text-right"}>
                               <Typography variant="bodyMedium" className="font-bold text-gray-900 whitespace-nowrap">{goal.current} <span className="font-normal text-gray-500">/ {goal.target}</span></Typography>
                               <Typography variant="caption" className="text-gray-500 whitespace-nowrap block mt-0.5">{goal.unit}</Typography>
                            </div>
                            <div className={`${isMobile ? 'flex-1 ml-4' : 'w-[128px]'} shrink-0 flex flex-col gap-1.5`}>
                               <Typography variant="caption" className="text-gray-500 text-right">{goal.percentage}% - {goal.weight}w</Typography>
                               <div className="w-full bg-gray-100 rounded-md h-1.5 overflow-hidden">
                                  <div className={`h-1.5 rounded-md ${goal.barColor}`} style={{ width: `${goal.percentage}%` }}></div>
                               </div>
                            </div>
                         </div>
                         <div className={`min-w-fit shrink-0 flex ${isMobile ? 'flex-row w-full justify-start' : 'flex-col items-end'} gap-2 mt-2 md:mt-0`}>
                            <Badge label={goal.status} variant={getStatusVariant(goal.status) as any} size="sm" pulse={{ show: true }} />
                            <Badge label={goal.state} variant="info" size="sm" />
                         </div>
                      </div>
                   </div>

                   {/* KRs Row (if any) */}
                   {goal.krs && (
                      <div className="bg-gray-50/50 border-t border-gray-100 p-4 relative z-10">
                         <div className={`relative ${isMobile ? 'pl-2' : 'pl-12'} space-y-4`}>
                            {/* Vertical line for KRs */}
                            {!isMobile && <div className="absolute left-[24px] top-[-16px] bottom-4 w-px bg-gray-200 z-0"></div>}
                            {goal.krs.map((kr, kIdx) => (
                               <div key={kIdx} className={`relative flex ${!isDesktop ? 'flex-col gap-2' : 'flex-row items-center'} `}>
                                  {/* Horizontal line to KR */}
                                  {!isMobile && <div className="absolute left-[-24px] top-[14px] w-[24px] h-px bg-gray-200 z-0"></div>}
                                  
                                  <div className={`flex ${!isDesktop ? 'items-start' : 'items-center'} gap-3 flex-1 md:pl-4`}>
                                     <div className="mt-0.5 flex-shrink-0">
                                        <Badge label={kr.id} variant="purple-outline" size="sm" />
                                     </div>
                                     <Typography variant="caption" className="text-gray-600">{kr.title}</Typography>
                                  </div>
                                  
                                  <div className={`${isDesktop ? 'w-[400px]' : 'w-full'} shrink-0 flex items-center justify-start xl:justify-end ${!isDesktop ? 'pl-11' : 'xl:pl-0'}`}>
                                     <div className={`flex items-center gap-4 ${isDesktop ? 'pr-6 mr-6' : 'w-full'}`}>
                                        <div className="w-[90px] hidden xl:block"></div>
                                        <div className={`${!isDesktop ? 'flex-1' : 'w-[128px]'} shrink-0 mt-1 flex flex-col gap-1`}>
                                           {!isDesktop && <Typography variant="caption" className="text-gray-500 text-right">{kr.percentage}%</Typography>}
                                           <div className="w-full bg-gray-200 rounded-md h-1.5 overflow-hidden">
                                              <div className="h-1.5 rounded-md bg-blue-500" style={{ width: `${kr.percentage}%` }}></div>
                                           </div>
                                        </div>
                                     </div>
                                     <div className="w-[90px] shrink-0 hidden xl:block"></div>
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