import { memo } from 'react';
import Button from '../../../../shared/atoms/Button';
import { Typography } from '../../../../shared/atoms/Typography';
import { GoalTemplate } from './types';

interface TemplateCardProps {
    template: GoalTemplate;
    onUseTemplate?: (template: GoalTemplate) => void;
}

const TemplateCard = memo(({ template, onUseTemplate }: TemplateCardProps) => {
    return (
        <div
            className={`flex min-w-0 flex-col rounded-xl border bg-white p-3 transition hover:border-blue-200 hover:shadow-sm sm:min-h-[132px] sm:p-4 ${
                template.recommended
                    ? 'border-amber-400 bg-amber-50/30'
                    : 'border-gray-200'
            }`}
        >
            <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
                <Typography variant="caption" className="text-gray-500">
                    {template.scope}
                </Typography>
                {template.recommended && (
                    <span className="shrink-0 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        * For you
                    </span>
                )}
            </div>

            <Typography
                variant="bodyMedium"
                className="line-clamp-3 break-words text-sm font-semibold leading-5 text-gray-900 sm:line-clamp-2"
            >
                {template.title}
            </Typography>

            <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between sm:mt-auto">
                <Typography variant="caption" className="break-words text-gray-500">
                    Used {template.usedCount} times this cycle
                </Typography>
                <Button
                    type="button"
                    variant="contain"
                    bgColor="primary"
                    className="h-9 w-full shrink-0 justify-center rounded-md bg-blue-600 px-3 text-xs text-white hover:bg-blue-700 min-[420px]:h-8 min-[420px]:w-auto"
                    onClick={() => onUseTemplate?.(template)}
                >
                    Use template
                </Button>
            </div>
        </div>
    );
});

TemplateCard.displayName = 'TemplateCard';

export default TemplateCard;
