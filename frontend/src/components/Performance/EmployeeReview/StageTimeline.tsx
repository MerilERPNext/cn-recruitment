import React from 'react';
import { Check, Circle } from 'lucide-react';
import { ApprovalStage } from '../../../types/goalReviewDetails';

interface StageTimelineProps {
    stages: ApprovalStage[];
    currentStage: number;
}

const StageTimeline: React.FC<StageTimelineProps> = ({ stages }) => {

    return (
        <div className="w-full py-4">
            <div className="flex justify-between items-center mb-4 pb-4 px-2">
                {stages.map((stage, idx) => {
                    const isCompleted = stage.is_completed;
                    const isCurrent = stage.is_current;

                    return (
                        <React.Fragment key={idx}>
                            {/* Stage Node */}
                            <div className='flex flex-col relative items-center group'>
                                <div className="relative flex items-center justify-center">
                                    {/* Pulse Wave Animation (Outer Ring Effect) - Only for current */}
                                    {isCurrent && (
                                        <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping" />
                                    )}

                                    {/* Main Circle Container */}
                                    <div
                                        className={`
                                            relative rounded-full shrink-0 w-10 h-10 flex items-center justify-center border-2 transition-all duration-500 ease-in-out z-10
                                            ${isCompleted
                                                ? "bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-200 scale-105"
                                                : isCurrent
                                                    ? "bg-blue-600 border-blue-600 shadow-xl shadow-blue-300 ring-4 ring-blue-100 scale-110"
                                                    : "bg-white border-gray-300 text-gray-300"
                                            }
                                        `}
                                    >
                                        {isCompleted ? (
                                            <Check className="w-5 h-5 text-white stroke-[3]" />
                                        ) : isCurrent ? (
                                            /* Filled White Circle Icon to contrast with Blue Background */
                                            <Circle className="w-3 h-3 text-white fill-white" />
                                        ) : (
                                            <Circle className="w-5 h-5 text-gray-300 fill-gray-50" />
                                        )}
                                    </div>
                                </div>

                                {/* Label */}
                                <p
                                    className={`
                                        absolute top-full mt-3 text-nowrap left-1/2 -translate-x-1/2 text-sm transition-all duration-300
                                        ${isCompleted
                                            ? "font-bold text-emerald-700"
                                            : isCurrent
                                                ? "font-bold text-blue-700 scale-105"
                                                : "font-medium text-gray-400"
                                        }
                                    `}
                                >
                                    {stage.stage_name}
                                </p>
                            </div>

                            {/* Connector Line */}
                            {idx !== stages.length - 1 && (
                                <div className="flex-grow mx-2 relative h-1 rounded-full bg-gray-200 overflow-hidden">
                                    <div
                                        className={`
                                            absolute top-0 left-0 h-full w-full transition-all duration-700 ease-out origin-left
                                            ${isCompleted ? "bg-emerald-500 scale-x-100" : "bg-gray-200 scale-x-0"}
                                        `}
                                    />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default StageTimeline;