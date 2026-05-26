import React, { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { Typography } from "./atoms/Typography";

interface PageLayoutWrapperProps {
    title: string;
    subtitle?: string;
    steps?: Array<{ label: string; active?: boolean }>;
    footerLeft?: React.ReactNode;
    footerRight?: React.ReactNode;
    resetScrollKey?: string | number;
    children: React.ReactNode;
}

const PageLayoutWrapper: React.FC<PageLayoutWrapperProps> = ({
    title,
    subtitle,
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
        <div className="min-h-screen bg-[#f8fafc] font-sans flex flex-col">
            <div className="bg-white border-b border-gray-200 px-6 sm:px-10 py-5">
                <div className="max-w-screen mx-auto flex flex-col lg:flex-row md:items-center justify-between gap-6">
                    <div>
                        <Typography variant="h3" className="text-gray-900 mb-1">
                            {title}
                        </Typography>
                        {subtitle ? (
                            <Typography variant="bodyMedium" className="text-gray-500">
                                {subtitle}
                            </Typography>
                        ) : null}
                    </div>
                    {steps ? (
                        <div className="flex w-full items-center gap-1 text-xs font-medium md:w-auto md:gap-2 md:overflow-x-auto md:text-sm">
                            {steps.map((step, index) => {
                                const isActive = index === activeStepIndex;
                                const isCompleted = activeStepIndex > index;
                                const stepTextClass = isActive
                                    ? "text-blue-600"
                                    : isCompleted
                                        ? "text-green-600"
                                        : "text-gray-400";
                                const circleClass = isActive
                                    ? "bg-blue-600 text-white"
                                    : isCompleted
                                        ? "bg-green-500 text-white"
                                        : "bg-gray-100 text-gray-400";
                                const connectorClass = activeStepIndex > index + 1 ? "bg-green-500" : "bg-gray-300";

                                return (
                                    <React.Fragment key={step.label}>
                                        <div className={`flex min-w-0 shrink items-center md:shrink-1 ${stepTextClass}`}>
                                            <div className={`mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold md:mr-2 ${circleClass}`}>
                                                {isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
                                            </div>
                                            <span className="truncate">{step.label}</span>
                                        </div>
                                        {index < steps.length - 1 ? <div className={`h-px min-w-4 flex-1 md:w-10 md:flex-none ${connectorClass}`}></div> : null}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    ) : null}
                </div>
            </div>

            <div ref={contentRef} className="flex-1 overflow-y-auto ">
                <div className="max-w-screen mx-auto px-4 sm:px-6 py-8">
                    {children}
                </div>
            </div>

            <div className="md:sticky bottom-0 left-0 right-0 z-10 flex flex-col gap-2 border-t border-gray-200 bg-white px-6 py-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:flex-row md:items-center md:justify-between">
                <div className="w-full md:min-w-0 md:flex-1">{footerLeft}</div>
                <div className="w-full md:w-auto md:flex-none">{footerRight}</div>
            </div>
        </div>
    );
};

export default PageLayoutWrapper;
