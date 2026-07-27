import React from 'react';
import { Check, Plus } from 'lucide-react';
import Button from '../../../shared/atoms/Button';
import { Typography } from '../../../shared/atoms/Typography';

export interface GoalItemCardData {
    id: string;
    title: string;
    scope?: string;
    department?: string;
    cycle?: string;
    isManager?: boolean;
    ownerName?: string;
    ownerRole?: string;
    usedCount?: number;
}

export interface GoalItemCardProps {
    goal: GoalItemCardData;
    index: number;
    isSelected?: boolean;
    onToggleSelect?: (goal: any) => void;
    addBtnLabel?: string;
    addedBtnLabel?: string;
    className?: string;
}

const GoalItemCard: React.FC<GoalItemCardProps> = ({
    goal,
    index,
    isSelected = false,
    onToggleSelect,
    addBtnLabel = "Add Goal",
    addedBtnLabel = "Added",
    className = "",
}) => {
    return (
        <div
            key={goal.id}
            className={`group relative flex flex-col justify-between gap-5 rounded-2xl border p-5 transition-all duration-200 sm:flex-row sm:items-center sm:p-6 ${
                isSelected
                    ? 'border-indigo-300 bg-indigo-50/40 shadow-sm'
                    : 'border-gray-200/80 bg-white hover:border-indigo-200 hover:shadow-sm'
            } ${className}`}
        >
            <div className="flex items-start gap-4 min-w-0 flex-1">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700 shadow-2xs">
                    {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        {goal.isManager ? (
                            <span className="rounded-md bg-amber-100 border border-amber-200/80 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                                Manager Parent Goal
                            </span>
                        ) : goal.scope ? (
                            <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                                {goal.scope}
                            </span>
                        ) : null}

                        {goal.department && (
                            <span className="rounded-md bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                                {goal.department}
                            </span>
                        )}

                        {goal.cycle && (
                            <span className="text-xs text-gray-400">· {goal.cycle}</span>
                        )}
                    </div>

                    <Typography variant="bodyMedium" className="text-base font-semibold leading-relaxed text-gray-900">
                        {goal.title}
                    </Typography>

                    {(goal.ownerName || goal.usedCount !== undefined) && (
                        <Typography variant="caption" className="mt-1.5 block text-xs text-gray-500">
                            {goal.ownerName && (
                                <span className="font-medium text-gray-700">{goal.ownerName}</span>
                            )}
                            {goal.ownerRole && ` (${goal.ownerRole})`}
                            {goal.usedCount !== undefined && ` · Used by ${goal.usedCount} team members`}
                        </Typography>
                    )}
                </div>
            </div>

            {onToggleSelect && (
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <Button
                        type="button"
                        variant={isSelected ? "contain" : "outline"}
                        bgColor={isSelected ? "primary" : "text"}
                        className={`h-9 rounded-xl px-4 text-xs font-semibold transition-all ${
                            isSelected
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/50'
                        }`}
                        onClick={() => onToggleSelect(goal)}
                    >
                        {isSelected ? (
                            <>
                                <Check className="mr-1.5 h-3.5 w-3.5" /> {addedBtnLabel}
                            </>
                        ) : (
                            <>
                                <Plus className="mr-1.5 h-3.5 w-3.5 text-indigo-600" /> {addBtnLabel}
                            </>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default GoalItemCard;
