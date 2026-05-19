import React from 'react';
import { Sparkle, Check } from 'lucide-react';
import { Typography } from '../../../shared/atoms/Typography';
import Button from '../../../shared/atoms/Button';
import Badge from '../../../shared/Badge';

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
    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50 transition-colors gap-4">
      {/* User Info */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
          {reviewer.initials}
        </div>
        <div>
          <Typography variant="bodyMedium" className="font-bold text-gray-900">{reviewer.name}</Typography>
          <Typography variant="caption" className="text-gray-500 block mt-0.5">{reviewer.role}</Typography>
        </div>
      </div>
      
      {/* Action & Badge */}
      <div className="flex items-center gap-4 md:ml-auto">
        <div>
          <Badge label={reviewer.suggestionText} variant="purple" size="sm" icon={<Sparkle className="w-3.5 h-3.5" />} />
        </div>
        {reviewer.selected ? (
          <Button 
            variant="contain" 
            bgColor="primary" 
            className="w-28 shadow-sm flex items-center justify-center gap-1.5"
            onClick={() => onToggleSelection(reviewer.id)}
          >
            <Check className="w-4 h-4" /> Selected
          </Button>
        ) : (
          <Button 
            variant="outline" 
            bgColor="primary" 
            className="w-28 bg-white flex items-center justify-center gap-1.5"
            onClick={() => onToggleSelection(reviewer.id)}
          >
            + Nominate
          </Button>
        )}
      </div>
    </div>
  );
};
