import React from 'react';
import { Typography } from '../../../shared/atoms/Typography';
import Badge from '../../../shared/Badge';

const RATING_OPTIONS = [
  { value: 1, label: 'Unsatisfactory', score: '1 / 5' },
  { value: 2, label: 'Below', score: '2 / 5' },
  { value: 3, label: 'Meets', score: '3 / 5' },
  { value: 4, label: 'Exceeds', score: '4 / 5', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-500' },
  { value: 5, label: 'Outstanding', score: '5 / 5', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-500' },
];

export interface RatingCardProps {
  title: string;
  description: string;
  required?: boolean;
  value: number;
  onChange: (val: number) => void;
  comment: string;
  onCommentChange: (val: string) => void;
}

export const RatingCard: React.FC<RatingCardProps> = ({ title, description, required = true, value, onChange, comment, onCommentChange }) => {
  const selectedOption = RATING_OPTIONS.find(o => o.value === value);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
        <div className="mb-2 sm:mb-0">
          <Typography variant="h3" className="text-gray-900 font-semibold mb-1">
            {title} {required && <span className="text-red-500">*</span>}
          </Typography>
          <Typography variant="bodyMedium" className="text-gray-600">
            {description}
          </Typography>
        </div>
        {selectedOption && value >= 4 && (
          <Badge label={selectedOption.label} variant="success" size="sm" pulse={{show: false}} icon={<div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>} />
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 mb-6">
        {RATING_OPTIONS.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              aria-label={`Select ${opt.label} rating`}
              onClick={() => onChange(opt.value)}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                isSelected 
                  ? `${opt.border || 'border-blue-500'} ${opt.bg || 'bg-blue-50'}` 
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <span className={`text-sm font-medium mb-1 ${isSelected ? (opt.color || 'text-gray-900') : 'text-gray-700'}`}>
                {opt.label}
              </span>
              <span className={`text-xs ${isSelected ? (opt.color ? 'text-green-500' : 'text-gray-500') : 'text-gray-400'}`}>
                {opt.score}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <Typography variant="caption" className="text-gray-700 font-medium tracking-wide">Comment (optional)</Typography>
        <textarea
          aria-label="Rating comment"
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder="A specific example that supports your rating..."
          className="w-full border border-gray-200 rounded-lg p-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none min-h-[80px]"
        />
      </div>
    </div>
  );
};
