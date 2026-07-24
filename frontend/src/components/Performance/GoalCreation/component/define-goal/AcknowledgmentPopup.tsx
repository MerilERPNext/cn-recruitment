import React from 'react';
import { X } from 'lucide-react';
import { Typography } from '../../../../shared/atoms/Typography';
import Button from '../../../../shared/atoms/Button';
import { Goal } from '../../../../../types/goal';

interface AcknowledgmentProps {
    onClose: (value?: any) => void;
    goalData?: Goal[];
}

export const getWeightageColor = (weightage?: number, index: number = 0) => {
    if (weightage !== undefined) {
        if (weightage <= 5) {
            return index % 2 === 0
                ? { dot: 'bg-red-500', text: 'text-red-500' }
                : { dot: 'bg-orange-400', text: 'text-orange-500' };
        } else if (weightage <= 10) {
            return { dot: 'bg-blue-500', text: 'text-blue-500' };
        } else if (weightage <= 20) {
            return { dot: 'bg-indigo-500', text: 'text-indigo-500' };
        } else {
            return { dot: 'bg-emerald-500', text: 'text-emerald-500' };
        }
    }
    const colors = [
        { dot: 'bg-red-500', text: 'text-red-500' },
        { dot: 'bg-orange-400', text: 'text-orange-500' },
        { dot: 'bg-blue-500', text: 'text-blue-500' },
    ];
    return colors[index % colors.length];
};

const AcknowledgmentPopup: React.FC<AcknowledgmentProps> = ({ onClose, goalData }) => {
    return (
        <div className="flex w-full max-w-full flex-col overflow-hidden bg-white">

            {/* Header */}
            <div className="relative z-30 shrink-0 border-b border-gray-100 bg-white px-4 py-2.5 sm:px-5 sm:py-4">
                <div className="flex flex-col gap-0.5 mb-1 pr-11 sm:flex-row sm:items-center sm:gap-2 sm:pr-0">
                    <span className="shrink-0 bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-md tracking-wider w-fit">
                        {goalData?.length ?? 3} MANDATORY OKRs ASSIGNED
                    </span>
                    <span className="truncate text-gray-400 text-xs">Pushed by HR · India Tech BU · lock 21 May 2026</span>
                </div>
                <Typography variant="h4" className="pr-11 text-base font-semibold leading-tight text-gray-900 sm:pr-0 sm:mt-1 sm:text-2xl">
                    Acknowledge Mandatory OKRs
                </Typography>
                <Typography variant="caption" className="text-gray-500 mt-0.5 text-[12px] leading-4 sm:text-xs sm:leading-normal">
                    Review each OKR and accept or reject. You must action all before proceeding.
                </Typography>

                <button
                    type="button"
                    className="absolute right-3 top-2 flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-700 sm:right-4 sm:top-4"
                    onClick={() => onClose(false)}
                    aria-label="Close acknowledgment popup"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* OKR Cards */}
            <div className="px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-3 sm:gap-4">
                    {goalData?.map((okr: Goal, index: number) => {
                        const colorConfig = getWeightageColor(okr?.weightage, index);
                        return (
                            <div
                                key={okr.goal || index}
                                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-all duration-200 hover:border-gray-300 hover:shadow-sm"
                            >
                                {/* OKR Info */}
                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                    <div
                                        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${colorConfig.dot}`}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <Typography
                                            variant="bodyMedium"
                                            className="break-words text-sm font-semibold leading-5 text-gray-900"
                                        >
                                            {okr.title}
                                        </Typography>
                                        <div className="mt-1 flex items-center gap-2">
                                            <Typography variant="caption" className="text-gray-400 text-xs">
                                                Weight:
                                            </Typography>
                                            <span className={`text-xs font-semibold ${colorConfig.text}`}>
                                                {okr?.weightage}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 flex flex-col gap-3 border-t border-gray-100 bg-blue-50/50 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:items-center sm:justify-end sm:px-5 sm:py-4">
                <div className="flex w-full gap-2 sm:w-auto">
                    <Button
                        type="button"
                        variant="outline"
                        bgColor="text"
                        className="h-10 w-full justify-center rounded-lg border-gray-200 bg-white px-4 text-gray-700 hover:bg-gray-50 sm:h-9 sm:w-auto"
                        onClick={() => onClose(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="contain"
                        bgColor="error"
                        className="h-10 w-full justify-center rounded-lg px-5 text-sm font-semibold sm:h-9 sm:w-auto transition-all duration-150 bg-[#cd2c41] text-white hover:bg-[#b02235]"
                        onClick={() => onClose(false)}
                    >
                        Submit & Continue
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default React.memo(AcknowledgmentPopup);