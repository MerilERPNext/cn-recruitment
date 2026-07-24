import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Layers, Plus, Trash2, CheckCircle2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../../shared/atoms/Button';
import { Typography } from '../../shared/atoms/Typography';
import Badge from '../../shared/Badge';
import Modal from '../../shared/Modal';
import PageLayoutWrapper from '../../shared/PageLayoutWrapper';
import GoalLibraryPopup from './component/GoalLibraryPopup';
import { GoalTemplate } from './component/goal-model/types';
import { useGoalModel } from '../GoalModelContext';

const GoalDrafts: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {
        draftGoals,
        addDraftGoals,
        removeDraftGoal,
        updateDraftGoalWeightage,
        clearDraftGoals,
    } = useGoalModel();

    const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
    const [goalToDelete, setGoalToDelete] = useState<GoalTemplate | null>(null);

    // Sync selected goals passed via navigation state into global GoalModelContext
    useEffect(() => {
        const passedGoals = (location.state as { selectedGoals?: GoalTemplate[] } | null)?.selectedGoals;
        if (passedGoals && passedGoals.length > 0) {
            addDraftGoals(passedGoals);
        }
    }, [location.state]);

    // Calculate total weightage
    const totalWeightage = draftGoals.reduce((sum, g) => sum + (g.weightage ?? 10), 0);

    const handleWeightageChange = (id: string, newWeight: number) => {
        updateDraftGoalWeightage(id, newWeight);
    };

    const handleRemoveGoal = (id: string) => {
        removeDraftGoal(id);
        toast.success('Goal removed from draft');
    };

    const handleAddGoalsFromLibrary = (selected: GoalTemplate | GoalTemplate[], source?: string) => {
        const templateArray = Array.isArray(selected) ? selected : [selected];
        addDraftGoals(templateArray);
        setIsLibraryModalOpen(false);
        if (source === 'recommended' || templateArray.length === 1) {
            navigate('/webapp/performance-app/my-goals/new-goal', {
                state: { stepIndex: 1, selectedTemplate: templateArray[0] }
            });
        } else {
            toast.success(`${templateArray.length} goal(s) added to draft!`);
        }
    };

    const handleSubmitPlan = () => {
        if (draftGoals.length === 0) {
            toast.error('Please add at least one goal to submit your plan.');
            return;
        }
        toast.success('Goal plan submitted successfully!');
        clearDraftGoals();
        navigate('/webapp/performance-app/my-goals');
    };

    return (
        <>
            <PageLayoutWrapper
                title="Goal Plan Drafts"
                subtitle="Review your selected goals, adjust weightages, and add more from the library before submitting."
                footerLeft={
                    <Button
                        type="button"
                        variant="outline"
                        bgColor="text"
                        className="h-9 justify-center rounded-lg border-gray-200 bg-white px-4 text-gray-700 hover:bg-gray-50 md:w-auto"
                        onClick={() => navigate('/webapp/performance-app/my-goals/new-goal')}
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back to Goal Selection
                    </Button>
                }
                footerRight={
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            bgColor="text"
                            className="h-9 justify-center rounded-lg border-gray-200 bg-white px-4 text-gray-700 hover:bg-gray-50"
                            onClick={() => toast.success('Draft saved successfully!')}
                        >
                            Save Draft
                        </Button>
                        <Button
                            type="button"
                            variant="contain"
                            bgColor="primary"
                            className="h-9 justify-center rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700"
                            onClick={handleSubmitPlan}
                        >
                            Submit Goal Plan ({draftGoals.length})
                            <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                }
            >
                <div className="mx-auto max-w-5xl space-y-6">

                    {/* Banner & Summary Stats */}
                    <div className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                                <Layers className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Typography variant="h4" className="font-bold text-gray-900">
                                        Selected Draft Goals
                                    </Typography>
                                    <Badge label="In Progress" variant="warning" size="sm" />
                                </div>
                                <Typography variant="bodyMedium" className="mt-0.5 text-xs text-gray-500">
                                    Target total weightage: 100%. Adjust individual goal weights below.
                                </Typography>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Badge label={`${draftGoals.length} Goals Added`} variant="blue" size="md" />
                            <Badge
                                label={`${totalWeightage}% Total Weight`}
                                variant={totalWeightage > 100 ? 'danger' : 'purple'}
                                size="md"
                            />
                        </div>
                    </div>

                    {/* Goals List */}
                    {draftGoals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-sm">
                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                <Sparkles className="h-6 w-6" />
                            </div>
                            <Typography variant="h4" className="font-semibold text-gray-800">
                                No goals in your draft
                            </Typography>
                            <Typography variant="bodyMedium" className="mt-1 max-w-sm text-sm text-gray-500">
                                You haven't added any goals to your draft yet. Open the library below to select pre-built OKRs.
                            </Typography>
                            <Button
                                type="button"
                                variant="contain"
                                bgColor="primary"
                                className="mt-5 h-10 rounded-xl bg-blue-600 px-5 text-white hover:bg-blue-700"
                                onClick={() => setIsLibraryModalOpen(true)}
                            >
                                <Plus className="mr-1.5 h-4 w-4" /> Add Goals from Library
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {draftGoals.map((goal, index) => (
                                <div
                                    key={goal.id || index}
                                    className="group relative flex flex-col justify-between gap-5 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-md sm:flex-row sm:items-center sm:p-6"
                                >
                                    <div className="flex min-w-0 items-start gap-4 flex-1">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-xs font-bold text-blue-700 shadow-2xs">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                                                    {goal.scope}
                                                </span>
                                                {goal.recommended && (
                                                    <span className="rounded-md bg-amber-50 border border-amber-200/70 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                                                        ★ Recommended
                                                    </span>
                                                )}
                                            </div>

                                            <Typography
                                                variant="bodyMedium"
                                                className="text-base font-semibold leading-relaxed text-gray-900"
                                            >
                                                {goal.title}
                                            </Typography>

                                            <Typography variant="caption" className="mt-1.5 block text-xs text-gray-400">
                                                Used {goal.usedCount ?? 120} times this cycle
                                            </Typography>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 border-t border-gray-100 pt-3.5 sm:border-t-0 sm:pt-0 shrink-0">
                                        <div className="flex items-center gap-2 rounded-xl bg-gray-50/80 border border-gray-200/70 px-3 py-1.5">
                                            <span className="text-xs font-semibold text-gray-500">Weight:</span>
                                            <select
                                                value={goal.weightage ?? 10}
                                                onChange={(e) => handleWeightageChange(goal.id, Number(e.target.value))}
                                                className="bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer"
                                            >
                                                <option value={5}>5%</option>
                                                <option value={10}>10%</option>
                                                <option value={15}>15%</option>
                                                <option value={20}>20%</option>
                                                <option value={25}>25%</option>
                                                <option value={30}>30%</option>
                                            </select>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setGoalToDelete(goal)}
                                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50/60 text-red-500 transition hover:bg-red-100 hover:text-red-700"
                                            title="Remove goal"
                                            aria-label="Remove goal"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Niche (Bottom) Add Goals Button */}
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                                <Typography variant="subheading" className="font-semibold text-gray-900">
                                    Want to add more goals from library?
                                </Typography>
                                <Typography variant="caption" className="text-gray-500">
                                    Explore role-based and department OKR templates anytime.
                                </Typography>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="contain"
                            bgColor="primary"
                            className="h-11 w-full justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm sm:w-auto"
                            onClick={() => setIsLibraryModalOpen(true)}
                        >
                            <Plus className="mr-1.5 h-4 w-4" /> Add Goal
                        </Button>
                    </div>

                </div>
            </PageLayoutWrapper>

            {/* Goal Library Popup Modal */}
            <Modal
                isOpen={isLibraryModalOpen}
                onClose={() => setIsLibraryModalOpen(false)}
                size="xl"
                className="max-w-[1300px] p-0"
            >
                <GoalLibraryPopup
                    onClose={() => setIsLibraryModalOpen(false)}
                    onUseTemplate={handleAddGoalsFromLibrary}
                />
            </Modal>

            {/* Delete Goal Confirmation Modal */}
            <Modal
                isOpen={Boolean(goalToDelete)}
                onClose={() => setGoalToDelete(null)}
                size="sm"
                className="max-w-md p-6 sm:rounded-2xl"
            >
                <div className="flex flex-col items-center text-center">
                    <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 border border-red-100 shadow-2xs">
                        <Trash2 className="h-6 w-6" />
                    </div>
                    <Typography variant="h4" className="font-semibold text-gray-900">
                        Remove Goal from Draft?
                    </Typography>
                    <Typography variant="bodyMedium" className="mt-2 text-sm text-gray-500 leading-relaxed">
                        Are you sure you want to remove <span className="font-semibold text-gray-800">"{goalToDelete?.title}"</span> from your draft plan?
                    </Typography>
                    <div className="mt-6 flex w-full items-center justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            bgColor="text"
                            className="h-10 flex-1 justify-center rounded-xl border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
                            onClick={() => setGoalToDelete(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="contain"
                            bgColor="error"
                            className="h-10 flex-1 justify-center rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700 shadow-sm"
                            onClick={() => {
                                if (goalToDelete) {
                                    handleRemoveGoal(goalToDelete.id);
                                    setGoalToDelete(null);
                                }
                            }}
                        >
                            Remove Goal
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default GoalDrafts;