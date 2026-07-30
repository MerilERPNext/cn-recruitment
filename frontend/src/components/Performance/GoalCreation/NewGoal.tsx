import { lazy, Suspense, type MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../../shared/atoms/Button';
import PageLayoutWrapper from '../../shared/PageLayoutWrapper';
import { useGoalFormConfig, useSaveGoals } from '../../../hooks/usePerformance';
import type { GoalSaveAction, GoalSaveItem, MyGoalsGoal } from '../../../types/goal';

const DefineGoal = lazy(() => import('./component/DefineGoal'));
const StartGoalSelection = lazy(() => import('./component/StartGoalSelection'));

type GoalType = string;
type GoalWizardStep = 'start' | 'define';

interface GoalTypeOption {
    label: string;
    value: GoalType;
}

const stepDefinitions: {
    key: GoalWizardStep;
    label: string;
    title: string | ((goalType: GoalType) => string);
    subtitle: string;
    nextLabel: string;
    backLabel: string;
}[] = [
        {
            key: 'start',
            label: 'Start',
            title: 'Create a new OKR for FY26',
            subtitle: 'Every PW goal is an OKR — 1 Objective + 3–5 measurable Key Results. Pick how you want to start.',
            nextLabel: 'Continue to Define',
            backLabel: 'Cancel',
        },
        {
            key: 'define',
            label: 'Define',
            title: 'Define your goals',
            subtitle: '',
            nextLabel: 'Add Goals',
            backLabel: 'Back to Start',
        },
    ];

const LazySectionFallback = () => (
    <div className="min-h-[240px] rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="h-5 w-40 animate-pulse rounded bg-gray-100" />
        <div className="mt-5 space-y-3">
            <div className="h-20 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-20 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-20 animate-pulse rounded-lg bg-gray-100" />
        </div>
    </div>
);

interface NewGoalProps {
    onClose?: () => void;
}

const NewGoal: React.FC<NewGoalProps> = ({ onClose }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const locationState = location.state as { draftGoal?: MyGoalsGoal; stepIndex?: number } | null;
    const draftGoal = locationState?.draftGoal;
    const isEditingDraft = draftGoal?.submission_status?.toLowerCase() === 'draft';
    const isDefineStep = locationState?.stepIndex === 1 || isEditingDraft;
    const [activeStepIndex, setActiveStepIndex] = useState(isDefineStep ? 1 : 0);
    const [goalsToSave, setGoalsToSave] = useState<GoalSaveItem[]>([]);
    const { data: goalFormConfig, isLoading: isGoalFormConfigLoading, isError: isGoalFormConfigError } = useGoalFormConfig();
    const goalTypeOptions = useMemo<GoalTypeOption[]>(
        () => (goalFormConfig?.goal_types ?? []).map((goalType) => ({
            label: goalType,
            value: goalType,
        })),
        [goalFormConfig],
    );
    const [selectedGoalType, setSelectedGoalType] = useState<GoalTypeOption>({ label: '', value: '' });
    const { mutate: saveGoals, isPending: isSavingGoals } = useSaveGoals();

    const handleGoalsChange = useCallback((goals: GoalSaveItem[]) => {
        setGoalsToSave(goals);
    }, []);
  
    useEffect(() => {
        if (goalTypeOptions.length === 0) return;

        setSelectedGoalType((currentGoalType) =>
            goalTypeOptions.some((option) => option.value === currentGoalType.value)
                ? currentGoalType
                : (isEditingDraft && draftGoal
                    ? { label: draftGoal.goal_type, value: draftGoal.goal_type }
                    : goalTypeOptions[0]),
        );
    }, [draftGoal, goalTypeOptions, isEditingDraft]);

    const safeStepIndex = Math.min(
        Math.max(activeStepIndex, 0),
        stepDefinitions.length - 1,
    );
    const activeStep = stepDefinitions[safeStepIndex].key;
    const isLastStep = safeStepIndex === stepDefinitions.length - 1;
    const currentStep = stepDefinitions[safeStepIndex];

    const resolvedTitle =
        typeof currentStep.title === 'function'
            ? currentStep.title(selectedGoalType.value)
            : currentStep.title;

    const steps = stepDefinitions.map((step, index) => ({
        label: step.label,
        active: index === safeStepIndex,
    }));

    const isSaveDisabled = isLastStep && (
        isSavingGoals ||
        goalsToSave.length === 0 ||
        goalsToSave.some(goal => {
            const hasEmptyTitle = !goal.title || goal.title.trim() === '';
            const keyResults = goal.key_results || [];
            const hasEmptyKrTitle = keyResults.some(kr => !kr.title || kr.title.trim() === '');
            const hasEmptyKrWeightage = keyResults.some(kr => !kr.weightage || Number(kr.weightage) <= 0);
            const krWeightageSum = keyResults.reduce((sum, kr) => sum + (Number(kr.weightage) || 0), 0);
            const isKrSumInvalid = keyResults.length > 0 && Math.abs(krWeightageSum - 100) > 0.01;
            const missingDepartment = !goal.department || goal.department.trim() === '';
            const missingDesignation = !goal.designation || goal.designation.trim() === '';
            const missingObjectiveWeightage = !goal.weightage || Number(goal.weightage) <= 0;
            
            return hasEmptyTitle || hasEmptyKrTitle || hasEmptyKrWeightage || missingDepartment || missingDesignation || missingObjectiveWeightage || isKrSumInvalid;
        })
    );

    const handleSaveGoals = (action: GoalSaveAction) => {
        if (goalsToSave.length === 0) return;

        saveGoals(
            { action, goals: goalsToSave },
            {
                onSuccess: (response) => {
                    if (!response.success) {
                        toast.error(response.message || 'Unable to save goals. Please try again.');
                        return;
                    }

                    toast.success(response.message);
                    navigate('/webapp/performance-app/my-goals');
                },
                onError: () => toast.error('Unable to save goals. Please try again.'),
            },
        );
    };

    const handlePrimaryAction = () => {
        if (isLastStep) {
            handleSaveGoals('draft');
            return;
        }

        setActiveStepIndex((currentIndex) => {
            const boundedIndex = Math.min(
                Math.max(currentIndex, 0),
                stepDefinitions.length - 1,
            );

            return Math.min(boundedIndex + 1, stepDefinitions.length - 1);
        });
    };

    const handleSecondaryAction = (event?: MouseEvent<HTMLButtonElement>) => {
        event?.preventDefault();
        event?.stopPropagation();

        if (activeStepIndex === 0) {
            if (onClose) {
                onClose();
            } else {
                navigate('/webapp/performance-app/my-goals');
            }
            return;
        }

        setActiveStepIndex((currentIndex) => {
            const boundedIndex = Math.min(
                Math.max(currentIndex, 0),
                stepDefinitions.length - 1,
            );

            return Math.max(boundedIndex - 1, 0);
        });
    };

    const renderStepContent = () => {
        switch (activeStep) {
            case 'start':
                return <StartGoalSelection  onContinue={handlePrimaryAction} />;

            case 'define':
                if (isGoalFormConfigLoading) return <LazySectionFallback />;
                if (isGoalFormConfigError || !goalFormConfig) {
                    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Unable to load goal form configuration. Please try again.</div>;
                }
                return (
                    <DefineGoal
                        goalType={selectedGoalType.value}
                        formConfig={goalFormConfig}
                        initialGoal={isEditingDraft ? draftGoal : undefined}
                        onGoalsChange={handleGoalsChange}
                    />
                );
            default:
                return null;
        }
    };


    return (
        <>
            <PageLayoutWrapper
                title={resolvedTitle}
                subtitle={currentStep.subtitle}
                steps={steps}
                resetScrollKey={safeStepIndex}
                footerLeft={
                    <Button
                        type="button"
                        variant="outline"
                        bgColor="text"
                        fullWidth
                        className="h-9 cursor-pointer  justify-center w-full  rounded-lg border-gray-200 bg-white px-4 text-gray-700 md:w-auto"
                        onClick={handleSecondaryAction}
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        {currentStep.backLabel}
                    </Button>
                }
                footerRight={
                    <div className="flex w-full flex-col gap-2 md:flex-row md:items-center md:justify-end md:gap-3">
                        <div className="hidden items-center text-xs text-gray-500 md:flex">
                            <span className="mr-1 text-gray-400">◷</span> Autosaved 4s ago
                        </div>
                        <Button
                            type="button"
                            variant="contain"
                            bgColor="primary"
                            fullWidth
                            className="h-9 justify-center rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed md:w-auto"
                            onClick={handlePrimaryAction}
                            disabled={isSaveDisabled}
                        >
                            {currentStep.nextLabel} {!isLastStep && <ArrowRight className="w-4 h-4 ml-1" />}
                        </Button>
                    </div>
                }
            >
                <Suspense fallback={<LazySectionFallback />}>
                    {renderStepContent()}
                </Suspense>
            </PageLayoutWrapper>

        </>
    );
};

export default NewGoal;
