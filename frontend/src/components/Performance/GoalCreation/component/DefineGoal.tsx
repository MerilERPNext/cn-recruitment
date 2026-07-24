import { useState } from 'react';
import { FileText, GitBranch, Sparkles, type LucideIcon } from 'lucide-react';
import { ObjectiveCard } from './define-goal/ObjectiveCard';
import { KeyResultsCard } from './define-goal/KeyResultsCard';
import { AutoPullCard } from './define-goal/AutoPullCard';
import { LivePreviewCard } from './define-goal/LivePreviewCard';

export type MetricType = '%' | 'Number' | 'Count' | 'Currency' | 'Boolean' | 'Milestone';
export type CategoryType =
    | 'Organisational'
    | 'Business'
    | 'Functional'
    | 'Team'
    | 'Individual'
    | 'Development';
export type MetricSelectOption = { label: string; value: MetricType };
export type CategorySelectOption = { label: string; value: CategoryType };

export interface KeyResult {
    id: string;
    title: string;
    metricType: MetricType;
    start: string;
    current: string;
    target: string;
    unit: string;
    weight: string;
    suggested?: boolean;
}

const tags = ['product', 'oxygen', 'rollout', 'fy26-q3'];
const metricTypeOptions: MetricType[] = ['%', 'Number', 'Count', 'Currency', 'Boolean', 'Milestone'];
const categoryOptions: CategoryType[] = [
    'Organisational',
    'Business',
    'Functional',
    'Team',
    'Individual',
    'Development',
];
const metricSelectOptions = metricTypeOptions.map((option) => ({ label: option, value: option }));
const categorySelectOptions = categoryOptions.map((option) => ({ label: option, value: option }));
const autoPullSources: Array<{
    id: string;
    label: string;
    description: string;
    enabled: boolean;
    icon: LucideIcon;
}> = [
    {
        id: 'jira',
        label: 'Jira',
        description: 'OXY-2.0 epic · 48/76 issues',
        enabled: true,
        icon: FileText,
    },
    {
        id: 'github',
        label: 'GitHub',
        description: 'oxygen-web · 142 PRs merged',
        enabled: true,
        icon: GitBranch,
    },
    {
        id: 'figma',
        label: 'Figma',
        description: 'Not connected',
        enabled: false,
        icon: Sparkles,
    },
    {
        id: 'salesforce',
        label: 'Salesforce',
        description: 'Not applicable',
        enabled: false,
        icon: FileText,
    },
];

const keyResults: KeyResult[] = [
    {
        id: 'KR 1',
        title: 'Design system v2 components shipped',
        metricType: 'Count',
        start: '0',
        current: '24',
        target: '32',
        unit: 'components',
        weight: '35',
    },
    {
        id: 'KR 2',
        title: 'Dashboard usability score (post-launch survey)',
        metricType: 'Number',
        start: '0',
        current: '0',
        target: '4.4',
        unit: '/ 5',
        weight: '30',
    },
    {
        id: 'KR 3',
        title: 'WAU adoption among all PW employees by Q3',
        metricType: '%',
        start: '0',
        current: '0',
        target: '80',
        unit: '%',
        weight: '35',
        suggested: true,
    },
];

const fieldClass = 'h-[46px] w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1.5 block text-xs font-medium text-gray-600';

const DefineGoal = () => {
    const [weightage, setWeightage] = useState(30);
    const [startDate, setStartDate] = useState('2026-04-01');
    const [endDate, setEndDate] = useState('2026-12-31');
    const [selectedCategory, setSelectedCategory] = useState<CategorySelectOption>(
        categorySelectOptions.find((option) => option.value === 'Individual') ?? categorySelectOptions[0],
    );
    const [sourceStates, setSourceStates] = useState<Record<string, boolean>>(
        () =>
            autoPullSources.reduce<Record<string, boolean>>((acc, source) => {
                acc[source.id] = source.enabled;
                return acc;
            }, {}),
    );
    const [keyResultMetricTypes, setKeyResultMetricTypes] = useState<Record<string, MetricSelectOption>>(
        () =>
            keyResults.reduce<Record<string, MetricSelectOption>>((acc, result) => {
                acc[result.id] = { label: result.metricType, value: result.metricType };
                return acc;
            }, {}),
    );

    const handleMetricTypeChange = (resultId: string, option: MetricSelectOption) => {
        setKeyResultMetricTypes((current) => ({
            ...current,
            [resultId]: option,
        }));
    };

    const toggleSource = (sourceId: string) => {
        setSourceStates((current) => ({
            ...current,
            [sourceId]: !current[sourceId],
        }));
    };

    return (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
                <ObjectiveCard
                    weightage={weightage}
                    setWeightage={setWeightage}
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    startDate={startDate}
                    setStartDate={setStartDate}
                    endDate={endDate}
                    setEndDate={setEndDate}
                    labelClass={labelClass}
                    categorySelectOptions={categorySelectOptions}
                    tags={tags}
                />

                <KeyResultsCard
                    keyResults={keyResults}
                    keyResultMetricTypes={keyResultMetricTypes}
                    handleMetricTypeChange={handleMetricTypeChange}
                    metricSelectOptions={metricSelectOptions}
                    labelClass={labelClass}
                    fieldClass={fieldClass}
                />

                <AutoPullCard
                    autoPullSources={autoPullSources}
                    sourceStates={sourceStates}
                    toggleSource={toggleSource}
                />
            </div>

            <LivePreviewCard
                weightage={weightage}
                keyResults={keyResults}
            />
        </div>
    );
};

export default DefineGoal;
