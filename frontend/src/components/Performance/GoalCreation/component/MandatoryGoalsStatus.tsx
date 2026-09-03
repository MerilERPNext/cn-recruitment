import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Typography } from '../../../shared/atoms/Typography';

export const MandatoryGoalsSkeleton: React.FC = () => {
    return (
        <div className="min-w-0 flex-1 animate-pulse space-y-3">
            <div className="flex items-center gap-2 mb-2">
                <div className="h-5 w-44 bg-red-500/20 rounded-md"></div>
                <div className="h-4 w-52 bg-slate-500/20 rounded-md"></div>
            </div>
            <div className="h-5 w-3/4 bg-slate-500/20 rounded-md mb-4"></div>
            <div className="flex flex-wrap gap-3">
                <div className="h-9 w-60 bg-card border border-border rounded-lg p-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-500/30"></div>
                    <div className="h-4 w-40 bg-slate-500/20 rounded"></div>
                    <div className="h-4 w-8 bg-slate-500/20 rounded ml-auto"></div>
                </div>
                <div className="h-9 w-52 bg-card border border-border rounded-lg p-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-500/30"></div>
                    <div className="h-4 w-32 bg-slate-500/20 rounded"></div>
                    <div className="h-4 w-8 bg-slate-500/20 rounded ml-auto"></div>
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
            <div className="flex items-center gap-2 text-red-400 mb-1 font-semibold text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Failed to load mandatory goals</span>
            </div>
            <Typography variant="bodyMedium" className="text-xs text-red-300/90 mb-3">
                Unable to fetch mandatory OKRs at this moment. Please try again or contact HR.
            </Typography>
            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-200 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
            )}
        </div>
    );
};
