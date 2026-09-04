import React, { useRef, useState } from "react";
import DOMPurify from "dompurify";
import { Award } from "../../types/employee";
import ContextualPopup from "../shared/molecules/ContextualPopup";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import {
    useAppreciationPrograms,
    AppreciationApiItem,
} from "../../services/recognitionService";
import { useTargetUser } from "../../context/ViewedUserContext";
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
        <div className="group flex flex-col items-center gap-1.5 w-20 relative">
            <div
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shadow-sm cursor-pointer transition-all duration-300 hover:shadow-md hover:border-primary/50 hover:bg-primary/20 overflow-hidden shrink-0"
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
            <span className="text-[11px] font-medium text-text-title line-clamp-2 text-center leading-snug w-full px-0.5 break-words">
                {award.badge_name}
            </span>

            <ContextualPopup
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                triggerRef={triggerRef}
                className="!min-w-[280px] !max-w-[320px] p-5 !rounded-2xl !border-border-strong !shadow-2xl !bg-raised backdrop-blur-sm"
            >
                <div className="flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex items-start gap-3 pb-3 border-b border-border">
                        <div className="relative w-14 h-14 rounded-full overflow-hidden bg-primary/10 border border-primary/20 flex items-center justify-center shadow-sm flex-shrink-0">
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
                            <p className="font-bold text-text-title leading-tight text-base mb-1">
                                {award.badge_name}
                            </p>
                            <p className="text-[11px] text-text-link font-bold tracking-wider uppercase bg-primary/10 px-2 py-0.5 rounded-md inline-block">
                                {award.recognition_type}
                            </p>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="text-sm text-text-body1 leading-relaxed max-h-[180px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                        {award.reason ? (
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(award.reason),
                                }}
                                className="prose prose-sm max-w-none text-text-body1"
                            />
                        ) : (
                            <span className="italic text-text-disabled text-xs">
                                No reason available
                            </span>
                        )}
                    </div>

                    {/* Footer Details */}
                    <div className="pt-3 border-t border-border flex flex-col gap-2 text-xs">
                        <div className="flex justify-between items-center">
                            <span className="text-text-body2 font-medium">
                                Awarded On
                            </span>
                            <span className="font-bold px-2 py-1 rounded-md text-text-title">
                                {formatToIndianDate(award.awarded_at)}
                            </span>
                        </div>
                        {award.period_start_date && award.period_end_date && (
                            <div className="flex justify-between items-center">
                                <span className="text-text-body2 font-medium">Award Dates</span>
                                <span className="font-semibold text-text-body1 text-[11px]">
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

    const { data: currentEmployee } = useCurrentEmployeeDetails({ logged_in_employee_details: true });

    const employee = targetEmployeeId || currentEmployee?.employee || currentEmployee?.name;

    // Use the SAME data source as the "My Appreciations History" tab so the
    // profile card and the history page always stay in sync. We only need the
    // "received" appreciations here (the recognitions this employee earned).
    const { data: appreciationsResponse } = useAppreciationPrograms({
        employee: employee || "",
        direction: "received",
        start: 0,
        page_length: 100,
    });

    // Map the appreciation rows into the `Award` shape that `AwardBadge`
    // renders (title → badge_name, logo → icon, message → reason, date →
    // awarded_at). Keeps the badge UI untouched.
    const awards: Award[] = (appreciationsResponse?.data ?? []).map(
        (it: AppreciationApiItem) =>
            ({
                name: it.name,
                badge_name: it.title,
                icon: it.logo,
                recognition_type: "Appreciation",
                reason: it.message || it.value || "",
                awarded_at: it.date,
            }) as Award,
    );
    const hasAwards = awards.length > 0;
    const hasOverflow = awards.length > 4;
    const displayedAwards = hasOverflow ? awards.slice(0, 3) : awards.slice(0, 4);
    const remainingCount = awards.length - 3;

    if (!hasAwards) {
        if (isDesktop) {
            return (
                <div className="pt-3 w-1/2 h-full p-2 bg-card rounded-md border border-border">
                    <Typography variant="h4" className="font-bold text-text-title mb-3 flex gap-2 items-center">
                        <AwardIcon className="text-primary" size={18} />
                        <span>Appreciations</span>
                    </Typography>

                    <div className="flex items-center gap-3 p-4 bg-app rounded-2xl border border-dashed border-border mb-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-2xl opacity-60">🏆</span>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-text-title">
                                No awards yet
                            </p>
                            <p className="text-xs text-text-body2">
                                Recognition waiting to happen...
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className={`w-full ${mobileClass} border-border px-6`}>
                <Typography variant="h4" className="font-bold text-text-title mb-4 flex gap-2 items-center">
                    <AwardIcon className="text-primary" size={18} />
                    <span>Appreciations</span>
                </Typography>

                <div className="flex flex-col items-center justify-center py-8 px-4 bg-app rounded-xl border border-border">
                    <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                        <span className="text-3xl opacity-60">🏆</span>
                    </div>
                    <p className="text-sm text-text-title font-medium">
                        No awards yet
                    </p>
                    <p className="text-xs text-text-body2 mt-1">
                        Recognition coming soon!
                    </p>
                </div>
            </div>
        );
    }

    const renderAwardsGrid = () => (
        <div className="grid grid-cols-4 gap-3 justify-items-center items-start w-full">
            {displayedAwards.map((award: Award) => (
                <AwardBadge key={award.name} award={award} />
            ))}
            {hasOverflow && (
                <div
                    onClick={() => setShowAllModal(true)}
                    className="group flex flex-col items-center gap-1.5 w-20 cursor-pointer"
                >
                    <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/50 hover:bg-primary/20 shrink-0">
                        <span className="text-primary font-bold text-sm">+{remainingCount}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-primary text-center leading-snug">
                        View All
                    </span>
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
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                    <div>
                        <Typography variant="h3" className="text-text-title font-bold">
                            All Appreciations
                        </Typography>
                        <p className="text-sm text-text-body2 mt-1">
                            A showcase of all milestones and recognitions earned.
                        </p>
                    </div>
                    <Button
                        variant="subtle"
                        onClick={() => setShowAllModal(false)}
                        className="!p-2 text-text-body2 hover:text-text-title hover:bg-card-hover rounded-full"
                    >
                        ✕
                    </Button>
                </div>

                <div className="overflow-y-auto flex-1 pr-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 py-4 justify-items-center items-start">
                        {awards.map((award: Award) => (
                            <AwardBadge key={award.name} award={award} />
                        ))}
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border flex justify-end">
                    <Button variant="contain" bgColor="primary" onClick={() => setShowAllModal(false)}>
                        Close
                    </Button>
                </div>
            </div>
        </Modal>
    );

    if (isDesktop) {
        return (
            <Card shadow="none" className="h-full w-1/2 p-6 flex flex-col">
                <Typography variant="h4" className="font-bold text-text-title mb-4 flex gap-2 items-center">
                    <AwardIcon className="text-primary" size={18} />
                    <span>
                        Appreciations
                    </span>
                </Typography>

                <div className="flex-1">
                    {renderAwardsGrid()}
                </div>
                {renderAllAwardsModal()}
            </Card>
        );
    }

    return (
        <div className="w-full border-t border-border mt-4 pt-4 px-6">
            <Typography variant="h4" className="font-bold text-text-title mb-4 flex gap-2 items-center">
                <AwardIcon className="text-primary" size={18} />
                <span>Appreciations</span>
            </Typography>

            <div className="flex gap-4 overflow-x-auto py-2 scrollbar-hide">
                {displayedAwards.map((award: Award) => (
                    <AwardBadge key={award.name} award={award} />
                ))}
                {hasOverflow && (
                    <div
                        onClick={() => setShowAllModal(true)}
                        className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group w-20"
                    >
                        <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shadow-sm transition-all duration-300 hover:bg-primary/20 hover:border-primary/40">
                            <span className="text-primary font-bold text-sm">+{remainingCount}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-primary">View All</span>
                    </div>
                )}
            </div>
            {renderAllAwardsModal()}
        </div>
    );
};
