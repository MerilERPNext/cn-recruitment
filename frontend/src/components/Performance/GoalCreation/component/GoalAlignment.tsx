import { useEffect, useState } from 'react';
import { Check, Info, Link2, Users } from 'lucide-react';
import Badge from '../../../shared/Badge';
import Button from '../../../shared/atoms/Button';
import { Card } from '../../../shared/atoms/Card';
import { Typography } from '../../../shared/atoms/Typography';

const parentGoals = [
    {
        title: 'Ship Design System v2 across 6 surfaces',
        weight: '25% weight',
        selected: true,
    },
    {
        title: 'Reduce design-eng handoff time by 50%',
        weight: '20% weight',
    },
    {
        title: 'Hit team NPS 75+ from design partners',
        weight: '15% weight',
    },
];

const alignmentOptions = [
    {
        label: 'Cascaded',
        helper: 'Direct child of parent - weight inherited',
        checked: true,
    },
    {
        label: 'Aligned',
        helper: 'Same direction, weight independent',
    },
    {
        label: 'Shared',
        helper: 'Co-owned across peers',
    },
    {
        label: 'Cross-functional',
        helper: 'Spans Eng + Design + PM',
        checked: true,
    },
];

const crossFunctionalKrs = [
    {
        team: 'Eng',
        title: 'Complete API readiness and dashboard instrumentation',
        owner: 'Karthik',
        status: 'On track',
        progress: 68,
    },
    {
        team: 'PMM',
        title: 'Launch comms kit and enablement plan for rollout',
        owner: 'Meera',
        status: 'Draft',
        progress: 42,
    },
];

