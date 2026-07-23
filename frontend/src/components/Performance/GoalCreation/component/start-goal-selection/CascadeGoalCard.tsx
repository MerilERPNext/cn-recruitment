import React from 'react';
import { GitMerge } from 'lucide-react';
import { Typography } from '../../../../shared/atoms/Typography';
import Button from '../../../../shared/atoms/Button';

interface CascadeGoalCardProps {
    onUse: () => void;
}

const CascadeGoalCard = ({ onUse }: CascadeGoalCardProps) => {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="rounded-xl bg-indigo-50 p-2 text-indigo-500">
                            <GitMerge className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                            <Typography className="text-[15px] font-semibold text-slate-900">
                                Cascade from Manager
                            </Typography>

                            <Typography className="mt-1 text-[13px] leading-5 text-slate-500">
                                Inherit a sub-OKR from one of Rohit Khanna’s 4 active goals.
                            </Typography>
                        </div>
                    </div>

                    <Button
                        onClick={onUse}
                        variant="contain"
                        bgColor="primary"
                        className="h-9 w-full sm:w-auto justify-center whitespace-nowrap rounded-lg bg-indigo-500 px-4 text-sm font-medium text-white hover:bg-indigo-600"
                    >
                        Use this
                    </Button>
                </div>

                <div className="mt-4 text-[11px] text-slate-400">
                    Arithmetic cascading · 4 parents available
                </div>

                <div className="mt-1 text-[11px] text-slate-400">
                    Median time: ~ 2 minutes
                </div>

                <div className="mt-4 space-y-2">
                    <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                        <span className="min-w-0 text-[12px] text-slate-700">
                            Ship Design System v2 across 6 product surfaces
                        </span>

                        <span className="shrink-0 text-[12px] font-medium text-indigo-500">
                            25%
                        </span>
                    </div>

                    <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                        <span className="min-w-0 text-[12px] text-slate-700">
                            Reduce design-eng handoff time by 50%
                        </span>

                        <span className="shrink-0 text-[12px] font-medium text-indigo-500">
                            20%
                        </span>
                    </div>

                    <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                        <span className="min-w-0 text-[12px] text-slate-700">
                            Hit team NPS 75+ from design partners
                        </span>

                        <span className="shrink-0 text-[12px] font-medium text-indigo-500">
                            15%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(CascadeGoalCard);
