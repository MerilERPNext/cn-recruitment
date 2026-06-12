import React from 'react';
import { Sparkle, Check } from 'lucide-react';
import { Typography } from '../../../shared/atoms/Typography';
import Button from '../../../shared/atoms/Button';

export interface Reviewer {
  id: number;
  initials: string;
  name: string;
  role: string;
  suggestionText: string;
  selected: boolean;
}

interface ReviewerCardProps {
  reviewer: Reviewer;
  onToggleSelection: (id: number) => void;
}

export const ReviewerCard: React.FC<ReviewerCardProps> = ({ reviewer, onToggleSelection }) => {
  return (
    <div className="flex min-w-0 flex-col gap-4 p-4 transition-colors hover:bg-gray-50 md:flex-row md:items-center md:justify-between">
      {/* User Info */}
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
          {reviewer.initials}
        </div>
        <div className="min-w-0">
          <Typography variant="bodyMedium" className="break-words font-bold text-gray-900">{reviewer.name}</Typography>
          <Typography variant="caption" className="mt-0.5 block break-words text-gray-500">{reviewer.role}</Typography>
        </div>
      </div>
      
      {/* Action & Badge */}
      <div className="flex min-w-0 flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center md:ml-auto md:justify-end">
        <div className="flex min-w-0 items-center gap-1.5 rounded-xl bg-purple-100 px-2 py-1 text-purple-700 min-[420px]:max-w-[240px]">
          <Sparkle className="h-3.5 w-3.5 shrink-0 text-purple-700" />
          <Typography variant="label" className="min-w-0 break-words text-purple-700">
            {reviewer.suggestionText}
          </Typography>
        </div>
        {reviewer.selected ? (
          <Button 
            variant="contain" 
            bgColor="primary" 
            className="flex w-full items-center justify-center gap-1.5 shadow-sm min-[420px]:w-28"
            onClick={() => onToggleSelection(reviewer.id)}
          >
            <Check className="w-4 h-4" /> Selected
          </Button>
        ) : (
          <Button 
            variant="outline" 
            bgColor="primary" 
            className="flex w-full items-center justify-center gap-1.5 bg-white min-[420px]:w-28"
            onClick={() => onToggleSelection(reviewer.id)}
          >
            + Nominate
          </Button>
        )}
      </div>
    </div>
  );
};
