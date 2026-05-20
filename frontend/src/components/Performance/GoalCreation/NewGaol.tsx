import { useMemo, useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import Button from '../../shared/atoms/Button';
import PageLayoutWrapper from '../../shared/PageLayoutWrapper';
import StartGoalSelection from './component/StartGoalSelection';

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
            title: 'Define your Objective and Key Results',
            subtitle: 'Capture the objective, success metrics, and the first version of your key results.',
            nextLabel: 'Continue to Alignment',
            backLabel: 'Back to Start',
        },
        {
            key: 'alignment',
            label: 'Alignment',
            title: 'Align your goal with stakeholders',
            subtitle: 'Choose who should see this OKR and how it fits with team and manager priorities.',
            nextLabel: 'Continue to Visibility',
            backLabel: 'Back to Define',
        },
        {
            key: 'visibility',
            label: 'Visibility & Submit',
            title: 'Review and submit your OKR',
            subtitle: 'Confirm visibility settings, review details, then submit for approval.',
            nextLabel: 'Submit OKR',
            backLabel: 'Back to Alignment',
        },
    ];

const NewGoal = () => {
    const [activeStep, setActiveStep] = useState<GoalWizardStep>('start');

    const stepIndex = useMemo(
        () => stepDefinitions.findIndex((step) => step.key === activeStep),
        [activeStep],
    );
    const isLastStep = stepIndex === stepDefinitions.length - 1;
    const currentStep = stepDefinitions[stepIndex];

    const steps = stepDefinitions.map((step, index) => ({
        label: step.label,
        active: index === stepIndex,
    }));

    const handlePrimaryAction = () => {
        if (isLastStep) {
            console.log('Submit OKR');
            return;
        }

        const nextStep = stepDefinitions[stepIndex + 1];
        if (nextStep) {
            setActiveStep(nextStep.key);
        }
    };

    const handleSecondaryAction = () => {
        if (stepIndex === 0) {
            console.log('Cancel goal creation');
            return;
        }

        const previousStep = stepDefinitions[stepIndex - 1];
        if (previousStep) {
            setActiveStep(previousStep.key);
        }
    };

    const renderStepContent = () => {
        switch (activeStep) {
            case 'start':
                return <StartGoalSelection onContinue={handlePrimaryAction} />;

            case 'define':
                return (
                    <div className="space-y-8">
                        
                    </div>
                );
            case 'alignment':
                return (
                    <div className="space-y-8">
                       
                    </div>
                );
            case 'visibility':
                return (
                    <div className="space-y-8">
                        
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <PageLayoutWrapper
            title={currentStep.title}
            subtitle={currentStep.subtitle}
            steps={steps}
            footerLeft={
                <Button
                    variant="outline"
                    bgColor="text"
                    fullWidth
                    className="h-9 justify-center rounded-lg border-gray-200 bg-white px-4 text-gray-700 md:w-auto"
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
                    <Button variant="outline" bgColor="text" fullWidth className="h-9 justify-center rounded-lg border-gray-200 bg-white px-4 text-gray-700 md:w-auto">
                        Save Draft
                    </Button>
                    <Button
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
            {renderStepContent()}
        </PageLayoutWrapper>
    );
};

export default NewGoal;
