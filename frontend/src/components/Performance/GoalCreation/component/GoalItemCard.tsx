import React from 'react';
import { Check, Plus } from 'lucide-react';
import Button from '../../../shared/atoms/Button';
import { Typography } from '../../../shared/atoms/Typography';
import { CascadeGoal, Goal } from '../../../../types/goal';

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
    goal: CascadeGoal;
    index: number;
    isSelected?: boolean;
    onToggleSelect?: (goal: Goal | CascadeGoal) => void;
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
            key={goal.goal}
            className={`group relative flex flex-col justify-between gap-5 rounded-2xl border p-5 transition-all duration-200 sm:flex-row sm:items-center sm:p-6 ${
                isSelected
                    ? 'border-primary bg-primary/20 shadow-sm ring-1 ring-primary/30'
                    : 'border-border bg-card hover:border-primary/50 hover:shadow-sm'
            } ${className}`}
        >
            <div className="flex items-start gap-4 min-w-0 flex-1">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/20 border border-primary/30 text-xs font-bold text-primary shadow-2xs">
                    {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        {goal?.is_manager_goal && (
                            <span className="rounded-md bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-xs font-bold text-amber-400">
                                Manager Parent Goal
                            </span>
                        )}

                        {goal?.department && (
                            <span className="rounded-md bg-primary/20 border border-primary/30 px-2.5 py-0.5 text-xs font-medium text-primary">
                                {goal.department}
                            </span>
                        )}

                        {goal?.performance_cycle && (
                            <span className="text-xs text-text-body2">· {goal.performance_cycle}</span>
                        )}
                    </div>

                    <Typography variant="bodyMedium" className="text-base font-semibold leading-relaxed text-text-title">
                        {goal.title}
                    </Typography>

                    {(goal.owner_name || goal.used_by_count !== undefined) && (
                        <Typography variant="caption" className="mt-1.5 block text-xs text-text-body2">
                            {goal.owner_name && (
                                <span className="font-medium text-text-title">{goal.owner_name}</span>
                            )}

                            {goal.used_by_count !== undefined && ` · Used by ${goal.used_by_count} team members`}
                        </Typography>
                    )}
                </div>
            </div>

            {onToggleSelect && (
                <div className="flex mx-auto w-full md:w-auto items-center gap-3 shrink-0 self-end sm:self-center">
                    <Button
                        type="button"
                        variant={isSelected ? "contain" : "outline"}
                        bgColor={isSelected ? "primary" : "text"}
                        className={`h-9 w-full md:w-auto rounded-xl px-4 text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                                ? 'bg-primary text-white hover:bg-primary/90 shadow-xs'
                                : 'border-border bg-card text-text-title hover:bg-slate-500/10 hover:border-primary/50'
                        }`}
                        onClick={() => onToggleSelect(goal)}
                    >
                        {isSelected ? (
                            <span className='flex gap-3 items-center'>
                                <Check className="mr-1.5 h-3.5 w-3.5" />
                                {addedBtnLabel}
                            </span>
                        ) : (
                            <span className='flex gap-3 items-center'>
                                <Plus className="mr-1.5 mx-auto h-3.5 w-3.5 text-indigo-600" />
                                {addBtnLabel}
                            </span>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
};

GoalItemCard.displayName = 'GoalItemCard';

export default React.memo(GoalItemCard);
