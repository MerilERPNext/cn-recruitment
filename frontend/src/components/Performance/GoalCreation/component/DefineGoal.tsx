import { useState } from 'react';
import type { CategorySelectOption, MetricSelectOption } from '../Type';
import {
    autoPullSources,
    categorySelectOptions,
    keyResults,
    metricSelectOptions,
    tags,
} from '../MockData';
import { AutoPullCard } from './define-goal/AutoPullCard';
import { KeyResultsCard } from './define-goal/KeyResultsCard';
import { LivePreviewCard } from './define-goal/LivePreviewCard';
import { ObjectiveCard } from './define-goal/ObjectiveCard';

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
