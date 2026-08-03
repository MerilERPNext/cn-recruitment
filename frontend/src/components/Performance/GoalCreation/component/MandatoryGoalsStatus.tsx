import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Typography } from '../../../shared/atoms/Typography';
import Button from '../../../shared/atoms/Button';

export const MandatoryGoalsSkeleton: React.FC = () => {
    return (
        <div className="min-w-0 flex-1 animate-pulse space-y-3">
            <div className="flex items-center gap-2 mb-2">
                <div className="h-5 w-44 bg-red-200/60 rounded-md"></div>
                <div className="h-4 w-52 bg-red-100/60 rounded-md"></div>
            </div>
            <div className="h-5 w-3/4 bg-gray-200 rounded-md mb-4"></div>
            <div className="flex flex-wrap gap-3">
                <div className="h-9 w-60 bg-white border border-gray-200 rounded-lg p-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                    <div className="h-4 w-40 bg-gray-200 rounded"></div>
                    <div className="h-4 w-8 bg-gray-200 rounded ml-auto"></div>
                </div>
                <div className="h-9 w-52 bg-white border border-gray-200 rounded-lg p-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded"></div>
                    <div className="h-4 w-8 bg-gray-200 rounded ml-auto"></div>
                </div>
            </div>
        </div>
    );
};

export interface MandatoryGoalsErrorProps {
    onRetry?: () => void;
}

export const MandatoryGoalsError: React.FC<MandatoryGoalsErrorProps> = ({ onRetry }) => {
    return (
        <div className="min-w-0 flex-1 py-1">
            <div className="flex items-center gap-2 text-red-600 mb-1 font-medium text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Failed to load mandatory goals</span>
            </div>
            <Typography variant="bodyMedium" className="text-gray-500 text-xs mb-3">
                Unable to fetch mandatory OKRs at this moment. Please try again or contact HR.
            </Typography>
            {onRetry && (
                <Button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-md transition-colors"
                >
                    <RefreshCw className="w-3 h-3" /> Retry
                </Button>
            )}
        </div>
    );
};
