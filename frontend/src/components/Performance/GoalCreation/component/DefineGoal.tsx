import { useState } from 'react';
import { Check, FileText, GitBranch, Plus, Sparkles, X, type LucideIcon } from 'lucide-react';
import Badge from '../../../shared/Badge';
import Button from '../../../shared/atoms/Button';
import { Card } from '../../../shared/atoms/Card';
import { Select } from '../../../shared/atoms/Select';
import { Typography } from '../../../shared/atoms/Typography';

type MetricType = 'Count' | 'Number' | '%';
type MetricSelectOption = { label: string; value: MetricType };

interface KeyResult {
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
const metricTypeOptions: MetricType[] = ['Count', 'Number', '%'];
const categoryOptions = ['Individual', 'Team', 'Company'];
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

const fieldClass = 'h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1.5 block text-xs font-medium text-gray-600';

const DefineGoal = () => {
    const [weightage, setWeightage] = useState(30);
    const [selectedCategory, setSelectedCategory] = useState(categorySelectOptions[0]);
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
                <Card className="border border-violet-200 bg-white p-5 shadow-sm" radius="xl" padding="none">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge label="Objective" variant="purple" size="sm" />
                            <Typography variant="caption" className="text-gray-500">
                                What you want to achieve - qualitative
                            </Typography>
                        </div>

                        <Button
                            type="button"
                            variant="soft"
                            bgColor="primary"
                            className="h-8 justify-center rounded-lg bg-violet-50 px-3 text-xs text-violet-700 hover:bg-violet-100"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            Rewrite with AI
                        </Button>
                    </div>

                    <input
                        className="mb-3 h-12 w-full rounded-lg border border-violet-200 bg-white px-4 text-base font-semibold text-gray-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        defaultValue="Ship Oxygen 2.0 dashboard to 100% of PW employees"
                    />

                    <textarea
                        className="mb-5 min-h-[76px] w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm leading-5 text-gray-600 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        defaultValue="Lead the design + research for the redesigned dashboard. Drive adoption past 80% WAU. Coordinate with PMM and CS for rollout comms. Quarterly progress reviews with Aditi."
                    />

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1fr_1fr]">
                        <div>
                            <label className={labelClass}>Weightage</label>
                            <div className="flex items-center gap-3">
                                <input
                                    className="h-2 w-full accent-blue-600"
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={weightage}
                                    onChange={(event) => setWeightage(Number(event.target.value))}
                                />
                                <span className="w-10 text-sm font-semibold text-blue-600">{weightage}%</span>
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Category</label>
                            <Select
                                options={categorySelectOptions}
                                value={selectedCategory}
                                onChange={setSelectedCategory}
                                className="relative w-full"
                            />
                        </div>

                        <div>
                            <label className={labelClass}>Start Date</label>
                            <input className={fieldClass} defaultValue="2026-04-01" type="date" />
                        </div>

                        <div>
                            <label className={labelClass}>End Date</label>
                            <input className={fieldClass} defaultValue="2026-12-31" type="date" />
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-gray-500">Tags:</span>
                        {tags.map((tag) => (
                            <div key={tag} className="inline-flex h-7 items-center gap-1 border-violet-200 bg-white pl-1 pr-2">
                                <Badge label={tag} variant="purple" size="sm" icon={<X className="h-3 w-3" />} />
                            </div>
                        ))}
                        <Badge variant="white" label="+ Add tag" />
                    </div>
                </Card>

                <Card className="border border-gray-200 bg-white p-5 shadow-sm" radius="xl" padding="none">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <Typography variant="subheading" className="text-gray-900">
                                    Key Results
                                </Typography>
                                <Badge label="3" variant="default" size="sm" />
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
                                    />

                                    {result.suggested ? (
                                        <div className="hidden shrink-0 [&>div]:h-8 [&>div]:rounded-full sm:block">
                                            <Badge label="AI suggested" variant="warning" size="sm" icon={<Sparkles className="h-3 w-3" />} />
                                        </div>
                                    ) : null}

                                    <button type="button" className="shrink-0 text-gray-400 hover:text-gray-600">
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
                                        <input className={fieldClass} defaultValue={result.start} />
                                    </div>

                                    <div>
                                        <label className={labelClass}>Current</label>
                                        <input className={fieldClass} defaultValue={result.current} />
                                    </div>

