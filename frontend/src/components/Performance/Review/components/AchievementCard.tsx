import React from 'react';
import { Plus } from 'lucide-react';
import { Typography } from '../../../shared/atoms/Typography';
import Button from '../../../shared/atoms/Button';

export interface Achievement {
  id: number;
  title: string;
  impact: string;
  chars: number;
}

interface AchievementCardProps {
  achievement: Achievement;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({ achievement }) => {
  const [title, setTitle] = React.useState(achievement.title);
  const [impact, setImpact] = React.useState(achievement.impact);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <div className="flex justify-between items-start mb-4">
        <label className="block text-sm font-medium text-gray-700">
          Achievement title <span className="text-red-500">*</span>
        </label>
        <Button variant="outline" bgColor="text" size="sm" className="text-gray-600 h-8" aria-label="Remove achievement">Remove</Button>
      </div>
      <input 
        aria-label="Achievement title"
        type="text" 
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border border-gray-200 rounded-lg p-3 text-gray-900 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white" 
      />

      <label className="block text-sm font-medium text-gray-700 mb-2">
        Impact & evidence <span className="text-red-500">*</span>
      </label>
      <textarea 
        aria-label="Achievement impact and evidence"
        value={impact}
        onChange={(e) => setImpact(e.target.value)}
        rows={4}
        maxLength={1000}
        className="w-full border border-gray-200 rounded-lg p-3 text-gray-900 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none bg-white" 
      />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <button className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors text-sm font-medium text-left" aria-label="Attach achievement evidence">
          <Plus className="w-4 h-4 shrink-0" /> <span className="whitespace-normal sm:whitespace-nowrap">Attach evidence (Figma, doc, dashboard)</span>
        </button>
        <Typography variant="caption" className="text-gray-400 self-end sm:self-auto">{impact.length} / 1000</Typography>
      </div>
    </div>
  );
};
