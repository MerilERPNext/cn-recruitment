import React from 'react';
import Button from '../../../shared/atoms/Button';
import { Typography } from '../../../shared/atoms/Typography';

export interface FeedbackErrorCardProps {
  title?: string;
  error?: Error | null | unknown;
  onRetry?: () => void;
  className?: string;
}

export const FeedbackErrorCard: React.FC<FeedbackErrorCardProps> = ({
  title = "Failed to load reviews",
  error,
  onRetry,
  className = "",
}) => {
  const errorMessage =
    error instanceof Error ? error.message : typeof error === 'string' ? error : "Could not connect to backend server.";

  return (
    <div className={`bg-red-500/10 rounded-xl border border-red-500/30 p-6 flex flex-col items-center justify-center text-center ${className}`}>
      <Typography variant="bodyMedium" className="text-red-500 font-semibold text-sm mb-1">
        {title}
      </Typography>
      <Typography variant="caption" className="text-red-400 text-xs mb-3">
        {errorMessage}
      </Typography>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="border-red-500/30 text-red-500 bg-card hover:bg-red-500/20 text-xs px-3 h-8 justify-center cursor-pointer"
        >
          Retry / Refetch
        </Button>
      )}
    </div>
  );
};

export default FeedbackErrorCard;
