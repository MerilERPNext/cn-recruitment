import { memo } from 'react';
import { Check, Plus, Sparkles, X } from 'lucide-react';
import Badge from '../../../../shared/Badge';
import Button from '../../../../shared/atoms/Button';
import { Card } from '../../../../shared/atoms/Card';
import { Select } from '../../../../shared/atoms/Select';
import { Typography } from '../../../../shared/atoms/Typography';
import type { MetricSelectOption, KeyResult } from '../../Type';

interface KeyResultsCardProps {
    keyResults: KeyResult[];
    keyResultMetricTypes: Record<string, MetricSelectOption>;
    handleMetricTypeChange: (resultId: string, option: MetricSelectOption) => void;
    metricSelectOptions: MetricSelectOption[];
    labelClass: string;
    fieldClass: string;
}

export const KeyResultsCard = memo(({
    keyResults,
    keyResultMetricTypes,
    handleMetricTypeChange,
    metricSelectOptions,
    labelClass,
    fieldClass,
}: KeyResultsCardProps) => {
    return (
        <Card className="border border-gray-200 bg-white p-5 shadow-sm" radius="xl" padding="none">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Typography variant="subheading" className="text-gray-900">
                            Key Results
                        </Typography>
                        <Badge label={String(keyResults.length)} variant="default" size="sm" />
                    </div>
                    <Typography variant="caption" className="text-gray-500">
                        Quantitative, measurable outcomes that prove the Objective
                    </Typography>
                </div>

                <Button
                    type="button"
                    variant="soft"
                    bgColor="primary"
                    className="h-9 justify-center rounded-lg bg-violet-50 px-3 text-xs text-violet-700 hover:bg-violet-100"
                >
                    <Sparkles className="h-3.5 w-3.5" />
                    AI: Suggest 2 more KRs
                </Button>
            </div>

            <div className="space-y-3">
                {keyResults.map((result) => (
                    <div
                        key={result.id}
                        className={`rounded-xl border p-4 ${result.suggested
                            ? 'border-dashed border-amber-300 bg-[#fffdf1]'
                            : 'border-gray-200 bg-white'
                            }`}
                    >
                        <div className="mb-4 grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3">
                            <div className="shrink-0 [&>div]:h-7 [&>div]:rounded-md [&>div]:px-2 [&>div]:py-0">
                                <Badge label={result.id} variant="purple" size="sm" />
                            </div>

                            <input
                                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                defaultValue={result.title}
                                aria-label={`${result.id} key result title`}
                            />

                            {result.suggested ? (
                                <div className="hidden shrink-0 [&>div]:h-8 [&>div]:rounded-full sm:block">
                                    <Badge label="AI suggested" variant="warning" size="sm" icon={<Sparkles className="h-3 w-3" />} />
                                </div>
                            ) : null}

                            <button type="button" className="shrink-0 text-gray-400 hover:text-gray-600" aria-label={`Remove ${result.id} key result`}>
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_1.45fr_72px]">
                            <div>
                                <label className={labelClass}>Metric type</label>
                                <Select
                                    options={metricSelectOptions}
                                    value={keyResultMetricTypes[result.id]}
                                    onChange={(option) => handleMetricTypeChange(result.id, option)}
                                    className="relative w-full"
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Start</label>
                                <input className={fieldClass} defaultValue={result.start} aria-label={`${result.id} start value`} />
                            </div>

                            <div>
                                <label className={labelClass}>Current</label>
                                <input className={fieldClass} defaultValue={result.current} aria-label={`${result.id} current value`} />
                            </div>

                            <div>
                                <label className={labelClass}>Target</label>
                                <input className={fieldClass} defaultValue={result.target} aria-label={`${result.id} target value`} />
                            </div>

                            <div>
                                <label className={labelClass}>Unit</label>
                                <input className={fieldClass} defaultValue={result.unit} aria-label={`${result.id} unit`} />
                            </div>

                            <div>
                                <label className={labelClass}>Weight</label>
                                <div className="flex items-center gap-1">
                                    <input className={fieldClass} defaultValue={result.weight} aria-label={`${result.id} weight`} />
                                    <span className="text-xs text-gray-500">%</span>
                                </div>
                            </div>
                        </div>

                        {result.suggested ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                                <Button type="button" variant="subtle" bgColor="text" className="h-8 rounded-md bg-amber-400 px-3 text-xs text-black hover:bg-amber-500">
                                    <Check className="h-3 w-3 text-black" />
                                    Use
                                </Button>
                                <Button type="button" variant="outline" bgColor="text" className="h-8 rounded-md border-gray-200 bg-white px-3 text-xs text-gray-700">
                                    Edit
                                </Button>
                                <Button type="button" variant="outline" bgColor="text" className="h-8 rounded-md border-gray-200 bg-white px-3 text-xs text-gray-700">
                                    Discard
                                </Button>
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>

            <button
                type="button"
                className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 text-sm font-medium text-violet-700 hover:border-violet-200 hover:bg-violet-50"
                aria-label="Add key result"
            >
                <Plus className="h-4 w-4" />
                Add Key Result (3 of 5)
            </button>

            <div className="mt-4 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3 text-sm">
                <span className="font-medium text-emerald-900">KR weightage sum</span>
                <span className="font-semibold text-emerald-700">100% → valid</span>
            </div>
        </Card>
    );
});
