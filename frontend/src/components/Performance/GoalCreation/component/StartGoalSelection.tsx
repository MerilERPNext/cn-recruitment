import { useMemo, useState } from 'react';
import { ArrowRight, FileText, Plus, Inbox, Sparkles, GitMerge, CheckCircle, FolderX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Typography } from '../../../shared/atoms/Typography';
import Button from '../../../shared/atoms/Button';
import Modal from '../../../shared/Modal';
import GoalLibraryPopup from './GoalLibraryPopup';
import AcknowledgmentPopup, { getWeightageColor } from './AcknowledgmentPopup';
import { useGoalModel } from '../../GoalModelContext';
import { useGetMandotaryGoals } from '../../../../hooks/usePerformance';
import {  Templates } from '../../../../types/goal';
import { useGetUiPermission } from '../../../../hooks/userUiPermission';
import { getActionsEnabled } from '../../../../utils/uiPermission';
import TeamGoalLibraryPopup from './TeamGoalLibraryPopup';
import TemplateCard, { TemplateCardsSkeleton } from './GoalSelectionCard';
import { MandatoryGoalsSkeleton, MandatoryGoalsError } from './MandatoryGoalsStatus';

const APP_NAME = "Performance";
const PAGE_NAME = "Goal Creation";
interface StartGoalSelectionProps {
    onContinue?: () => void;
}

