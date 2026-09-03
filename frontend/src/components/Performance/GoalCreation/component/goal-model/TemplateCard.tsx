import { memo } from 'react';
import { Check, Plus } from 'lucide-react';
import Button from '../../../../shared/atoms/Button';
import { Typography } from '../../../../shared/atoms/Typography';
import { GoalTemplate } from './types';

interface TemplateCardProps {
    template: GoalTemplate;
    onUseTemplate?: (template: GoalTemplate) => void;
    isSelected?: boolean;
    onToggleSelect?: (template: GoalTemplate) => void;
    hideUseTemplate?: boolean;
    weightage?: number;
    onWeightageChange?: (template: GoalTemplate, weightage: number) => void;
}

const TemplateCard = memo(({
    template,
    onUseTemplate,
    isSelected,
    onToggleSelect,
    hideUseTemplate,
    weightage = 10,
    onWeightageChange,
}: TemplateCardProps) => {
    const goalType = template?.goal_type || 'OKR';
    const deptTitle = template?.department_title || template?.department;
    const krCount = template?.key_results?.length || 0;

    return (
        <div
            className={`group flex min-w-0 flex-col rounded-xl border p-4 transition-shadow duration-200 hover:shadow-md sm:min-h-[148px] ${
                isSelected
                    ? 'border-primary bg-primary/20 ring-1 ring-primary/30 shadow-sm'
                    : template?.recommended
                    ? 'border-amber-500/30 bg-amber-500/10 hover:border-amber-500/50'
                    : 'border-border bg-card hover:border-primary/50'
            }`}
        >
            {/* Header Badges */}
            <div className="mb-2.5 flex min-w-0 items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                            goalType === 'OKR'
                                ? 'bg-primary/20 text-primary border border-primary/30'
                                : goalType === 'MBO'
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                : 'bg-slate-500/20 text-text-title'
                        }`}
                    >
                        {goalType}
                    </span>
                    {deptTitle && (
                        <span className="truncate rounded-md bg-slate-500/20 px-2 py-0.5 text-[11px] font-medium text-text-body2">
                            {deptTitle}
                        </span>
                    )}
                </div>

                {template?.recommended && (
                    <span className="shrink-0 rounded-md bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
                        ★ For you
                    </span>
                )}
            </div>

            {/* Title & Description */}
            <div className="flex-1 min-w-0">
                <Typography
                    variant="bodyMedium"
                    className="line-clamp-2 break-words text-sm font-semibold leading-snug text-text-title group-hover:text-primary transition-colors"
                >
                    {template?.title}
                </Typography>

                {template?.description && (
                    <Typography
                        variant="caption"
                        className="mt-1.5 line-clamp-2 break-words text-xs leading-relaxed text-text-body2 font-normal"
                    >
                        {template?.description}
                    </Typography>
                )}
            </div>

            {/* Footer */}
            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    {template?.usedCount !== undefined && (
                        <Typography variant="caption" className="break-words text-xs font-medium text-text-body2">
                            Used {template?.usedCount} times this cycle
                        </Typography>
                    )}

                    {template?.goal_count !== undefined && (
                        <span className="inline-flex items-center rounded-md bg-slate-500/20 border border-border px-2 py-0.5 text-[11px] font-medium text-text-title">
                            {template.goal_count} Goal{template.goal_count > 1 ? 's' : ''}
                        </span>
                    )}

                    {template?.total_weightage !== undefined && (
                        <span className="inline-flex items-center rounded-md bg-primary/20 border border-primary/30 px-2 py-0.5 text-[11px] font-semibold text-primary">
                            {template.total_weightage}% Weight
                        </span>
                    )}

                    {template?.usedCount === undefined && template?.goal_count === undefined && (
                        <Typography variant="caption" className="break-words text-xs font-medium text-text-body2">
                            {krCount > 0
                                ? `${krCount} Key Result${krCount > 1 ? 's' : ''}`
                                : `Weight: ${template?.weightage ?? 10}%`}
                        </Typography>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {onWeightageChange && (
                        <input
                            type="number"
                            min={0}
                            max={100}
                            value={weightage === 0 ? '' : weightage}
                            onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === '') {
                                    onWeightageChange(template, 0);
                                    return;
                                }
                                const num = Math.floor(Number(raw));
                                if (!isNaN(num)) {
                                    const capped = Math.min(100, Math.max(0, num));
                                    onWeightageChange(template, capped);
                                }
                            }}
                            placeholder="Weight %"
                            className="h-8 w-22 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-text-title outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary placeholder:font-normal placeholder:text-text-body2"
                            aria-label={`Weightage for ${template.title}`}
                        />
                    )}
                    {onToggleSelect && (
                        <Button
                            type="button"
                            variant={isSelected ? 'contain' : 'outline'}
                            bgColor="primary"
                            className={`h-8 min-w-[120px] shrink-0 justify-center rounded-lg px-3 text-xs font-semibold cursor-pointer !transition-none ${
                                isSelected
                                    ? 'bg-primary text-white shadow-xs hover:bg-primary/90'
                                    : 'border-primary/40 bg-card text-primary hover:bg-primary/10'
                            }`}
                            onClick={() => onToggleSelect(template)}
                        >
                            {isSelected ? (
                                <>
                                    <Check className="mr-1 h-3.5 w-3.5" /> Selected
                                </>
                            ) : (
                                <>
                                    <Plus className="mr-1 h-3.5 w-3.5" /> Select
                                </>
                            )}
                        </Button>
                    )}
                    {!hideUseTemplate && (
                        <Button
                            type="button"
                            variant="contain"
                            bgColor="primary"
                            className="h-8 w-full shrink-0 justify-center rounded-lg bg-primary px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-primary/90 cursor-pointer transition-all min-[420px]:w-auto"
                            onClick={() => onUseTemplate?.(template)}
                        >
                            Use template
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
});

TemplateCard.displayName = 'TemplateCard';

export default TemplateCard;
