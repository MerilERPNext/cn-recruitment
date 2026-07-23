import React from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import { Typography } from '../../../../shared/atoms/Typography';
import Button from '../../../../shared/atoms/Button';

interface BlankGoalCardProps {
    value: string;
    onChange: (val: string) => void;
    onUse: () => void;
}

const BlankGoalCard = ({ value, onChange, onUse }: BlankGoalCardProps) => {
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 flex-1">
                <div className="flex gap-4 items-start mb-6">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                        <Plus className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <Typography variant="h4" className="mb-1">Start from blank</Typography>
                        <Typography variant="bodyMedium" className="text-gray-500">Write your own OKR from scratch — full creative control.</Typography>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-auto mb-6">
                    <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-700">Used by 18% of PW employees</div>
                        <div className="text-xs text-gray-500">Median time: ~ 4 minutes</div>
                    </div>
                    <Button onClick={onUse} variant="contain" bgColor="primary" className="w-full sm:w-auto justify-center bg-blue-500 hover:bg-blue-600" aria-label="Use start from blank">
                        Use this <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
                <textarea
                    aria-label="Start from blank description"
                    className="min-h-[92px] w-full resize-none rounded-lg border border-gray-100 bg-blue-50 p-4 text-sm leading-6 text-gray-900 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                />
            </div>
        </div>
    );
};

export default React.memo(BlankGoalCard);