                                    <div>
                                        <label className={labelClass}>Target</label>
                                        <input className={fieldClass} defaultValue={result.target} />
                                    </div>

                                    <div>
                                        <label className={labelClass}>Unit</label>
                                        <input className={fieldClass} defaultValue={result.unit} />
                                    </div>

                                    <div>
                                        <label className={labelClass}>Weight</label>
                                        <div className="flex items-center gap-1">
                                            <input className={fieldClass} defaultValue={result.weight} />
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
                    >
                        <Plus className="h-4 w-4" />
                        Add Key Result (3 of 5)
                    </button>

                    <div className="mt-4 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3 text-sm">
                        <span className="font-medium text-emerald-900">KR weightage sum</span>
                        <span className="font-semibold text-emerald-700">100% → valid</span>
                    </div>
                </Card>

                <Card className="border border-gray-200 bg-white p-5 shadow-sm" radius="xl" padding="none">
                    <div className="mb-4">
                        <Typography variant="subheading" className="text-gray-900">
                            Auto-pull progress
                        </Typography>
                        <Typography variant="caption" className="text-gray-500">
                            Connect a source-of-record to auto-update Current values
                        </Typography>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {autoPullSources.map((source) => {
                            const Icon = source.icon;
                            const isEnabled = sourceStates[source.id];

                            return (
                                <div key={source.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-500">
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <Typography variant="bodySmall" className="truncate font-semibold text-gray-900">
                                                {source.label}
                                            </Typography>
                                            <Typography variant="caption" className="block truncate text-gray-500">
                                                {source.description}
                                            </Typography>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        aria-pressed={isEnabled}
                                        aria-label={`${isEnabled ? 'Disable' : 'Enable'} ${source.label} auto-pull`}
                                        onClick={() => toggleSource(source.id)}
                                        className={`relative h-5 w-9 shrink-0 rounded-md transition-colors ${isEnabled ? 'bg-blue-500' : 'bg-gray-200'}`}
                                    >
                                        <span
                                            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isEnabled ? '-translate-x-4' : 'translate-x-0.5'}`}
                                        />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>

            <aside className="space-y-4">
                <Card className="overflow-hidden border border-gray-800 bg-gray-950 p-0 text-white shadow-sm" radius="xl" padding="none">
                    <div className="border-b border-white/10 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        Live Preview - how your manager will see it
                    </div>
                    <div className="p-4">
                        <div className="rounded-xl bg-white p-4 text-gray-900">
                            <div className="mb-3 flex flex-wrap gap-2">
                                <Badge label="OKR" variant="purple" size="sm" />
                                <Badge label="Individual" variant="default" size="sm" />
                                <Badge label="Draft" variant="default" size="sm" />
                            </div>

                            <Typography variant="bodyMedium" className="text-sm font-semibold text-gray-900">
                                Ship Oxygen 2.0 dashboard to 100% of PW employees
                            </Typography>

                            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-gray-500">
                                <span>{weightage}% weight</span>
                                <span>Q1-Q3 FY26</span>
                                <span>3 KRs</span>
                            </div>

                            <div className="mt-3 space-y-2">
                                {keyResults.map((result, index) => (
                                    <div key={result.id} className="grid grid-cols-[auto_1fr_52px] items-center gap-2 text-[11px]">
                                        <Badge label={result.id} variant="purple" size="sm" />
                                        <span className="truncate text-gray-600">{result.title}</span>
                                        <div className="h-1 rounded-md bg-gray-200">
                                            <div className="h-full rounded-md bg-blue-500" style={{ width: `${index === 0 ? 72 : index === 1 ? 28 : 0}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Typography variant="caption" className="mt-3 block text-gray-400">
                            Updates as you type - approval required from Rohit Khanna
                        </Typography>
                    </div>
                </Card>

                <Card className="border bg-[#fffdf1] p-4 shadow-sm" radius="xl" padding="none">
                    <Typography variant="bodyMedium" className="font-semibold text-amber-800">
                        3 KRs is the minimum for OKR
                    </Typography>
                    <Typography variant="caption" className="mt-1 block text-amber-700">
                        Most high-performing PW OKRs have 3-4 KRs. More than 5 dilutes focus.
                    </Typography>
                </Card>
            </aside>
        </div>
    );
};

export default DefineGoal;
