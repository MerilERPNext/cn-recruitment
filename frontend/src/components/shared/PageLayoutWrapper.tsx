import React from "react";
import { Typography } from "./atoms/Typography";

interface PageLayoutWrapperProps {
    title: string;
    subtitle?: string;
    steps?: Array<{ label: string; active?: boolean }>;
    footerLeft?: React.ReactNode;
    footerRight?: React.ReactNode;
    children: React.ReactNode;
}

const PageLayoutWrapper: React.FC<PageLayoutWrapperProps> = ({
    title,
    subtitle,
    steps,
    footerLeft,
    footerRight,
    children,
}) => {
    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans flex flex-col">
            <div className="bg-white border-b border-gray-200 px-6 sm:px-10 py-5">
                <div className="max-w-screen mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
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
                        <div className="flex items-center space-x-2 sm:space-x-4 text-sm font-medium">
                            {steps.map((step, index) => (
                                <React.Fragment key={step.label}>
                                    <div className={`flex items-center ${step.active ? "text-blue-600" : "text-gray-400"}`}>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 ${step.active ? "bg-blue-600 text-white" : "bg-gray-100"}`}>
                                            {index + 1}
                                        </div>
                                        <span>{step.label}</span>
                                    </div>
                                    {index < steps.length - 1 ? <div className="w-8 h-[1px] bg-gray-300"></div> : null}
                                </React.Fragment>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-24">
                <div className="max-w-screen mx-auto px-4 sm:px-6 py-8">
                    {children}
                </div>
            </div>

            <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                <div className="flex-1 min-w-0">{footerLeft}</div>
                <div className="flex items-center gap-4">{footerRight}</div>
            </div>
        </div>
    );
};

export default PageLayoutWrapper;
