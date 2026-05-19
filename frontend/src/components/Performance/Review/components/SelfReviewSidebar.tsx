import React from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import { Typography } from '../../../shared/atoms/Typography';

export const SelfReviewSidebar = () => {
  return (
    <div className={`w-full xl:w-64 shrink-0 flex flex-col gap-6`}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <Typography variant="caption" className="text-gray-500 font-semibold tracking-wider mb-4 block">SELF-REVIEW</Typography>
        
        <div className="flex flex-col gap-1">
          {/* Step 1 */}
          <div className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
               <CheckCircle className="w-5 h-5 text-green-500" />
               <Typography variant="bodyMedium" className="text-gray-700">Goals & KRs</Typography>
            </div>
            <Typography variant="caption" className="text-gray-400">5Q</Typography>
          </div>
          
          {/* Step 2 (Active) */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50 cursor-pointer">
            <div className="flex items-center gap-3">
               <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">2</div>
               <Typography variant="bodyMedium" className="text-blue-700 font-semibold">Achievements</Typography>
            </div>
            <Typography variant="caption" className="text-blue-500">3Q</Typography>
          </div>

          {/* Step 3 */}
          <div className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
               <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold">3</div>
               <Typography variant="bodyMedium" className="text-gray-600">Development Plan</Typography>
            </div>
            <Typography variant="caption" className="text-gray-400">4Q</Typography>
          </div>

          {/* Step 4 */}
          <div className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
               <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold">4</div>
               <Typography variant="bodyMedium" className="text-gray-600">Career Aspirations</Typography>
            </div>
            <Typography variant="caption" className="text-gray-400">2Q</Typography>
          </div>

          {/* Step 5 */}
          <div className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
               <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold">5</div>
               <Typography variant="bodyMedium" className="text-gray-600">Overall Comments</Typography>
            </div>
            <Typography variant="caption" className="text-gray-400">1Q</Typography>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <Typography variant="caption" className="text-gray-600">Progress</Typography>
            <Typography variant="caption" className="text-gray-900 font-semibold">1 of 5 done</Typography>
          </div>
          <div className="w-full bg-gray-100 rounded-md h-1.5 mb-3">
            <div className="bg-blue-500 h-1.5 rounded-md" style={{ width: '20%' }}></div>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <Typography variant="caption">Autosaved 12s ago</Typography>
          </div>
        </div>
      </div>
    </div>
  );
};
