import React, { useRef, useState } from "react";
import DOMPurify from "dompurify";
import { Award } from "../../types/employee";
import ContextualPopup from "../shared/molecules/ContextualPopup";
import { useCurrentEmployeeAllDetails, useGetEmployeeEarnedAppreciations } from "../../hooks/useEmployee";
import { useTargetUser } from "../../context/ViewedUserContext";
import useCurrentUser from "../../hooks/useCurrentUser";

export const AwardBadge: React.FC<{ award: Award }> = ({ award }) => {

    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);

    return (
        <div className="group flex flex-col items-center gap-2 min-w-[48px] relative">
            <div
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-14 h-14 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200/60 flex items-center justify-center shadow-sm cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-blue-300 overflow-hidden"
            >
                {award.icon ? (
                    <img
                        src={award.icon}
                        alt={award.award_name}
                        className="relative z-10 w-14 h-14 object-cover"
                    />
                ) : (
                    <span className="relative z-10 text-2xl drop-shadow-sm">🏆</span>
                )}
            </div>
            <span className="text-[10px] font-semibold text-gray-700 truncate w-full text-center leading-tight px-1">
                {award.award_name}
            </span>

            <ContextualPopup
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                triggerRef={triggerRef}
                className="!min-w-[280px] !max-w-[320px] p-5 !rounded-2xl !border-blue-200 !shadow-2xl !bg-white backdrop-blur-sm"
            >
                <div className="flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex items-start gap-3 pb-3 border-b border-gray-200">
                        <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shadow-sm flex-shrink-0">
                            {award.icon ? (
                                <img
                                    src={award.icon}
                                    alt="appreciation-badge"
                                    className="relative z-10 w-14 h-14 object-cover drop-shadow-sm"
                                />
                            ) : (
                                <span className="relative z-10 text-2xl drop-shadow-sm">🏆</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 leading-tight text-base mb-1">
                                {award.award_name}
                            </p>
                            <p className="text-[11px] text-blue-700 font-bold tracking-wider uppercase bg-blue-50 px-2 py-0.5 rounded-md inline-block">
                                {award.award_category}
                            </p>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="text-sm text-gray-700 leading-relaxed max-h-[180px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent">
                        {award.description ? (
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(award.description),
                                }}
                                className="prose prose-sm prose-blue max-w-none"
                            />
                        ) : (
                            <span className="italic text-gray-400 text-xs">
                                No description available
                            </span>
                        )}
                    </div>

                    {/* Footer Details */}
                    <div className="pt-3 border-t border-gray-200 flex flex-col gap-2 text-xs">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 font-medium">
                                Recognition Period
                            </span>
                            <span className="font-bold text-gray-800 bg-blue-50 px-2 py-1 rounded-md">
                                {award.award_period}
                            </span>
                        </div>
                        {award.period_start_date && award.period_end_date && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 font-medium">Award Dates</span>
                                <span className="font-semibold text-gray-700 text-[11px]">
                                    {award.period_start_date} → {award.period_end_date}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </ContextualPopup>
        </div>
    );
};

interface AwardsSectionProps {
    isDesktop: boolean;
}


export const AwardsSection: React.FC<AwardsSectionProps> = ({ isDesktop }) => {
    const { targetEmployeeId } = useTargetUser();

    const { data: currentUser } = useCurrentUser();
    const { data: currentEmployee } = useCurrentEmployeeAllDetails(
        currentUser?.name || ""
    );

    const employee = targetEmployeeId || currentEmployee?.name;
    const { data: employeeAppreciations } =
        useGetEmployeeEarnedAppreciations(employee || "");

    const awards = employeeAppreciations?.badges || [];
    const hasAwards = awards.length > 0;

    if (!hasAwards) {
        if (isDesktop) {
            return (
                <div className="border-l border-gray-200 pl-8 pt-3 w-1/2 h-full p-2">
                    <h2 className="text-lg font-bold text-gray-900 mb-3">
                        Appreciations
                    </h2>

                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                            <span className="text-2xl opacity-40">🏆</span>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-700">
                                No awards yet
                            </p>
                            <p className="text-xs text-gray-400">
                                Recognition waiting to happen...
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="w-full border-t border-gray-200 mt-6 pt-6 px-6">
                <h2 className="text-base font-bold text-gray-900 mb-4">
                    Appreciations
                </h2>

                <div className="flex flex-col items-center justify-center py-8 px-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                        <span className="text-3xl opacity-40">🏆</span>
                    </div>
                    <p className="text-sm text-gray-600 font-medium">
                        No awards yet
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        Recognition coming soon!
                    </p>
                </div>
            </div>
        );
    }

    if (isDesktop) {
        return (
            <div className="border-l border-gray-200 pl-8 pt-3 w-1/2 h-full p-2">
                <h2 className="text-lg font-bold text-gray-900 mb-3">
                    Appreciations
                </h2>

                <div className="p-2 bg-gray-50 rounded-2xl border border-gray-200">
                    <div className="flex gap-2 flex-wrap">
                        {awards.map((award: Award) => (
                            <AwardBadge key={award.name} award={award} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full border-t border-gray-200 mt-6 pt-6 px-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">
                Appreciations
            </h2>

            <div className="flex gap-5 overflow-x-auto py-3 scrollbar-hide">
                {awards.map((award: Award) => (
                    <AwardBadge key={award.name} award={award} />
                ))}
            </div>
        </div>
    );
};

