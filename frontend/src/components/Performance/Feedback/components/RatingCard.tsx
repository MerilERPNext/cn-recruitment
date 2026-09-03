import React, { memo } from 'react';
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

export const RatingCard: React.FC<RatingCardProps> = memo(({
  title,
  description,
  required = false,
  value,
  onChange,
  comment,
  onCommentChange,
  weightage,
  scale = [],
  disabled = false,
}) => {
  const selectedOption = scale.find(o => o.value === value);

  return (
    <div className={`bg-card rounded-xl shadow-sm border border-border p-4 sm:p-6 mb-6 transition-all ${disabled ? 'bg-slate-500/10 opacity-90' : ''}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
        <div className="mb-2 sm:mb-0">
          <Typography variant="h3" className="text-text-title font-semibold mb-1">
            {title} {required && <span className="text-red-500">*</span>}
          </Typography>
          <Typography variant="bodyMedium" color="body2">
            {description}
          </Typography>
        </div>
        {selectedOption && value >= 4 && (
          <Badge label={selectedOption.label} variant="success" size="sm" pulse={{show: false}} icon={<div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>} />
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
          
          const selectedBgClass = isHighRating ? "bg-emerald-500/10 border-emerald-500/50" : "bg-primary/10 border-primary/50";
          const selectedTextClass = isHighRating ? "text-emerald-500" : "text-primary";
          const scoreTextClass = isHighRating ? "text-emerald-500" : "text-primary";

          return (
            <button
              key={opt.value}
              aria-label={`Select ${opt.label} rating`}
              disabled={disabled}
              onClick={() => !disabled && onChange(opt.value)}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all cursor-pointer ${
                disabled
                  ? isSelected
                    ? `${selectedBgClass} opacity-80 cursor-not-allowed`
                    : 'border-border bg-slate-500/10 text-text-body2 cursor-not-allowed'
                  : isSelected 
                    ? selectedBgClass 
                    : 'border-border hover:border-primary/50 bg-card'
              }`}
            >
              <span className={`text-sm font-medium mb-1 ${isSelected ? selectedTextClass : disabled ? 'text-text-body2' : 'text-text-title'}`}>
                {opt.label}
              </span>
              <span className={`text-xs ${isSelected ? scoreTextClass : 'text-text-body2'}`}>
                {opt.value} / {scale.length}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <Typography variant="caption" color="body2" className="font-medium tracking-wide">Comment (optional)</Typography>
        <textarea
          aria-label="Rating comment"
          value={comment}
          disabled={disabled}
          readOnly={disabled}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder="A specific example that supports your rating..."
          className={`w-full border border-border bg-card rounded-lg p-3 text-sm text-text-title placeholder:text-text-body2 resize-none min-h-[80px] transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${
            disabled ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        />
      </div>
    </div>
  );
});

RatingCard.displayName = "RatingCard";
export default RatingCard;
