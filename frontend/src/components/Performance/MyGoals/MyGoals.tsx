import React from 'react';
import { Search, Plus } from 'lucide-react';
import { Typography } from '../../shared/atoms/Typography';
import Badge from '../../shared/Badge';
import Button from '../../shared/atoms/Button';

const goals = [
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
    statusPulse: "bg-green-700",
    statusBadgeColor: "bg-green-100",
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
    statusPulse: "bg-yellow-700",
    statusBadgeColor: "bg-yellow-100 w-full",
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
    statusPulse: "bg-green-700",
    statusBadgeColor: "bg-green-100",
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
    statusPulse: "bg-green-700",
    statusBadgeColor: "bg-green-50 text-green-700",
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
    statusPulse: "bg-red-700",
    statusBadgeColor: "bg-red-100 ring-1 ring-inset ring-red-300 text-red-700",
    state: "In Progress",
    barColor: "bg-red-500",
  }
];

const MyGoals: React.FC = () => {
  return (
    <div className="min-h-full bg-[#f8fafc] overflow-y-scroll p-6 font-sans">
      <div className="max-w-[1200px] mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <Typography variant="h3">My Goals &middot; FY26</Typography>
            <Typography variant="bodySmall" className="text-gray-500">5 goals &middot; 100% weightage &middot; Goal lock 21 May 2026</Typography>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white text-sm h-9">
              <button className="px-4 h-full text-gray-600 hover:bg-gray-50 font-medium transition-colors">List</button>
              <button className="px-4 h-full bg-blue-500 text-white font-medium transition-colors">Tree</button>
              <button className="px-4 h-full text-gray-600 hover:bg-gray-50 font-medium transition-colors">Alignment</button>
            </div>
            <Button variant="outline" bgColor="text" size="sm" icon={<Search className="w-4 h-4" />} className="bg-white h-9">
              Filter
            </Button>
            <Button variant="contain" bgColor="primary" size="sm" icon={<Plus className="w-4 h-4" />} className="h-9">
              New Goal
            </Button>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[70vh]">
          
          {/* Parent Goal Box */}
          <div className="bg-[#f0f7ff] border border-blue-100 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between mb-6 z-10 relative gap-4">
             <div className="flex items-center gap-4">
               <Badge label="ORG" backgroundColor="bg-blue-500 h-full" textColor="text-white" size="md" />
               <div>
                 <Typography variant="bodyMedium" className="font-semibold text-gray-900 mb-0.5">PW FY26 &middot; Become the #1 EdTech platform in India by Q4</Typography>
                 <Typography variant="caption" className="text-gray-500">Cascaded from Alakh Pandey &middot; OKR &middot; 8 org-level KRs</Typography>
               </div>
             </div>
             <Badge label="Aligned" backgroundColor="bg-white" textColor="text-blue-600" size="sm" />
          </div>

          {/* Tree Section */}
          <div className="relative pl-4 md:pl-10 space-y-6">
             {/* Main Vertical Tree Line */}
             <div className="hidden md:block absolute left-[20px] top-[0px] bottom-[40px] w-px bg-gray-200 z-0"></div>

             {goals.map((goal, index) => (
                <div key={index} className="relative z-10 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                   {/* Horizontal Tree Line to OKR */}
                   <div className="hidden md:block absolute left-[-20px] top-[40px] w-[20px] h-px bg-gray-200 z-0"></div>
                   
                   {/* OKR Row */}
                   <div className="p-4 flex flex-col xl:flex-row xl:items-center justify-between bg-white relative z-10 gap-4">
                      {/* Left Side: Info */}
                      <div className="flex items-start gap-4 flex-1">
                         <div className="flex flex-col gap-1 w-20 md:w-[100px] shrink-0 mt-0.5">
                            <div className="self-start">
                               <Badge label={goal.type} backgroundColor="bg-purple-100 " textColor="text-purple-700" size="sm" />
                            </div>
                            <Typography variant="caption" className="text-gray-500 ml-1">{goal.label}</Typography>
                         </div>
                         <div className="flex-1 pr-4">
                            <Typography variant="bodyMedium" className="font-semibold text-gray-900 mb-1">{goal.title}</Typography>
                            <Typography variant="caption" className="text-gray-500">{goal.subtitle}</Typography>
                         </div>
                      </div>

                      {/* Right Side: Progress & Badges */}
                      <div className="xl:w-[400px] shrink-0 flex flex-col sm:flex-row items-end sm:items-center justify-end gap-4 xl:gap-0 mt-2 xl:mt-0">
                         <div className="flex items-center gap-4 xl:border-r xl:border-gray-100 xl:pr-6 xl:mr-6">
                            <div className="w-[90px] text-right">
                               <Typography variant="bodyMedium" className="font-bold text-gray-900 whitespace-nowrap">{goal.current} <span className="font-normal text-gray-500">/ {goal.target}</span></Typography>
                               <Typography variant="caption" className="text-gray-500 whitespace-nowrap block mt-0.5">{goal.unit}</Typography>
                            </div>
                            <div className="w-[128px] shrink-0 flex flex-col gap-1.5">
                               <Typography variant="caption" className="text-gray-500">{goal.percentage}% - {goal.weight}w</Typography>
                               <div className="w-full bg-gray-100 rounded-md h-1.5 overflow-hidden">
                                  <div className={`h-1.5 rounded-md ${goal.barColor}`} style={{ width: `${goal.percentage}%` }}></div>
                               </div>
                            </div>
                         </div>
                         <div className="min-w-fit shrink-0 flex  flex-col items-center sm:items-end justify-center gap-2">
                            <Badge label={goal.status} backgroundColor={goal.statusBadgeColor.substring(0, goal.statusBadgeColor.lastIndexOf(' '))} textColor={goal.statusBadgeColor.substring(goal.statusBadgeColor.lastIndexOf(' ') + 1)} size="sm" pulse={{ show: true, color: goal.statusPulse }} />
                            <Badge label={goal.state} backgroundColor="bg-blue-100 w-full" textColor="text-blue-700" size="sm" />
                         </div>
                      </div>
                   </div>

                   {/* KRs Row (if any) */}
                   {goal.krs && (
                      <div className="bg-gray-50/50 border-t border-gray-100 p-4 relative z-10">
                         <div className="relative pl-6 md:pl-12 space-y-4">
                            {/* Vertical line for KRs */}
                            <div className="hidden md:block absolute left-[24px] top-[-16px] bottom-4 w-px bg-gray-200 z-0"></div>
                            {goal.krs.map((kr, kIdx) => (
                               <div key={kIdx} className="relative flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-0">
                                  {/* Horizontal line to KR */}
                                  <div className="hidden md:block absolute left-[-24px] top-1/2 w-[24px] h-px bg-gray-200 z-0"></div>
                                  
                                  <div className="flex items-center gap-4 flex-1 md:pl-4">
                                     <Badge label={kr.id} backgroundColor="bg-purple-100 ring-1 ring-inset ring-purple-300" textColor="text-purple-700" size="sm" />
                                     <Typography variant="caption" className="text-gray-600">{kr.title}</Typography>
                                  </div>
                                  
                                  <div className="xl:w-[400px] shrink-0 flex items-center justify-start xl:justify-end md:pl-16 xl:pl-0">
                                     <div className="flex items-center gap-4 xl:pr-6 xl:mr-6">
                                        <div className="w-[90px] hidden xl:block"></div>
                                        <div className="w-[128px] shrink-0 mt-1">
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