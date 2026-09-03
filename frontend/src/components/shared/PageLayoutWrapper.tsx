import React, { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { Typography } from "./atoms/Typography";

interface PageLayoutWrapperProps {
    title: string;
    subtitle?: string;
    titleSlot?: React.ReactNode;
    steps?: Array<{ label: string; active?: boolean }>;
    footerLeft?: React.ReactNode;
    footerRight?: React.ReactNode;
    resetScrollKey?: string | number;
    children: React.ReactNode;
}

const PageLayoutWrapper: React.FC<PageLayoutWrapperProps> = ({
    title,
    subtitle,
    titleSlot,
    steps,
    footerLeft,
    footerRight,
    resetScrollKey,
    children,
}) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const activeStepIndex = steps?.findIndex((step) => step.active) ?? -1;

    useEffect(() => {
        if (resetScrollKey === undefined) {
            return;
        }

        window.requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        });
    }, [resetScrollKey]); 
       
    return (
        <div className="relative flex-1 flex flex-col min-h-0 bg-app font-sans text-text-title">
            <div className="md:sticky top-0 z-10 shrink-0 bg-card/95 backdrop-blur-md border-b border-border px-6 sm:px-10 py-5 shadow-2xs">
                <div className="max-w-screen mx-auto flex flex-col lg:flex-row md:items-center justify-between gap-6">
                    <div className="text-left w-full lg:min-w-0 lg:flex-1">
                        {titleSlot ? (
                            <Typography variant="h3" className="text-text-title mb-1">
                                {titleSlot}
                            </Typography>
                        ) : (
                            <Typography variant="h3" className="text-text-title mb-1">
                                {title}
                            </Typography>
                        )}
                        {subtitle ? (
                            <Typography variant="bodyMedium" color="body2">
                                {subtitle}
                            </Typography>
                        ) : null}
                    </div>
                    {steps ? (
                        <div className="flex w-full items-center gap-1 overflow-x-auto text-xs font-medium md:gap-2 md:text-sm lg:w-auto lg:flex-none">
                            {steps.map((step, index) => {
                                const isActive = index === activeStepIndex;
                                const isCompleted = activeStepIndex > index;
                                const stepTextClass = isActive
                                    ? "text-primary"
                                    : isCompleted
                                        ? "text-emerald-500"
                                        : "text-text-body2";
                                const circleClass = isActive
                                    ? "bg-primary text-white"
                                    : isCompleted
                                        ? "bg-emerald-500 text-white"
                                        : "bg-slate-500/20 text-text-body2";
                                const connectorClass = activeStepIndex > index + 1 ? "bg-emerald-500" : "bg-border";

                                return (
                                    <React.Fragment key={step.label}>
                                        <div className={`flex shrink-0 items-center ${stepTextClass}`}>
                                            <div className={`mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold md:mr-2 ${circleClass}`}>
                                                {isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
                                            </div>
                                            <span className="whitespace-nowrap">{step.label}</span>
                                        </div>
                                        {index < steps.length - 1 ? <div className={`h-px min-w-4 flex-1 md:w-10 md:flex-none ${connectorClass}`}></div> : null}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    ) : null}
                </div>
            </div>

            <div ref={contentRef} className="flex-1 overflow-y-auto">
                <div className="max-w-screen mx-auto px-4 sm:px-6 py-8">
                    {children}
                </div>
            </div>

            <div className="sticky bottom-0 z-20 shrink-0 bg-card/95 backdrop-blur-md border-t border-border px-4 py-3 sm:px-6 md:py-4 shadow-sm">
                <div className="max-w-5xl mx-auto flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
                    <div className="w-full md:min-w-0 md:flex-1">{footerLeft}</div>
                    <div className="w-full md:w-auto md:flex-none">{footerRight}</div>
                </div>
            </div>
        </div>
    );
};

export default PageLayoutWrapper;
