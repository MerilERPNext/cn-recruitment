import React, { useRef, useState } from "react";
import DOMPurify from "dompurify";
import { Award } from "../../types/employee";
import ContextualPopup from "../shared/molecules/ContextualPopup";
import { useCurrentEmployeeAllDetails, useGetEmployeeEarnedAppreciations } from "../../hooks/useEmployee";
import { useTargetUser } from "../../context/ViewedUserContext";
import useCurrentUser from "../../hooks/useCurrentUser";
import Modal from "../shared/Modal";
import { Typography } from "../shared/atoms/Typography";
import Button from "../shared/atoms/Button";
import formatToIndianDate from "../../utils/formatToIndianDate";
import { Card } from "../shared/atoms/Card";
import { Award as AwardIcon } from "lucide-react";

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
                        alt={award.badge_name}
                        className="relative z-10 w-14 h-14 object-cover"
                    />
                ) : (
                    <span className="relative z-10 text-2xl drop-shadow-sm">🏆</span>
                )}
            </div>
            <span className="text-[10px] font-semibold text-gray-700 truncate w-full text-center leading-tight px-1">
                {award.badge_name}
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
                                {award.badge_name}
                            </p>
                            <p className="text-[11px] text-blue-700 font-bold tracking-wider uppercase bg-blue-50 px-2 py-0.5 rounded-md inline-block">
                                {award.recognition_type}
                            </p>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="text-sm text-gray-700 leading-relaxed max-h-[180px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent">
                        {award.reason ? (
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(award.reason),
                                }}
                                className="prose prose-sm prose-blue max-w-none"
                            />
                        ) : (
                            <span className="italic text-gray-400 text-xs">
                                No reason available
                            </span>
                        )}
                    </div>

                    {/* Footer Details */}
                    <div className="pt-3 border-t border-gray-200 flex flex-col gap-2 text-xs">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 font-medium">
                                Awarded On
                            </span>
                            <span className="font-bold px-2 py-1 rounded-md">
                                {formatToIndianDate(award.awarded_at)}
                            </span>
                        </div>
                        {award.period_start_date && award.period_end_date && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 font-medium">Award Dates</span>
                                <span className="font-semibold text-gray-700 text-[11px]">
                                    {formatToIndianDate(award.period_start_date)} → {formatToIndianDate(award.period_end_date)}
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
    mobileClass?: string;
}


export const AwardsSection: React.FC<AwardsSectionProps> = ({ isDesktop, mobileClass = "mt-6 pt-6" }) => {
    const { targetEmployeeId } = useTargetUser();
    const [showAllModal, setShowAllModal] = useState(false);

    const { data: currentUser } = useCurrentUser();
    const { data: currentEmployee } = useCurrentEmployeeAllDetails(
        currentUser?.name || ""
    );

    const employee = targetEmployeeId || currentEmployee?.name;
    const { data: employeeAppreciations } =
        useGetEmployeeEarnedAppreciations(employee || "");

    const awards = employeeAppreciations?.badges || [];
    const hasAwards = awards.length > 0;

    const displayedAwards = awards.slice(0, 5);
    const remainingCount = awards.length - 4;

    if (!hasAwards) {
        if (isDesktop) {
            return (
                <div className="pt-3 w-1/2 h-full p-2 bg-white rounded-md">
                    <h2 className="text-lg font-bold text-gray-900 mb-3">
                        Appreciations
                    </h2>

                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 mb-4">
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
            <div className={`w-full ${mobileClass}   border-gray-200 px-6`}>
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

    const renderAwardsGrid = () => (
        <div className="flex gap-2 flex-wrap">
            {displayedAwards.map((award: Award) => (
                <AwardBadge key={award.name} award={award} />
            ))}
            {remainingCount > 0 && (
                <div
                    onClick={() => setShowAllModal(true)}
                    className="flex flex-col items-center gap-2 cursor-pointer group"
                >
                    <div className="w-14 h-14 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center shadow-sm transition-all duration-300 group-hover:bg-blue-200 group-hover:border-blue-300">
                        <span className="text-blue-700 font-bold text-sm">+{remainingCount}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-blue-600">View All</span>
                </div>
            )}
        </div>
    );

    const renderAllAwardsModal = () => (
        <Modal
            isOpen={showAllModal}
            onClose={() => setShowAllModal(false)}
            size={isDesktop ? "md" : "full"}
            className={isDesktop ? "p-6" : "p-4"}
        >
            <div className={`flex flex-col h-full min-h-[50vh] ${isDesktop ? "max-h-[80vh]" : ""}`}>
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                    <div>
                        <Typography variant="h3" className="text-gray-900 font-bold">
                            All Appreciations
                        </Typography>
                        <p className="text-sm text-gray-500 mt-1">
                            A showcase of all milestones and recognitions earned.
                        </p>
                    </div>
                    <Button
                        variant="subtle"
                        onClick={() => setShowAllModal(false)}
                        className="!p-2 hover:bg-gray-100 rounded-full"
                    >
                        ✕
                    </Button>
                </div>

                <div className="overflow-y-auto flex-1 pr-2 scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent">
                    <div className="flex flex-wrap gap-x-4 gap-y-8 py-4 justify-items-start">
                        {awards.map((award: Award) => (
                            <AwardBadge key={award.name} award={award} />
                        ))}
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                    <Button variant="contain" onClick={() => setShowAllModal(false)}>
                        Close
                    </Button>
                </div>
            </div>
        </Modal>
    );

    if (isDesktop) {
        return (
            <Card shadow="none" className="h-full w-1/2 p-6 flex flex-col">
                <Typography variant="h4" className="font-bold text-gray-900 mb-2 flex gap-2 items-center">
                    <AwardIcon className="text-primary" size={18} />
                    <span>
                        Appreciations
                    </span>
                </Typography>

                <div className="flex-1 p-4 rounded-2xl">
                    {renderAwardsGrid()}
                </div>
                {renderAllAwardsModal()}
            </Card>
        );
    }

    return (
        <div className="w-full border-t border-gray-100 mt-8 pt-8 px-6">
            <Typography variant="h4" className="font-bold text-gray-900 mb-4">
                Appreciations
            </Typography>

            <div className="flex gap-4 overflow-x-auto py-2 scrollbar-hide">
                {displayedAwards.map((award: Award) => (
                    <AwardBadge key={award.name} award={award} />
                ))}
                {remainingCount > 0 && (
                    <div
                        onClick={() => setShowAllModal(true)}
                        className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group"
                    >
                        <div className="w-14 h-14 rounded-full bg-blue-50 border-2 border-primary-100 flex items-center justify-center shadow-sm transition-all duration-300 group-hover:bg-primary-50 group-hover:border-primary-200">
                            <span className="text-primary-600 font-bold text-sm">+{remainingCount}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-primary-500">View All</span>
                    </div>
                )}
            </div>
            {renderAllAwardsModal()}
        </div>
    );
};

