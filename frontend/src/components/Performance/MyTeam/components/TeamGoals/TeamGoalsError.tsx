import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import Button from "../../../../shared/atoms/Button";
import { Typography } from "../../../../shared/atoms/Typography";

interface TeamGoalsErrorProps {
  message?: string;
  onRetry?: () => void;
}

export const TeamGoalsError: React.FC<TeamGoalsErrorProps> = ({
  message = "Failed to load team goals. Please try again.",
  onRetry,
}) => {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50/50 p-6 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
        <AlertCircle className="h-6 w-6" />
      </div>
      <Typography variant="h4" className="font-semibold text-slate-900 mb-1">
        Something went wrong
      </Typography>
      <Typography variant="bodySmall" className="text-slate-600 mb-4 max-w-md mx-auto">
        {message}
      </Typography>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="inline-flex items-center gap-2 border-red-200 text-red-700 hover:bg-red-100"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry Loading
        </Button>
      )}
    </div>
  );
};

export default TeamGoalsError;
