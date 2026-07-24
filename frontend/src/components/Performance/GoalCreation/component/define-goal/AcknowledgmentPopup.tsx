import React, { SetStateAction, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Typography } from '../../../../shared/atoms/Typography';
import Button from '../../../../shared/atoms/Button';

interface MandatoryOKR {
    id: string;
    title: string;
    weight: string;
    color: 'red' | 'orange' | 'blue';
    status: 'pending' | 'accepted' | 'rejected';
}

const initialOKRs: MandatoryOKR[] = [
    {
        id: 'compliance',
        title: 'Complete FY26 compliance & a11y training',
        weight: '5%',
        color: 'red',
        status: 'pending',
    },
    {
        id: 'dei',
        title: 'Maintain team DEI pulse score ≥ 4.0 / 5',
        weight: '5%',
        color: 'orange',
        status: 'pending',
    },
    {
        id: 'nps',
        title: 'Drive customer-facing NPS ≥ 70 (PW-wide)',
        weight: '10%',
        color: 'blue',
        status: 'pending',
    },
];

const dotColorMap: Record<MandatoryOKR['color'], string> = {
    red: 'bg-red-500',
    orange: 'bg-orange-400',
    blue: 'bg-blue-500',
};

const weightColorMap: Record<MandatoryOKR['color'], string> = {
    red: 'text-red-500',
    orange: 'text-orange-500',
    blue: 'text-blue-500',
};

interface AcknowledgmentProps {
    onClose: (value: SetStateAction<boolean>) => void;
}

const AcknowledgmentPopup: React.FC<AcknowledgmentProps> = ({ onClose }) => {
    const [okrs, setOkrs] = useState<MandatoryOKR[]>(initialOKRs);

    const handleAction = (id: string, action: 'accepted' | 'rejected') => {
        setOkrs((prev) =>
            prev.map((okr) =>
                okr.id === id
                    ? { ...okr, status: okr.status === action ? 'pending' : action }
                    : okr
            )
        );
    };

    const allActioned = okrs.every((o) => o.status !== 'pending');
    const acceptedCount = okrs.filter((o) => o.status === 'accepted').length;

    return (
        <div className="flex w-full max-w-full flex-col overflow-hidden bg-white">

            {/* Header */}
            <div className="relative z-30 shrink-0 border-b border-gray-100 bg-white px-4 py-2.5 sm:px-5 sm:py-4">
                <div className="flex flex-col gap-0.5 mb-1 pr-11 sm:flex-row sm:items-center sm:gap-2 sm:pr-0">
                    <span className="shrink-0 bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-md tracking-wider w-fit">
                        3 MANDATORY OKRs ASSIGNED
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
                    {okrs.map((okr) => (
                        <div
                            key={okr.id}
                            className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-xl border p-4 transition-all duration-200 ${
                                okr.status === 'accepted'
                                    ? 'border-green-200 bg-green-50/40'
                                    : okr.status === 'rejected'
                                    ? 'border-red-200 bg-red-50/40'
                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                            }`}
                        >
                            {/* OKR Info */}
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                                <div
                                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dotColorMap[okr.color]}`}
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
                                        <span className={`text-xs font-semibold ${weightColorMap[okr.color]}`}>
                                            {okr.weight}
                                        </span>
                                        {okr.status !== 'pending' && (
                                            <span
                                                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                                    okr.status === 'accepted'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-600'
                                                }`}
                                            >
                                                {okr.status === 'accepted' ? '✓ Accepted' : '✕ Rejected'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex w-full shrink-0 gap-2 sm:w-auto sm:ml-auto">
                                <Button
                                    type="button"
                                    variant={okr.status === 'accepted' ? 'contain' : 'outline'}
                                    bgColor={okr.status === 'accepted' ? 'success' : 'text'}
                                    className={`h-9 flex-1 sm:flex-none justify-center gap-1.5 rounded-lg px-4 text-sm font-medium transition-all duration-150 ${
                                        okr.status === 'accepted'
                                            ? 'border-green-500 bg-green-500 text-black hover:bg-green-600'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:bg-green-50 hover:text-green-700'
                                    }`}
                                    onClick={() => handleAction(okr.id, 'accepted')}
                                    aria-label={`Accept ${okr.title}`}
                                >
                                    <Check className="h-4 w-4" />
                                    Accept
                                </Button>
                                <Button
                                    type="button"
                                    variant={okr.status === 'rejected' ? 'contain' : 'outline'}
                                    bgColor={okr.status === 'rejected' ? 'error' : 'text'}
                                    className={`h-9 flex-1 sm:flex-none justify-center gap-1.5 rounded-lg px-4 text-sm font-medium transition-all duration-150 ${
                                        okr.status === 'rejected'
                                            ? 'border-red-500 bg-red-500 text-white hover:bg-red-600'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-red-300 hover:bg-red-50 hover:text-red-600'
                                    }`}
                                    onClick={() => handleAction(okr.id, 'rejected')}
                                    aria-label={`Reject ${okr.title}`}
                                >
                                    <X className="h-4 w-4" />
                                    Reject
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 flex flex-col gap-3 border-t border-gray-100 bg-blue-50/50 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
                <Typography variant="caption" className="block break-words leading-relaxed text-gray-500">
                    {allActioned
                        ? `${acceptedCount} of 3 OKRs accepted · Changes saved automatically.`
                        : `${okrs.filter((o) => o.status !== 'pending').length} of 3 actioned — please review all before submitting.`}
                </Typography>

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
                        disabled={!allActioned}
                        className={`h-10 w-full justify-center rounded-lg px-5 text-sm font-semibold sm:h-9 sm:w-auto transition-all duration-150 ${
                            allActioned
                                ? 'bg-[#cd2c41] text-white hover:bg-[#b02235]'
                                : 'cursor-not-allowed bg-gray-200 text-gray-400'
                        }`}
                        onClick={() => {
                            if (allActioned) onClose(false);
                        }}
                    >
                        Submit & Continue
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default React.memo(AcknowledgmentPopup);