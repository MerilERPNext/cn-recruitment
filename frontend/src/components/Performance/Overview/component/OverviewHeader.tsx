import React from 'react';
import { ArrowRight, Check } from 'lucide-react'
import Badge from '../../../shared/Badge'
import { Typography } from '../../../shared/atoms/Typography'
import { useScreenSize } from '../../../../hooks/useScreenSize';

const OverviewHeader:React.FC = () => {
    const { isMobile } = useScreenSize();

  return (
     <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge label="CYCLE LIVE" backgroundColor="bg-blue-100 ring-1 ring-inset ring-blue-300" textColor="text-blue-700" size="sm" pulse={{ show: true, color: "bg-blue-600" }} />
                    <Typography variant="bodySmall" className="text-gray-500">Apr 2026 &rarr; Mar 2027 &middot; India Tech</Typography>
                  </div>
                  <Typography variant="h3" >FY26 Annual Performance Cycle</Typography>
                  <Typography variant="bodySmall" className="text-gray-500">Configured by HR &middot; India Tech BU &middot; 2,140 participants</Typography>
                </div>
                <div className="flex flex-col items-end">
                  <Typography variant="label" className="text-gray-400 font-semibold tracking-wider uppercase mb-2">Next Deadline</Typography>
                  <div className="flex items-center gap-4">
                    <Typography variant="bodySmall" className="text-blue-600 font-medium">Self-Review due 21 May</Typography>
                    <button className={`bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${isMobile ? 'w-full justify-center' : ''}`}>
                      Continue Self-Review <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
    
              {/* Stepper */}
              <div className="flex items-center w-full max-w-xl  gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </div>
                  <Typography variant="bodySmall" className="font-medium text-green-600">Goal Setting</Typography>
                </div>
                
                <div className="flex-1 h-[2px] bg-green-400 rounded-md"></div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <Typography variant="bodySmall" className="font-medium text-gray-900">Self-Review</Typography>
                </div>
                
                <div className="flex-1 h-px bg-gray-200"></div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <Typography variant="bodySmall" className="font-medium text-gray-500">Manager Review</Typography>
                </div>
    
                <div className="flex-1 h-px bg-gray-200"></div>
    
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold">
                    4
                  </div>
                  <Typography variant="bodySmall" className="font-medium text-gray-500">Calibration</Typography>
                </div>
    
                <div className="flex-1 h-px bg-gray-200"></div>
    
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold">
                    5
                  </div>
                  <Typography variant="bodySmall" className="font-medium text-gray-500">Released</Typography>
                </div>
              </div>
            </div>
    
  )
}

export default React.memo(OverviewHeader);