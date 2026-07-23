import { useState } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import Button from '../../../shared/atoms/Button';
import { Select } from '../../../shared/atoms/Select';
import { Typography } from '../../../shared/atoms/Typography';

interface GoalTemplate {
    id: string;
    scope: string;
    title: string;
    usedCount: number;
    recommended?: boolean;
}

interface GoalLibraryPopupProps {
    onClose?: () => void;
    onUseTemplate?: (template: GoalTemplate) => void;
}

const tabs = [
    { label: 'Recommended for you', count: 12, active: true },
    { label: 'All Org templates', count: 142 },
    { label: 'Department · Design', count: 84 },
    { label: 'Role-based', count: 38 },
    { label: 'Used by your team', count: 9 },
];

const templates: GoalTemplate[] = [
    {
        id: 'product-release',
        scope: 'Org',
        title: 'Ship a major product release to all employees',
        usedCount: 142,
        recommended: true,
    },
    {
        id: 'handoff-time',
        scope: 'Function',
        title: 'Reduce handoff time between design and engineering',
        usedCount: 87,
    },
    {
        id: 'mentor-juniors',
        scope: 'Org',
        title: 'Mentor 2 junior team members to next level',
        usedCount: 124,
    },
    {
        id: 'csat',
        scope: 'Org',
        title: 'Maintain CSAT >= 4.5 across cross-functional partners',
        usedCount: 96,
    },
    {
        id: 'thought-leadership',
        scope: 'Function',
        title: 'Launch a thought leadership / content series',
        usedCount: 38,
    },
    {
        id: 'service-incidents',
        scope: 'Function',
        title: 'Reduce service incidents in your area by 30%',
        usedCount: 64,
    },
    {
        id: 'offer-conversion',
        scope: 'Function',
        title: 'Improve interview-to-offer conversion by 20%',
        usedCount: 24,
    },
    {
        id: 'onboard-team',
        scope: 'Manager',
        title: 'Onboard X new team members successfully',
        usedCount: 52,
    },
    {
        id: 'design-ops',
        scope: 'BU',
        title: 'Establish design ops practice in your BU',
        usedCount: 18,
        recommended: true,
    },
];

const departmentOptions = [
    { label: 'Design', value: 'Design' },
    { label: 'Engineering', value: 'Engineering' },
    { label: 'Product', value: 'Product' },
    { label: 'Marketing', value: 'Marketing' },
];

const levelOptions = [
    { label: 'L3 / L4', value: 'L3 / L4' },
    { label: 'L1 / L2', value: 'L1 / L2' },
    { label: 'L5 / L6', value: 'L5 / L6' },
    { label: 'Manager', value: 'Manager' },
];

