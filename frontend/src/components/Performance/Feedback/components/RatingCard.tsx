import React from 'react';
import { Typography } from '../../../shared/atoms/Typography';
import Badge from '../../../shared/Badge';
import { FeedbackScaleOption } from '../../../../types/goal';



export interface RatingCardProps {
  title: string;
  description: string;
  required?: boolean;
  value: number;
  onChange: (val: number) => void;
  comment: string;
  onCommentChange: (val: string) => void;
  weightage?: number;
  scale: FeedbackScaleOption[];
  disabled?: boolean;
}

export const RatingCard: React.FC<RatingCardProps> = ({ title, description, required = false, value, onChange, comment, onCommentChange, weightage, scale=[], disabled = false }) => {
  const selectedOption = scale.find(o => o.value === value);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6 transition-all ${disabled ? 'bg-gray-50/60 opacity-90' : ''}`}>
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
      <div className="flex items-center gap-2 shrink-0">
        {weightage !== undefined && (
          <Badge label={`Weight: ${weightage}%`} variant="info" size="sm" />
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 mb-6">
        {scale.map((opt) => {
          const isSelected = value === opt.value;
          const isHighRating = opt.value >= 4;
          
          const selectedBgClass = isHighRating ? "bg-green-50 border-green-500" : "bg-blue-50 border-blue-500";
          const selectedTextClass = isHighRating ? "text-green-600" : "text-blue-600";
          const scoreTextClass = isHighRating ? "text-green-500" : "text-blue-500";

          return (
            <button
              key={opt.value}
              aria-label={`Select ${opt.label} rating`}
              disabled={disabled}
              onClick={() => !disabled && onChange(opt.value)}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                disabled
                  ? isSelected
                    ? `${selectedBgClass} opacity-80 cursor-not-allowed`
                    : 'border-gray-200 bg-gray-100/60 text-gray-400 cursor-not-allowed'
                  : isSelected 
                    ? selectedBgClass 
                    : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <span className={`text-sm font-medium mb-1 ${isSelected ? selectedTextClass : disabled ? 'text-gray-400' : 'text-gray-700'}`}>
                {opt.label}
              </span>
              <span className={`text-xs ${isSelected ? scoreTextClass : 'text-gray-400'}`}>
                {opt.value} / {scale.length}
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
          disabled={disabled}
          readOnly={disabled}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder="A specific example that supports your rating..."
          className={`w-full border rounded-lg p-3 text-sm resize-none min-h-[80px] transition-all ${
            disabled
              ? 'bg-gray-100/60 border-gray-200 text-gray-500 cursor-not-allowed'
              : 'border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
          }`}
        />
      </div>
    </div>
  );
};
