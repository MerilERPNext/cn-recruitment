import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, Sparkles, Plus } from 'lucide-react';
import { Typography } from '../../shared/atoms/Typography';
import Button from '../../shared/atoms/Button';
import Badge from '../../shared/Badge';
import { useScreenSize } from '../../../hooks/useScreenSize';

const Review = () => {
  const { isMobile } = useScreenSize();
  const navigate = useNavigate();

  const [achievements] = useState([
    {
      id: 1,
      title: "Led the Oxygen 2.0 dashboard rebuild",
      impact: "Drove design + research for the full redesign. Shipped 24 of 32 v2 components; WAU adoption reached 52% by end of cycle (target 80% by Q3).",
      chars: 139
    },
    {
      id: 2,
      title: "Cut design → engineering handoff time",
      impact: "Built Figma→Storybook automation; introduced clickable prototypes as the new spec format. Median handoff time fell from 4.2 to 3.4 days.",
      chars: 136
    },
    {
      id: 3,
      title: "Mentored two designers to mid-level",
      impact: "Weekly 1:1s + portfolio reviews with Riya and Shreya. Both shipped 4+ features and were promotion-eligible by end of cycle.",
      chars: 123
    }
  ]);

  return (
    <div className={`min-h-full bg-[#f8fafc] overflow-y-scroll ${isMobile ? 'p-4' : 'p-6'} font-sans`}>
      <div className="max-w-[1400px] mx-auto flex flex-col xl:flex-row gap-6">
        
        {/* Left Sidebar */}
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

        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
           {/* Header Card */}
           <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                 <Typography variant="caption" className="text-gray-500 font-semibold tracking-wider mb-1 block">SECTION 2 OF 5</Typography>
                 <Typography variant="h3" className="mb-2">Achievements</Typography>
                 <Typography variant="bodyMedium" className="text-gray-600 max-w-xl">Capture 2-3 of your most impactful accomplishments this cycle. Focus on outcome, not activity.</Typography>
              </div>
              <Button 
                variant="outline" 
                bgColor="primary" 
                size="md" 
                icon={<Sparkles className="w-4 h-4 text-purple-500" />} 
                className="bg-purple-50 border-purple-100 text-purple-700 hover:bg-purple-100 whitespace-nowrap"
              >
                 AI: Pre-fill from check-ins
              </Button>
           </div>

           {/* Form Cards */}
           {achievements.map((achievement) => (
             <div key={achievement.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-start mb-4">
                   <label className="block text-sm font-medium text-gray-700">
                      Achievement title <span className="text-red-500">*</span>
                   </label>
                   <Button variant="outline" bgColor="text" size="sm" className="text-gray-600 h-8">Remove</Button>
                </div>
                <input 
                  type="text" 
                  value={achievement.title}
                  readOnly
                  className="w-full border border-gray-200 rounded-lg p-3 text-gray-900 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white" 
                />

                <label className="block text-sm font-medium text-gray-700 mb-2">
                   Impact & evidence <span className="text-red-500">*</span>
                </label>
                <textarea 
                  value={achievement.impact}
                  readOnly
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg p-3 text-gray-900 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none bg-white" 
                />
                
                <div className="flex justify-between items-center">
                   <button className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors text-sm font-medium">
                      <Plus className="w-4 h-4" /> Attach evidence (Figma, doc, dashboard)
                   </button>
                   <Typography variant="caption" className="text-gray-400">{achievement.chars} / 1000</Typography>
                </div>
             </div>
           ))}
        </div>

        {/* Right Sidebar */}
        <div className="w-full xl:w-80 shrink-0 flex flex-col gap-4">
           {/* AI Highlight */}
           <div className="bg-purple-50/50 rounded-xl border border-purple-100 p-5">
              <div className="flex items-center gap-2 mb-3 text-purple-700 font-semibold text-sm tracking-wide">
                 <Sparkles className="w-4 h-4" /> AI HIGHLIGHT
              </div>
              <Typography variant="bodyMedium" className="text-gray-700 leading-relaxed">
                 From your 11 check-ins this quarter, the achievement most-mentioned by peers is the <span className="font-semibold text-gray-900">Oxygen 2.0 dashboard rebuild</span> — 6 of 4 peer reviewers cited it as their top callout.
              </Typography>
           </div>

           {/* Reviewer Visibility */}
           <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <Typography variant="caption" className="text-gray-500 font-semibold tracking-wider mb-4 block">REVIEWER VISIBILITY</Typography>
              
              <div className="flex flex-col gap-5">
                 <div>
                    <Typography variant="bodyMedium" className="font-semibold text-gray-900">Rohit Khanna &middot; Manager</Typography>
                    <Typography variant="caption" className="text-gray-500 mt-0.5 block">Sees: All sections</Typography>
                 </div>
                 <div>
                    <Typography variant="bodyMedium" className="font-semibold text-gray-900">Aditi Sharma &middot; Skip</Typography>
                    <Typography variant="caption" className="text-gray-500 mt-0.5 block">Sees: Manager rating + comments</Typography>
                 </div>
                 <div>
                    <Typography variant="bodyMedium" className="font-semibold text-gray-900">Peers (4)</Typography>
                    <Typography variant="caption" className="text-gray-500 mt-0.5 block">Sees: Achievements + Development only</Typography>
                 </div>
              </div>
           </div>

           {/* Last Cycle */}
           <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <Typography variant="caption" className="text-gray-500 font-semibold tracking-wider mb-4 block">LAST CYCLE (FY25)</Typography>
              
              <div className="flex items-center gap-3 mb-4">
                 <Badge label="Exceeds · 4/5" variant="success" size="md" />
                 <Typography variant="caption" className="text-gray-500 leading-tight">Final &middot; Released 12 Apr<br/>2025</Typography>
              </div>

              <Typography variant="bodyMedium" className="text-gray-600 italic leading-relaxed">
                 "Pallavi consistently demonstrates Learner's Mindset; ready to step into senior leadership."
              </Typography>
              <Typography variant="caption" className="text-gray-400 mt-3 block">— Rohit Khanna</Typography>
           </div>
        </div>

      </div>
    </div>
  );
};

export default Review;