const StartGoalSelection = ({ onContinue }: StartGoalSelectionProps) => {
    const navigate = useNavigate();
    const { data: userUiPermission, isLoading: isPermissionLoading } = useGetUiPermission(APP_NAME)
    const { data: mandatoryGoals, isLoading, error, refetch } = useGetMandotaryGoals();
    const { addDraftGoals } = useGoalModel();
    const [isGoalLibraryOpen, setIsGoalLibraryOpen] = useState(false);
    const [acknowledgementGoalsData, setAcknowledgementGoalsData] = useState<Templates[] | undefined>(undefined);
    const [blankGoalDescription, setBlankGoalDescription] = useState(
        "Write your Objective + Key Results yourself. Best when your goal doesn't match anything in the library."
    );

    const [openTeamGoals, setOpenTeamGoals] = useState(false)
    const permissions = getActionsEnabled(userUiPermission, [
        'start_from_blank',
        'use_goal_library',
        'ai_suggestion',
        'cascade_from_manager',
        'bulk_import'], PAGE_NAME)
    const {
        start_from_blank,
        use_goal_library,
        ai_suggestion,
        cascade_from_manager,
        bulk_import,
    } = permissions;
    const canStartBlank = isPermissionLoading ? false : start_from_blank;
    const canUseLibrary = isPermissionLoading ? false : use_goal_library;
    const canUseAI = isPermissionLoading ? false : ai_suggestion;
    const canCascade = isPermissionLoading ? false : cascade_from_manager;
    const canBulkImport = isPermissionLoading ? false : bulk_import;

    const hasAnyGoalOption = canStartBlank || canUseLibrary || canUseAI || canCascade;

    const goalsCount = mandatoryGoals?.data?.goals?.length ?? 0;
    const pushedBy = mandatoryGoals?.data?.pushed_by;
    const lockDate = mandatoryGoals?.data?.lock_date;
    const metadataText = useMemo(() => {
        return `Pushed by - ${pushedBy ?? ""} . India Tech BU . lock ${lockDate ?? ""}`
    }, [pushedBy, lockDate]);

    return <>
        <div className="bg-[#fff8f6] border border-red-100 rounded-xl p-4 sm:p-5 mb-6 sm:mb-8 flex flex-col md:flex-row gap-4 sm:gap-5 items-start">
            <div className="bg-white border border-red-100 text-red-500 w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                <FileText className="w-6 h-6" />
            </div>
            {error ? <MandatoryGoalsError onRetry={() => refetch()} /> : isLoading ? (
                <MandatoryGoalsSkeleton />
            ) : (
                <>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center flex-wrap gap-2 mb-2">
                            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-md tracking-wider">{goalsCount} MANDATORY OKRs ASSIGNED</span>
                            {metadataText && goalsCount > 0 && <span className="text-gray-500 text-sm">{metadataText}</span>}
                        </div>
                        <Typography variant="subheading" className="font-semibold text-gray-900 mb-4">
                            {goalsCount > 0
                                ? `You have ${goalsCount} mandatory OKRs to acknowledge before adding your own.`
                                : 'No mandatory OKRs assigned at this time.'}
                        </Typography>
                        <div className="flex flex-wrap gap-3">
                            {goalsCount > 0 ? (
                                mandatoryGoals?.data?.goals?.map((Goal: Templates, index: number) => {
                                    const colorConfig = getWeightageColor(Goal?.weightage, index);
                                    return (
                                        <div key={Goal?.template} className="w-full sm:w-auto bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-start sm:items-center gap-2 text-sm shadow-sm">
                                            <div className={`w-2 h-2 rounded-full ${colorConfig.dot}`}></div>
                                            <span className="min-w-0 flex-1 text-gray-700">{Goal?.title ?? "no title"}</span>
                                            <span className={`shrink-0 ${colorConfig.text} font-medium`}>{Goal?.weightage}%</span>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex items-center gap-2 text-gray-400 text-sm">
                                    <CheckCircle className="w-4 h-4 text-gray-400" />
                                    <span>No mandatory OKRs assigned at this time.</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="w-full md:w-auto mt-1 md:mt-0 self-start md:self-center">
                        <Button
                            onClick={() => setAcknowledgementGoalsData(mandatoryGoals?.data?.goals)}
                            variant="contain"
                            bgColor="error"
                            disabled={goalsCount === 0}
                                className="w-full md:w-auto justify-center bg-[#E35D6A] hover:bg-[#cb4f5b] text-white disabled:bg-gray-300 disabled:text-gray-500 disabled:opacity-60"
                        >
                            Acknowledge {goalsCount} <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </>
            )}

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {isPermissionLoading ? (
                <TemplateCardsSkeleton />
            ) : hasAnyGoalOption ? (
                <>
                    {canStartBlank && (
                        <TemplateCard
                            containerClass={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col ${!canUseLibrary ? 'lg:col-span-2' : ''}`}
                            icon={<Plus className="w-6 h-6" />}
                            iconClass="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0"
                            title="Start from blank"
                            description="Write your own OKR from scratch — full creative control."
                            statPrimary="Used by 18% of PW employees"
                            statSecondary="Median time: ~ 4 minutes"
                            onUse={onContinue}
                            ariaLabel="Use start from blank"
                            buttonClass="bg-blue-500 hover:bg-blue-600 text-white"
                        >
                            <textarea
                                aria-label="Start from blank description"
                                className="mt-4 min-h-[92px] w-full resize-none rounded-lg border border-gray-100 bg-blue-50 p-4 text-sm leading-6 text-gray-900 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                                value={blankGoalDescription}
                                onChange={(event) => setBlankGoalDescription(event.target.value)}
                            />
                        </TemplateCard>
                    )}

                    {canUseLibrary && (
                        <TemplateCard
                            containerClass={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col ${!canStartBlank ? 'lg:col-span-2' : ''}`}
                            icon={<FileText className="w-6 h-6" />}
                            iconClass="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0"
                            title="From Goal Library"
                            description="Browse 500+ pre-built OKR templates by role, department, and grade."
                            statPrimary="Most popular · 142 templates for Design"
                            statSecondary="Median time: ~ 90 seconds"
                            onUse={() => setIsGoalLibraryOpen(true)}
                            ariaLabel="Use goal library"
                            buttonClass="bg-indigo-500 hover:bg-indigo-600 text-white"
                        >
                            <div className="mt-4 flex flex-wrap gap-2">
                                <span className="bg-indigo-50 text-indigo-600 text-xs px-2.5 py-1 rounded-md">Design craft +12</span>
                                <span className="bg-indigo-50 text-indigo-600 text-xs px-2.5 py-1 rounded-md">Mentorship</span>
                                <span className="bg-indigo-50 text-indigo-600 text-xs px-2.5 py-1 rounded-md">Systems thinking</span>
                                <span className="bg-indigo-50 text-indigo-600 text-xs px-2.5 py-1 rounded-md">Cross-functional</span>
                                <span className="bg-indigo-50 text-indigo-600 text-xs px-2.5 py-1 rounded-md">+138 more</span>
                            </div>
                        </TemplateCard>
                    )}

                    {/* AI Suggestion Card */}
                    {canUseAI && (
                        <TemplateCard
                            containerClass={`relative overflow-hidden rounded-2xl border border-amber-300 bg-[#FFFCF4] shadow-sm flex flex-col ${!canCascade ? 'lg:col-span-2' : ''}`}
                            icon={<Sparkles className="w-4 h-4" />}
                            iconClass="mt-0.5 rounded-xl bg-amber-100 p-2 text-amber-500 flex items-center justify-center shrink-0"
                            title="AI Suggestion (Marissa™)"
                            badge={
                                <span className="rounded-md bg-amber-400 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-slate-900">
                                    Recommended
                                </span>
                            }
                            description="Marissa proposes an OKR based on your role, last cycle, and recent check-ins."
                            statPrimary="Beta · 84% acceptance rate"
                            statSecondary="Median time: ~ 60 seconds"
                            onUse={onContinue}
                            ariaLabel="Use AI suggested goal"
                            buttonClass="bg-amber-400 hover:bg-amber-500 text-slate-900"
                        >
                            <div className="mt-4 rounded-xl border border-dashed border-amber-300 bg-[#FFF8E8] px-4 py-3">
                                <Typography className="text-[13px] italic leading-6 text-slate-700">
                                    ✨ Marissa™ would suggest:
                                </Typography>
                                <Typography className="mt-1 text-[13px] leading-6 text-slate-700">
                                    “Ship Oxygen 2.0 dashboard to 100% of PW employees by Q4 with WAU ≥ 80%, NPS ≥ 65, and accessibility audit complete.”
                                </Typography>
                            </div>
                        </TemplateCard>
                    )}

                    {/* Cascade Card */}
                    {canCascade && (
                        <TemplateCard
                            containerClass={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col ${!canUseAI ? 'lg:col-span-2' : ''}`}
                            icon={<GitMerge className="h-4 w-4" />}
                            iconClass="rounded-xl bg-indigo-50 p-2 text-indigo-500 flex items-center justify-center shrink-0"
                            title="Cascade from Manager"
                            description="Inherit a sub-OKR from one of Rohit Khanna’s 4 active goals."
                            statPrimary="Arithmetic cascading · 4 parents available"
                            statSecondary="Median time: ~ 2 minutes"
                            onUse={() => setOpenTeamGoals(true)}
                            buttonClass="bg-indigo-500 hover:bg-indigo-600 text-white"
                        >
                            <div className="mt-4 space-y-2">
                                <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                                    <span className="min-w-0 text-[12px] text-slate-700">
                                        Ship Design System v2 across 6 product surfaces
                                    </span>
                                    <span className="shrink-0 text-[12px] font-medium text-indigo-500">
                                        25%
                                    </span>
                                </div>
                                <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                                    <span className="min-w-0 text-[12px] text-slate-700">
                                        Reduce design-eng handoff time by 50%
                                    </span>
                                    <span className="shrink-0 text-[12px] font-medium text-indigo-500">
                                        20%
                                    </span>
                                </div>
                                <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                                    <span className="min-w-0 text-[12px] text-slate-700">
                                        Hit team NPS 75+ from design partners
                                    </span>
                                    <span className="shrink-0 text-[12px] font-medium text-indigo-500">
                                        15%
                                    </span>
                                </div>
                            </div>
                        </TemplateCard>
                    )}
                </>
            ) : (
                <div className="col-span-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 sm:p-10 text-center flex flex-col items-center justify-center min-h-[240px]">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-100/80 shadow-xs">
                        <FolderX className="w-7 h-7" />
                    </div>
                    <Typography variant="h4" className="font-bold text-gray-900 mb-1.5">
                        You don't have any template
                    </Typography>
                    <Typography variant="bodyMedium" className="text-gray-500 max-w-md mx-auto text-sm leading-relaxed">
                        You do not have permission to access any goal creation templates or options. Please contact your manager or HR administrator to request access.
                    </Typography>
                </div>
            )}
        </div>
        {canBulkImport && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm mb-8 lg:mb-12">
                <div className="flex w-full min-w-0 items-start sm:items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-50 text-green-500 flex items-center justify-center shrink-0">
                        <Inbox className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <Typography variant="subheading" className="font-semibold text-gray-900">Need to create many goals at once?</Typography>
                        <Typography variant="bodyMedium" className="text-gray-500 text-sm">Bulk-import via CSV/XLSX — up to 5,000 rows with row-level validation. Suitable for managers cascading to a team.</Typography>
                    </div>
                </div>
                <Button variant="outline" bgColor="text" className="w-full sm:w-auto justify-center whitespace-nowrap bg-white">
                    Bulk Import <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
            </div>
        )}

        <Modal
            isOpen={isGoalLibraryOpen}
            onClose={() => setIsGoalLibraryOpen(false)}
            size="xl"
            className="max-w-[1300px] p-0"
        >
            <GoalLibraryPopup
                onClose={() => setIsGoalLibraryOpen(false)}
                onUseTemplate={(selected, source) => {
                    setIsGoalLibraryOpen(false);
                    const selectedGoals = Array.isArray(selected) ? selected : [selected];
                    addDraftGoals(selectedGoals);
                    if (source === 'recommended') {
                        onContinue?.();
                    } else {
                        navigate('/webapp/performance-app/my-goals/goal-draft', {
                            state: { selectedGoals }
                        });
                    }
                }}
            />
        </Modal>
        <Modal
            isOpen={openTeamGoals}
            onClose={() => setOpenTeamGoals(false)}
            size="xl"
            className="max-w-[1300px] p-0"
        >
            <TeamGoalLibraryPopup
                onClose={() => setOpenTeamGoals(false)}
                onUseTemplate={(selected) => {
                    setOpenTeamGoals(false);
                    const selectedGoals = Array.isArray(selected) ? selected : [selected];
                    addDraftGoals(selectedGoals);
                    navigate('/webapp/performance-app/my-goals/goal-draft', {
                        state: { selectedGoals }
                    });
                }}
            />
        </Modal>

        <Modal
            isOpen={!!acknowledgementGoalsData}
            onClose={() => setAcknowledgementGoalsData(undefined)}
            size="lg"
            className="max-w-[780px] p-0"
        >
            <AcknowledgmentPopup text={metadataText} goalData={acknowledgementGoalsData} onClose={() => setAcknowledgementGoalsData(undefined)} />
        </Modal>
    </>
};

export default StartGoalSelection;

