import React, { useMemo, useState } from 'react';
import { X, CheckCircle, Loader } from 'lucide-react';
import { Typography } from '../../../shared/atoms/Typography';
import Button from '../../../shared/atoms/Button';
import { GoalsRequest, Templates } from '../../../../types/goal';
import { PERFORMANCE_QUERY_KEYS, useSubmitMandatoryGoals } from '../../../../hooks/usePerformance';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { errorResponseFormater } from '../../../../utils/errorResponseFormater';
import { useNavigate } from 'react-router-dom';

interface AcknowledgmentProps {
    onClose: (isOpen: boolean) => void;
    goalData?: Templates[];
    text?: string
}

export const getWeightageColor = (weightage?: number, index: number = 0) => {
    if (weightage !== undefined) {
        if (weightage <= 10) {
            return index % 2 === 0
                ? { dot: 'bg-red-500', text: 'text-red-500' }
                : { dot: 'bg-orange-400', text: 'text-orange-500' };
        } else if (weightage <= 20) {
            return { dot: 'bg-blue-500', text: 'text-blue-500' };
        } else if (weightage <= 50) {
            return { dot: 'bg-indigo-500', text: 'text-indigo-500' };
        }
        return { dot: 'bg-emerald-500', text: 'text-emerald-500' };
    }
    const colors = [
        { dot: 'bg-red-500', text: 'text-red-500' },
        { dot: 'bg-orange-400', text: 'text-orange-500' },
        { dot: 'bg-blue-500', text: 'text-blue-500' },
    ];
    return colors[index % colors.length];
};

const AcknowledgmentPopup: React.FC<AcknowledgmentProps> = ({ onClose, goalData = [], text }) => {
    const [goalStatuses, setGoalStatuses] = useState<Record<string, 'accept' | 'reject'>>({});
    const queryClient = useQueryClient();
    const { mutate: mutateGoals, isPending } = useSubmitMandatoryGoals();
    const navigate = useNavigate()
    const handleStatusChange = (templateId: string, status: 'accept' | 'reject') => {
        setGoalStatuses((prev) => ({
            ...prev,
            [templateId]: status,
        }));
    };

    const totalWeightage = useMemo(
        () => goalData.reduce((acc, curr) => acc + (curr.weightage || 0), 0),
        [goalData]
    );

    const submiteAcknowledgeGoals = () => {
        const acceptedTemplates = goalData
            .filter((goal) => (goalStatuses[goal.template] || 'accept') === 'accept')
            .map((goal) => goal.template);

        const payload: GoalsRequest = {
            templates: acceptedTemplates,
        };
        mutateGoals(
            payload,
            {
                onSuccess: () => {
                    toast.success("Mandatory OKRs acknowledged successfully");
                    queryClient.invalidateQueries({
                        queryKey: PERFORMANCE_QUERY_KEYS.mandatoryGoals
                    });
                    onClose(false);
                    navigate("/webapp/performance-app/my-goals")
                },
                onError: (error) => {
                    errorResponseFormater(error, "Failed to acknowledge mandatory OKRs", { showToast: true });
                }
            }
        );
    };

    return (
        <div className="flex w-full max-w-full flex-col overflow-hidden bg-white">
            {/* Header */}
            <div className="relative z-30 shrink-0 border-b border-gray-100 bg-white px-4 py-2.5 sm:px-5 sm:py-4">
                <div className="flex flex-col gap-0.5 mb-1 pr-11 sm:flex-row sm:items-center sm:gap-2 sm:pr-0">
                    <span className="shrink-0 bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-md tracking-wider w-fit">
                        {goalData.length} MANDATORY OKRs ASSIGNED {totalWeightage > 0 ? `(${totalWeightage}%)` : ''}
                    </span>
                    <span className="truncate text-gray-400 text-xs">{text}</span>
                </div>
                <Typography variant="h4" className="pr-11 text-base font-semibold leading-tight text-gray-900 sm:pr-0 sm:mt-1 sm:text-2xl">
                    Acknowledge Mandatory OKRs
                </Typography>
                <Typography variant="caption" className="text-gray-500 mt-0.5 text-[12px] leading-4 sm:text-xs sm:leading-normal">
                    Review each OKR before proceeding.
                </Typography>

                <button
                    type="button"
                    disabled={isPending}
                    className="absolute right-3 top-2 flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-700 sm:right-4 sm:top-4"
                    onClick={() => onClose(false)}
                    aria-label="Close acknowledgment popup"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* OKR Cards */}
            <div className="px-4 py-4 sm:px-5 min-h-[140px] max-h-[360px] overflow-y-auto">
                {goalData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400 gap-2">
                        <CheckCircle className="w-8 h-8 text-gray-300" />
                        <span className="text-sm">No mandatory OKRs assigned at this time.</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 sm:gap-4">
                        {goalData.map((okr: Templates, index: number) => {
                            const colorConfig = getWeightageColor(okr?.weightage, index);
                            const currentStatus = goalStatuses[okr.template] || 'accept';
                            return (
                                <div
                                    key={`${okr.template}-${index}`}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-all duration-200 hover:border-gray-300 hover:shadow-sm"
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

                                    {/* Accept / Reject Buttons */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            type="button"
                                            aria-pressed={currentStatus === 'accept'}
                                            onClick={() => handleStatusChange(okr.template, 'accept')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                                currentStatus === 'accept'
                                                    ? 'bg-emerald-600 text-white shadow-sm'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            Accept
                                        </button>
                                        <button
                                            area-pressed={currentStatus === 'reject'}
                                            type="button"
                                            onClick={() => handleStatusChange(okr.template, 'reject')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                                currentStatus === 'reject'
                                                    ? 'bg-red-600 text-white shadow-sm'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="shrink-0 flex flex-col gap-3 border-t border-gray-100 bg-blue-50/50 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:items-center sm:justify-end sm:px-5 sm:py-4">
                <div className="flex w-full gap-2 sm:w-auto">
                    <Button
                        type="button"
                        variant="outline"
                        bgColor="text"
                        disabled={(goalData.length === 0) || isPending}
                        className="h-10 w-full justify-center rounded-lg border-gray-200 bg-white px-4 text-gray-700 hover:bg-gray-50 sm:h-9 sm:w-auto"
                        onClick={() => onClose(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="contain"
                        bgColor="error"
                        className="h-10 w-full justify-center rounded-lg px-5 text-sm font-semibold sm:h-9 sm:w-auto transition-all duration-150 bg-[#E35D6A] hover:bg-[#cb4f5b] text-white "
                        disabled={(goalData.length === 0) || isPending}
                        onClick={submiteAcknowledgeGoals}
                    >
                        {isPending ? (
                            <span className="flex items-center gap-2">
                                <Loader className="h-4 w-4 animate-spin" />
                                Saving...
                            </span>
                        ) : (
                            "Submit & Continue"
                        )}                    </Button>
                </div>
            </div>
        </div>
    );
};

export default React.memo(AcknowledgmentPopup);