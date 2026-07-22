import React from 'react';
import { ArrowRight, Check } from 'lucide-react'
import Badge from '../../../shared/Badge'
import { Typography } from '../../../shared/atoms/Typography'
const steps = [
  { n: null, label: "Goal Setting", done: true },
  { n: 2, label: "Self-Review", active: true },
  { n: 3, label: "Manager Review", done: false },
  { n: 4, label: "Calibration", done: false },
  { n: 5, label: "Released", done: false },
];

interface OverviewHeaderProps {
  setActiveTab : React.Dispatch<React.SetStateAction<"overview" | "my-goals" | "skills" | "review" | "feedback">>
}

const OverviewHeader = ({ setActiveTab }: OverviewHeaderProps) => {
  return (
     <article aria-label="Cycle Information" className="min-w-0 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
              <div aria-label="Cycle Details" className="mb-5 flex min-w-0 flex-col justify-between gap-4 sm:mb-8 lg:flex-row lg:items-end">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge label="CYCLE LIVE" backgroundColor="bg-blue-100 " textColor="text-blue-700" size="sm" pulse={{ show: true, color: "bg-blue-600" }} />
                    <Typography variant="bodySmall" className="break-words text-gray-500">Apr 2026 &rarr; Mar 2027 &middot; India Tech</Typography>
                  </div>
                  <Typography variant="h3" className="break-words text-xl leading-tight sm:text-2xl">FY26 Annual Performance Cycle</Typography>
                  <Typography variant="bodySmall" className="mt-1 block break-words text-gray-500">Configured by HR &middot; India Tech BU &middot; 2,140 participants</Typography>
                </div>
                <div className="flex w-full min-w-0 flex-col items-start lg:w-auto lg:items-end">
                  <Typography variant="label" className="text-gray-400 font-semibold tracking-wider uppercase mb-2">Next Deadline</Typography>
                  <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center lg:w-auto lg:justify-end">
                    <Typography variant="bodySmall" className="font-medium text-blue-600">Self-Review due 21 May</Typography>
                    <button onClick={()=> setActiveTab("review")} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 sm:w-auto" aria-label="Continue self review">
                      Continue Self-Review <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
    
              {/* Stepper */}
             <div className="flex items-center gap-0 overflow-x-auto pb-1 scrollbar-hide">
                     {steps.map((step, idx) => (
                       <React.Fragment key={step.label}>
                         {idx > 0 && <div className="h-px w-10 shrink-0 bg-gray-200 mx-3" />}
                         <div
                           className={`flex items-center gap-2 shrink-0 ${!step.done && !step.active ? "opacity-40" : ""}`}
                         >
                           {step.done ? (
                             <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center">
                               <Check className="w-3 h-3" />
                             </div>
                           ) : (
                             <div
                               className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step.active ? "bg-[#1a73e8] text-white" : "bg-gray-100 text-gray-500"}`}
                             >
                               {step.n}
                             </div>
                           )}
                           <Typography
                             variant="caption"
                             className={`whitespace-nowrap font-medium text-[11px] ${step.active ? "text-[#1a73e8] font-bold" : step.done ? "text-green-600 font-bold" : "text-gray-500"}`}
                           >
                             {step.label}
                           </Typography>
                         </div>
                       </React.Fragment>
                     ))}
                   </div>
            </article>
    
  )
}

export default React.memo(OverviewHeader);
