import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Typography } from '../../../../shared/atoms/Typography';

interface AiSuggestionCardProps {
    onUse: () => void;
}

const AiSuggestionCard = ({ onUse }: AiSuggestionCardProps) => {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-amber-300 bg-[#FFFCF4] shadow-sm">
            <div className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 rounded-xl bg-amber-100 p-2 text-amber-500">
                            <Sparkles className="w-4 h-4" />
                        </div>

                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <Typography className="text-[15px] font-semibold text-slate-900">
                                    AI Suggestion (Marissa™)
                                </Typography>

                                <span className="rounded-md bg-amber-400 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-slate-900">
                                    Recommended
                                </span>
                            </div>

                            <Typography className="text-[13px] leading-5 text-slate-500 max-w-[420px]">
                                Marissa proposes an OKR based on your role, last cycle,
                                and recent check-ins.
                            </Typography>
                        </div>
                    </div>

                    <button
                        onClick={onUse}
                        className="h-9 w-full sm:w-auto rounded-lg flex justify-center items-center gap-2 bg-amber-400 px-4 text-sm font-medium text-slate-900 "
                        aria-label="Use AI suggested goal"
                    >
                        Use this
                        <ArrowRight className="ml-1 h-4 w-4" />
                    </button>
                </div>

                <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 text-[11px] text-slate-400">
                    <span>Beta · 84% acceptance rate</span>
                    <span>Median time: ~ 60 seconds</span>
                </div>

                <div className="mt-4 rounded-xl border border-dashed border-amber-300 bg-[#FFF8E8] px-4 py-3">
                    <Typography className="text-[13px] italic leading-6 text-slate-700">
                        ✨ Marissa™ would suggest:
                    </Typography>

                    <Typography className="mt-1 text-[13px] leading-6 text-slate-700">
                        “Ship Oxygen 2.0 dashboard to 100% of PW employees by Q4
                        with WAU ≥ 80%, NPS ≥ 65, and accessibility audit complete.”
                    </Typography>
                </div>
            </div>
        </div>
    );
};

export default React.memo(AiSuggestionCard);
