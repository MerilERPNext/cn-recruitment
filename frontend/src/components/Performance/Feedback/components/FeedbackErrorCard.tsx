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
    <div className={`bg-red-50/80 rounded-xl border border-red-200 p-6 flex flex-col items-center justify-center text-center ${className}`}>
      <Typography variant="bodyMedium" className="text-red-800 font-semibold text-sm mb-1">
        {title}
      </Typography>
      <Typography variant="caption" className="text-red-600 text-xs mb-3">
        {errorMessage}
      </Typography>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="border-red-300 text-red-700 bg-white hover:bg-red-50 text-xs px-3 h-8 justify-center"
        >
          Retry / Refetch
        </Button>
      )}
    </div>
  );
};

export default FeedbackErrorCard;
