import React from "react";
import { AlertCircle } from "lucide-react";
import { Typography } from "../../../../shared/atoms/Typography";

interface TeamGoalsErrorProps {
  message?: string;
  onRetry?: () => void;
}

export const TeamGoalsError: React.FC<TeamGoalsErrorProps> = ({
  message = "Failed to load team goals. Please try again.",
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

    </div>
  );
};

export default TeamGoalsError;