const GoalAlignment = () => {
    const [contribution, setContribution] = useState(35);
    const [isMobileView, setIsMobileView] = useState(false);
    const existingParentContribution = 70;
    const parentContributionTotal = existingParentContribution + contribution;
    const remainingParentContribution = Math.max(100 - parentContributionTotal, 0);
    const [selectedOptions, setSelectedOptions] = useState<string[]>(
        alignmentOptions
            .filter((option) => option.checked)
            .map((option) => option.label),
    );

    const toggleAlignmentOption = (label: string) => {
        setSelectedOptions((currentOptions) => (
            currentOptions.includes(label)
                ? currentOptions.filter((option) => option !== label)
                : [...currentOptions, label]
        ));
    };

    useEffect(() => {
        const updateViewport = () => {
            setIsMobileView(window.innerWidth < 768);
        };

        updateViewport();
        window.addEventListener('resize', updateViewport);
        return () => window.removeEventListener('resize', updateViewport);
    }, []);

    return (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
                <Card className="border border-gray-200 bg-white p-6 shadow-sm" radius="xl" padding="none">
                    <div className="mb-5">
                        <Typography variant="subheading" className="text-gray-900">
                            Goal hierarchy
                        </Typography>
                        <Typography variant="caption" className="mt-1 block text-gray-500">
                            Click a parent to align - drag connections to adjust
                        </Typography>
                    </div>

                    {isMobileView ? (
                        <div className="rounded-xl bg-white">
                            <div className="mx-auto rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-center shadow-sm">
                                <Typography variant="caption" className="font-semibold uppercase tracking-wide text-blue-600">
                                    Org - Alakh Pandey
                                </Typography>
                                <Typography variant="bodyMedium" className="mt-1 text-sm font-semibold text-gray-900">
                                    Become #1 EdTech platform in India by FY27
                                </Typography>
                            </div>

                            <div className="mx-auto h-10 w-px border-l-2 border-dashed border-blue-400" />

                            <div className="space-y-3">
                                {parentGoals.map((goal) => (
                                    <div
                                        key={goal.title}
                                        className={`rounded-xl border bg-white p-4 shadow-sm ${goal.selected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}`}
                                    >
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <Badge label="KR" variant="info" size="sm" />
                                                <span className="truncate text-xs text-gray-500">Manager</span>
                                            </div>
                                            {goal.selected ? (
                                                <span className="shrink-0 text-[10px] font-semibold uppercase text-blue-600">Aligned</span>
                                            ) : null}
                                        </div>
                                        <Typography variant="bodyMedium" className="text-sm font-semibold text-gray-900">
                                            {goal.title}
                                        </Typography>
                                        <Typography variant="caption" className="mt-1 block text-gray-500">
                                            {goal.weight}
                                        </Typography>
                                    </div>
                                ))}
                            </div>

                            <div className="mx-auto h-10 w-px border-l-2 border-dashed border-violet-300" />

                            <div className="rounded-xl bg-violet-600 px-4 py-4 text-white shadow-lg">
                                <div className="mb-2 flex min-w-0 items-center gap-2">
                                    <Badge label="MY NEW GOAL - DRAFT" variant="white" size="sm" icon={<Link2 className="h-3 w-3" />} />
                                </div>
                                <Typography variant="bodyMedium" className="text-sm font-semibold leading-5 text-white">
                                    Ship Oxygen 2.0 dashboard to 100% of PW employees
                                </Typography>
                                <Typography variant="caption" className="mt-1 block leading-5 text-violet-100">
                                    30% weight - contributes {contribution}% to Rohit's parent
                                </Typography>
                            </div>
                        </div>
                    ) : (
                        <div className="relative min-h-[430px] overflow-hidden rounded-xl bg-white">
                            <div className="absolute left-1/2 top-2 z-10 w-[300px] -translate-x-1/2 rounded-xl border border-blue-300 bg-blue-50 px-5 py-3 text-center shadow-sm">
                                <Typography variant="caption" className="font-semibold uppercase tracking-wide text-blue-600">
                                    Org - Alakh Pandey
                                </Typography>
                                <Typography variant="bodyMedium" className="mt-1 text-sm font-semibold text-gray-900">
                                    Become #1 EdTech platform in India by FY27
                                </Typography>
                            </div>

                            <div className="absolute left-1/2 top-[72px] h-[96px] -translate-x-1/2 border-l-2 border-dashed border-blue-400"></div>
                            <div className="absolute left-[18%] right-[18%] top-[168px] border-t-2 border-dashed border-blue-200"></div>
                            <div className="absolute bottom-[74px] left-[25%] h-[58px] w-[180px] rotate-[-18deg] border-t-4 border-blue-500"></div>
                            <div className="absolute bottom-[95px] right-[24%] h-[48px] w-[92px] rotate-[18deg] border-t-2 border-dashed border-blue-300"></div>

                            <div className="absolute left-5 right-5 top-[150px] grid grid-cols-1 gap-4 md:grid-cols-3">
                                {parentGoals.map((goal) => (
                                    <div
                                        key={goal.title}
                                        className={`rounded-xl border bg-white p-4 shadow-sm ${goal.selected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}`}
                                    >
                                        <div className="mb-2 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge label="KR" variant="info" size="sm" />
                                                <span className="text-xs text-gray-500">Manager</span>
                                            </div>
                                            {goal.selected ? (
                                                <span className="text-[10px] font-semibold uppercase text-blue-600">Aligned</span>
                                            ) : null}
                                        </div>
                                        <Typography variant="bodyMedium" className="text-sm font-semibold text-gray-900">
                                            {goal.title}
                                        </Typography>
                                        <Typography variant="caption" className="mt-1 block text-gray-500">
                                            {goal.weight}
                                        </Typography>
                                    </div>
                                ))}
                            </div>

                            <div className="absolute bottom-0 left-[15%] w-[360px] rounded-xl bg-violet-600 px-5 py-4 text-white shadow-lg">
                                <div className="mb-1 flex items-center gap-2">
                                    <Badge label="MY NEW GOAL - DRAFT" variant="white" size="sm" icon={<Link2 className="h-3 w-3" />} />
                                </div>
                                <Typography variant="bodyMedium" className="text-sm font-semibold text-white">
                                    Ship Oxygen 2.0 dashboard to 100% of PW employees
                                </Typography>
                                <Typography variant="caption" className="mt-1 block text-violet-100">
                                    30% weight - contributes {contribution}% to Rohit's parent
                                </Typography>
                            </div>
                        </div>
                    )}
                </Card>

                <Card className="border border-gray-200 bg-white p-6 shadow-sm" radius="xl" padding="none">
                    <div className="mb-5">
                        <Typography variant="subheading" className="text-gray-900">
                            Contribution to parent
                        </Typography>
                        <Typography variant="caption" className="mt-1 block text-gray-500">
                            How much of your work counts towards Rohit's parent goal
                        </Typography>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-5">
                        <div className="mb-3 flex items-center justify-between">
                            <Typography variant="bodyMedium" className="text-sm text-gray-700">
                                Your contribution
                            </Typography>
                            <span className="text-3xl font-bold text-violet-600">{contribution}%</span>
                        </div>
                        <input
                            aria-label="Your contribution percentage"
                            className="h-2 w-full accent-violet-600"
                            type="range"
                            min="0"
                            max="100"
                            value={contribution}
                            onChange={(event) => setContribution(Number(event.target.value))}
                        />
                        <div className="mt-2 flex justify-between text-xs text-gray-400">
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="rounded-xl bg-violet-50 p-4">
                            <Typography variant="caption" className="uppercase tracking-wide text-gray-500">
                                Rohit's parent now sums to
                            </Typography>
                            <div className="mt-1 flex items-center gap-2">
                                <span className="text-2xl font-bold text-violet-700">{parentContributionTotal}%</span>
                                {parentContributionTotal >= 100 ? (
                                    <Check className="h-4 w-4 text-violet-700" />
                                ) : null}
                            </div>
                            <Typography variant="caption" className="mt-1 block text-gray-500">
                                {parentContributionTotal >= 100
                                    ? 'Over 100% allows slack'
                                    : `${remainingParentContribution}% capacity remaining`}
                            </Typography>
                        </div>
                        <div className="rounded-xl bg-gray-50 p-4">
                            <Typography variant="caption" className="uppercase tracking-wide text-gray-500">
                                Co-contributors
                            </Typography>
                            <Typography variant="bodyMedium" className="mt-1 text-2xl font-bold text-gray-900">
                                4 peers
                            </Typography>
                            <Typography variant="caption" className="mt-1 block text-gray-500">
                                Karthik, Mohit, Vikram, Riya
                            </Typography>
                        </div>
                        <div className="rounded-xl bg-gray-50 p-4">
                            <Typography variant="caption" className="uppercase tracking-wide text-gray-500">
                                Alignment depth
                            </Typography>
                            <Typography variant="bodyMedium" className="mt-1 text-2xl font-bold text-gray-900">
                                3 levels
                            </Typography>
                            <Typography variant="caption" className="mt-1 block text-gray-500">
                                {'Org -> Manager -> You'}
                            </Typography>
                        </div>
                    </div>
                </Card>

                <Card className="border border-gray-200 bg-white p-6 shadow-sm" radius="xl" padding="none">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <Typography variant="subheading" className="text-gray-900">
                                Cross-functional Key Results
                            </Typography>
                            <Typography variant="caption" className="mt-1 block text-gray-500">
                                Shared KRs with teams in other functions
                            </Typography>
                        </div>
                        <Button type="button" variant="soft" bgColor="primary" className="h-9 bg-blue-50 px-3 text-blue-700 hover:bg-blue-100">
                            <Users className="h-4 w-4" />
                            Add collaborator
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {crossFunctionalKrs.map((kr) => (
                            <div key={kr.title} className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 p-4 md:grid-cols-[auto_1fr_auto] md:items-center">
                                <Badge label={kr.team} variant="info" size="sm" />
                                <div>
                                    <Typography variant="bodyMedium" className="text-sm font-semibold text-gray-900">
                                        {kr.title}
                                    </Typography>
                                    <Typography variant="caption" className="mt-1 block text-gray-500">
                                        Owner: {kr.owner}
                                    </Typography>
                                </div>
                                <div className="min-w-[160px]">
                                    <div className="mb-1 flex justify-between text-xs text-gray-500">
                                        <span>{kr.status}</span>
                                        <span>{kr.progress}%</span>
                                    </div>
                                    <div className="h-2 rounded-md bg-gray-100">
                                        <div className="h-full rounded-md bg-blue-500" style={{ width: `${kr.progress}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            <aside className="space-y-4">
                <Card className="border border-gray-200 bg-white p-5 shadow-sm" radius="xl" padding="none">
                    <Typography variant="caption" className="font-semibold uppercase tracking-wide text-gray-500">
                        Alignment options
                    </Typography>
                    <div className="mt-4 space-y-3">
                        {alignmentOptions.map((option) => (
                            <label
                                key={option.label}
                                className={`flex cursor-pointer gap-3 rounded-xl p-4 transition-colors ${selectedOptions.includes(option.label) ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}
                            >
                                <input
                                    aria-label={`Toggle ${option.label} alignment option`}
                                    checked={selectedOptions.includes(option.label)}
                                    className="mt-1 h-4 w-4 accent-blue-600"
                                    type="checkbox"
                                    onChange={() => toggleAlignmentOption(option.label)}
                                />
                                <span>
                                    <Typography variant="bodyMedium" className="text-sm font-semibold text-gray-900">
                                        {option.label}
                                    </Typography>
                                    <Typography variant="caption" className="mt-0.5 block text-gray-500">
                                        {option.helper}
                                    </Typography>
                                </span>
                            </label>
                        ))}
                    </div>
                </Card>

                <Card className="border border-blue-200 bg-blue-50 p-5 shadow-sm" radius="xl" padding="none">
                    <div className="mb-2 flex items-center gap-2 text-blue-700">
                        <Info className="h-4 w-4" />
                        <Typography variant="bodyMedium" className="font-semibold text-blue-700">
                            Why align?
                        </Typography>
                    </div>
                    <Typography variant="caption" className="block text-blue-800">
                        Aligned goals show up in your manager's roll-up dashboard. Org-level reports also use alignment to track strategy execution.
                    </Typography>
                </Card>
            </aside>
        </div>
    );
};

export default GoalAlignment;
