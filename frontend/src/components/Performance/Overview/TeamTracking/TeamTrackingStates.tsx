import { Typography } from "../../../shared/atoms/Typography";
import Button from "../../../shared/atoms/Button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { JSX } from "react";

export const ErrorState = ({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}): JSX.Element => (
  <div className="flex min-h-[300px] items-center justify-center p-6">
    <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-6 text-center max-w-md">
      <AlertCircle className="h-8 w-8 text-red-500" />
      <Typography variant="bodySmall" className="text-red-700 font-medium">
        {message || "Failed to load data. Please try again."}
      </Typography>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="mt-2 text-xs flex items-center gap-1.5 border-red-300 text-red-700 hover:bg-red-100"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </Button>
      )}
    </div>
  </div>
);

// Skeleton Loader Component for Employee Cards List
export const EmployeeListSkeleton = (): JSX.Element => (
  <div className="space-y-3 max-w-3xl mx-auto">
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        className="p-4 border border-gray-100 rounded-xl bg-white flex justify-between items-center animate-pulse"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
          <div className="h-4 w-44 bg-slate-200 rounded-md" />
        </div>
        <div className="w-5 h-5 bg-slate-200 rounded shrink-0" />
      </div>
    ))}
  </div>
);

// Skeleton Loader Component for Goals Cards List
export const EmployeeGoalsSkeleton = (): JSX.Element => (
  <div className="space-y-4 max-w-4xl mx-auto">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="p-5 border border-gray-100 rounded-xl bg-white animate-pulse"
      >
        <div className="flex flex-col lg:flex-row justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex gap-2">
              <div className="h-5 w-16 bg-slate-200 rounded-md" />
              <div className="h-5 w-20 bg-slate-200 rounded-md" />
            </div>
            <div className="h-5 w-3/4 bg-slate-200 rounded-md" />
            <div className="h-4 w-1/2 bg-slate-200 rounded-md" />
          </div>
          <div className="flex items-center gap-6">
            <div className="h-8 w-16 bg-slate-200 rounded-md" />
            <div className="w-5 h-5 bg-slate-200 rounded shrink-0" />
          </div>
        </div>
      </div>
    ))}
  </div>
);
