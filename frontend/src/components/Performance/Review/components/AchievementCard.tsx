import React from 'react';
import { Plus } from 'lucide-react';
import { Typography } from '../../../shared/atoms/Typography';
import Button from '../../../shared/atoms/Button';

export interface ReviewQuestionItem {
  id: number;
  title: string;
  impact: string;
  chars?: number;
}

interface AchievementCardProps {
  achievement: ReviewQuestionItem;
  titleLabel?: string;
  impactLabel?: string;
  onRemove?: (id: number) => void;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  titleLabel = "Achievement title",
  impactLabel = "Impact & evidence",
  onRemove,
}) => {
  const [title, setTitle] = React.useState(achievement.title);
  const [impact, setImpact] = React.useState(achievement.impact);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <div className="flex justify-between items-start mb-4">
        <label className="block text-sm font-medium text-gray-700">
          {titleLabel} <span className="text-red-500">*</span>
        </label>
        <Button
          variant="outline"
          bgColor="text"
          size="sm"
          onClick={() => onRemove && onRemove(achievement.id)}
          className="text-gray-600 h-8"
          aria-label="Remove item"
        >
          Remove
        </Button>
      </div>
      <input
        aria-label={titleLabel}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border border-gray-200 rounded-lg p-3 text-gray-900 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
      />

      <label className="block text-sm font-medium text-gray-700 mb-2">
        {impactLabel} <span className="text-red-500">*</span>
      </label>
      <textarea
        aria-label={impactLabel}
        value={impact}
        onChange={(e) => setImpact(e.target.value)}
        rows={4}
        maxLength={1000}
        className="w-full border border-gray-200 rounded-lg p-3 text-gray-900 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none bg-white"
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <button
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors text-sm font-medium text-left"
          aria-label="Attach evidence"
        >
          <Plus className="w-4 h-4 shrink-0" />{" "}
          <span className="whitespace-normal sm:whitespace-nowrap">
            Attach evidence (Figma, doc, dashboard)
          </span>
        </button>
        <Typography variant="caption" className="text-gray-400 self-end sm:self-auto">
          {impact.length} / 1000
        </Typography>
      </div>
    </div>
  );
};
