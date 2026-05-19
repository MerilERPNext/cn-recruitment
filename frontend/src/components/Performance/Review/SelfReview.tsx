import React, { useState, Suspense, lazy } from 'react';
import { Sparkles } from 'lucide-react';
import { Typography } from '../../shared/atoms/Typography';
import Button from '../../shared/atoms/Button';

const SelfReviewSidebar = lazy(() => import('./components/SelfReviewSidebar').then(m => ({ default: m.SelfReviewSidebar })));
const AchievementCard = lazy(() => import('./components/AchievementCard').then(m => ({ default: m.AchievementCard })));
const SelfReviewRightSidebar = lazy(() => import('./components/SelfReviewRightSidebar').then(m => ({ default: m.SelfReviewRightSidebar })));

const Review = () => {
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
    <div className="min-h-full bg-[#f8fafc] overflow-y-scroll p-4 sm:p-6 font-sans">
      <Suspense fallback={<div className="p-6 text-center text-gray-500">Loading...</div>}>
      <div className="max-w-[1400px] mx-auto flex flex-col xl:flex-row gap-6">
        
        {/* Left Sidebar */}
        <SelfReviewSidebar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
           {/* Header Card */}
           <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
                className="bg-purple-50 border-purple-100 text-purple-700 hover:bg-purple-100 whitespace-nowrap w-full sm:w-auto justify-center"
              >
                 AI: Pre-fill from check-ins
              </Button>
           </div>

           {/* Form Cards */}
           {achievements.map((achievement) => (
             <AchievementCard key={achievement.id} achievement={achievement} />
           ))}
        </div>

        {/* Right Sidebar */}
        <SelfReviewRightSidebar />

      </div>
      </Suspense>
    </div>
  );
};

export default Review;