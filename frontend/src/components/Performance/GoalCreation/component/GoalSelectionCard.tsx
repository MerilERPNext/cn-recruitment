import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Typography } from '../../../shared/atoms/Typography';
import Button from '../../../shared/atoms/Button';

export interface TemplateCardProps {
    containerClass?: string;
    icon: React.ReactNode;
    iconClass?: string;
    title: string;
    badge?: React.ReactNode;
    description: string;
    statPrimary?: string;
    statSecondary?: string;
    onUse?: () => void;
    buttonText?: string;
    buttonClass?: string;
    ariaLabel?: string;
    children?: React.ReactNode;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
    containerClass = "bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col",
    icon,
    iconClass = "w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0",
    title,
    badge,
    description,
    statPrimary,
    statSecondary,
    onUse,
    buttonText = "Use this",
    buttonClass = "bg-primary hover:bg-primary/90 text-white",
    ariaLabel,
    children,
}) => {
    return (
        <div className={containerClass}>
            <div className="p-4 sm:p-6 flex-1 flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className={iconClass}>{icon}</div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <Typography className="text-[15px] font-semibold text-text-title">{title}</Typography>
                                {badge}
                            </div>
                            <Typography className="text-[13px] leading-5 text-text-body2">{description}</Typography>
                        </div>
                    </div>
                    {onUse && (
                        <Button
                            variant="contain"
                            className={`h-9 w-full sm:w-auto justify-center whitespace-nowrap rounded-lg px-4 text-sm font-medium cursor-pointer ${buttonClass}`}
                            onClick={onUse}
                            aria-label={ariaLabel}
                        >
                            {buttonText} <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 text-[11px] text-text-body2 mt-3 sm:mt-4">
                    {statPrimary && <span>{statPrimary}</span>}
                    {statSecondary && <span>{statSecondary}</span>}
                </div>
                {children}
            </div>
        </div>
    );
};

export const TemplateCardsSkeleton: React.FC = () => {
    return (
        <>
            {[1, 2].map((i) => (
                <div key={i} className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-6 animate-pulse flex flex-col justify-between min-h-[220px]">
                    <div>
                        <div className="flex gap-4 items-start mb-6">
                            <div className="w-12 h-12 rounded-xl bg-slate-500/20 shrink-0"></div>
                            <div className="min-w-0 flex-1 space-y-2">
                                <div className="h-5 w-40 bg-slate-500/30 rounded"></div>
                                <div className="h-4 w-3/4 bg-slate-500/20 rounded"></div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center mb-6">
                            <div className="space-y-1">
                                <div className="h-4 w-32 bg-slate-500/30 rounded"></div>
                                <div className="h-3 w-24 bg-slate-500/20 rounded"></div>
                            </div>
                            <div className="h-9 w-24 bg-slate-500/30 rounded-lg"></div>
                        </div>
                    </div>
                    <div className="h-16 w-full bg-slate-500/20 rounded-lg"></div>
                </div>
            ))}
        </>
    );
};

export default TemplateCard;
