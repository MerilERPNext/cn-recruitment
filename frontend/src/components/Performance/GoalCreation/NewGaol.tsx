import { lazy, Suspense, type MouseEvent, useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import Button from '../../shared/atoms/Button';
import PageLayoutWrapper from '../../shared/PageLayoutWrapper';

const DefineGoal = lazy(() => import('./component/DefineGoal'));
const GoalAlignment = lazy(() => import('./component/GoalAlignment'));
const StartGoalSelection = lazy(() => import('./component/StartGoalSelection'));
const VisibilityAndSubmit = lazy(() => import('./component/VisibilityAndSubmit'));

type GoalWizardStep = 'start' | 'define' | 'alignment' | 'visibility';

const stepDefinitions: {
    key: GoalWizardStep;
    label: string;
    title: string;
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
            title: 'Define your OKR',
            subtitle: '1 Objective with 3–5 measurable Key Results',
            nextLabel: 'Continue to Alignment',
            backLabel: 'Back to Start',
        },
        {
            key: 'alignment',
            label: 'Alignment',
            title: 'Align to a parent goal',
            subtitle: 'Show how your OKR contributes upward. Arithmetic cascading — Rohit progress will partly include yours.',
            nextLabel: 'Continue to Visibility',
            backLabel: 'Back to Define',
        },
        {
            key: 'visibility',
            label: 'Visibility & Submit',
            title: 'Visibility & submit',
            subtitle: 'Choose who sees your OKR and submit for approval.',
            nextLabel: 'Submit For Approval',
            backLabel: 'Back to Alignment',
        },
    ];

export const LazySectionFallback = () => (
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
    const [activeStepIndex, setActiveStepIndex] = useState(0);

    const safeStepIndex = Math.min(
        Math.max(activeStepIndex, 0),
        stepDefinitions.length - 1,
    );
    const activeStep = stepDefinitions[safeStepIndex].key;
    const currentStep = stepDefinitions[safeStepIndex];

    const steps = stepDefinitions.map((step, index) => ({
        label: step.label,
        active: index === safeStepIndex,
    }));

    const handlePrimaryAction = () => {


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
            if (onClose) onClose();
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
                return <StartGoalSelection />;

            case 'define':
                return <DefineGoal />;
            case 'alignment':
                return <GoalAlignment />;
            case 'visibility':
                return <VisibilityAndSubmit onSubmitForApproval={handlePrimaryAction} />;
            default:
                return null;
        }
    };

    return (
        <>
            <PageLayoutWrapper
                title={currentStep.title}
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
                        <Button type="button" variant="outline" bgColor="text" fullWidth className="h-9 justify-center rounded-lg border-gray-200 bg-white px-4 text-gray-700 md:w-auto">
                            Save Draft
                        </Button>
                        <Button
                            type="button"
                            variant="contain"
                            bgColor="primary"
                            fullWidth
                            className="h-9 justify-center rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700 md:w-auto"
                            onClick={handlePrimaryAction}
                        >
                            {currentStep.nextLabel} <ArrowRight className="w-4 h-4 ml-1" />
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