const GoalLibraryPopup = ({ onClose, onUseTemplate }: GoalLibraryPopupProps) => {
    const [selectedDepartment, setSelectedDepartment] = useState(departmentOptions[0]);
    const [selectedLevel, setSelectedLevel] = useState(levelOptions[0]);

    return (
        <div className="flex h-[90vh] w-full max-w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:min-h-[580px] sm:rounded-xl sm:animate-slideUp">
            <div className="relative z-30 shrink-0 border-b border-gray-100 bg-white px-4 py-2.5 sm:px-5 sm:py-4">

                <Typography variant="h4" className="pr-11 text-lg font-semibold leading-tight text-gray-900 sm:mt-2 sm:text-2xl">
                    Goal Library
                </Typography>

                <button
                    type="button"
                    className="absolute right-3 top-2 flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-700 sm:right-4 sm:top-4"
                    onClick={onClose}
                    aria-label="Close goal library"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            {/* mobile: one scrollable wrapper; desktop (sm:contents): div vanishes, children become direct flex children → restores sticky layout */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto sm:contents">

                {/* Filters */}
                <div className="shrink-0 border-b border-gray-100 bg-white px-4 py-2.5 sm:px-5 sm:py-4">
                    <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-[minmax(280px,1fr)_180px_minmax(180px,240px)]">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:h-11"
                                defaultValue=""
                                placeholder="Search templates · 'design'"
                                aria-label="Search goal templates"
                            />
                        </div>

                        <Select
                            options={departmentOptions}
                            value={selectedDepartment}
                            onChange={setSelectedDepartment}
                            className="relative w-full min-w-0 [&>button]:h-9 [&>button]:min-w-0 [&>button]:px-3 [&>button]:text-sm [&>div]:!w-full sm:[&>button]:h-11"
                        />

                        <Select
                            options={levelOptions}
                            value={selectedLevel}
                            onChange={setSelectedLevel}
                            className="relative w-full min-w-0 sm:col-span-2 lg:col-span-1 [&>button]:h-9 [&>button]:min-w-0 [&>button]:px-3 [&>button]:text-sm [&>div]:!w-full sm:[&>button]:h-11"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex shrink-0 snap-x gap-3 overflow-x-auto border-b border-gray-100 px-4 sm:gap-6 sm:px-5">
                    {tabs.map((tab) => (
                        <button
                            key={tab.label}
                            type="button"
                            aria-label={`Show ${tab.label} templates`}
                            className={`flex h-9 shrink-0 snap-start items-center gap-2 border-b-2 text-sm font-semibold transition sm:h-11 ${tab.active
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <span className="whitespace-nowrap">{tab.label}</span>
                            <span className={`rounded-md px-2 py-0.5 text-xs ${tab.active ? 'bg-blue-50 text-gray-500' : 'bg-gray-100 text-gray-500'}`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Template cards — on desktop only these scroll (flex-1 overflow-y-auto) */}
                <div className="px-4 py-4 sm:min-h-0 sm:flex-1 sm:overflow-y-auto sm:px-5">
                    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                        {templates.map((template) => (
                            <div
                                key={template.id}
                                className={`flex min-w-0 flex-col rounded-xl border bg-white p-3 transition hover:border-blue-200 hover:shadow-sm sm:min-h-[132px] sm:p-4 ${template.recommended
                                    ? 'border-amber-400 bg-amber-50/30'
                                    : 'border-gray-200'
                                    }`}
                            >
                                <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
                                    <Typography variant="caption" className="text-gray-500">
                                        {template.scope}
                                    </Typography>
                                    {template.recommended ? (
                                        <span className="shrink-0 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                                            * For you
                                        </span>
                                    ) : null}
                                </div>

                                <Typography variant="bodyMedium" className="line-clamp-3 break-words text-sm font-semibold leading-5 text-gray-900 sm:line-clamp-2">
                                    {template.title}
                                </Typography>

                                <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between sm:mt-auto">
                                    <Typography variant="caption" className="break-words text-gray-500">
                                        Used {template.usedCount} times this cycle
                                    </Typography>
                                    <Button
                                        type="button"
                                        variant="contain"
                                        bgColor="primary"
                                        className="h-9 w-full shrink-0 justify-center rounded-md bg-blue-600 px-3 text-xs text-white hover:bg-blue-700 min-[420px]:h-8 min-[420px]:w-auto"
                                        onClick={() => onUseTemplate?.(template)}
                                    >
                                        Use template
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex flex-col gap-3 border-t border-gray-100 bg-blue-50/50 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
                    <Typography variant="caption" className="block break-words leading-relaxed text-gray-500">
                        Can't find what you need?{' '}
                        <button type="button" className="font-semibold text-blue-600 hover:text-blue-700" aria-label="Suggest a goal template">
                            Suggest a template <ArrowRight className="inline h-3.5 w-3.5" />
                        </button>
                    </Typography>

                    <Button
                        type="button"
                        variant="outline"
                        bgColor="text"
                        className="h-10 w-full justify-center rounded-lg border-gray-200 bg-white px-4 text-gray-700 hover:bg-gray-50 sm:h-9 sm:w-auto"
                    >
                        Browse all 506
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>

            </div>
        </div>
    );
};

export default GoalLibraryPopup;
