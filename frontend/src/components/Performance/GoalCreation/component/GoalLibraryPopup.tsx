import { ArrowRight, Search, X } from 'lucide-react';
import Button from '../../../shared/atoms/Button';
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

const selectClass = 'h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

const GoalLibraryPopup = ({ onClose, onUseTemplate }: GoalLibraryPopupProps) => {
    return (
        <div className="animate-slideUp flex h-full min-h-0 flex-col overflow-hidden bg-white shadow-2xl sm:min-h-[690px] sm:rounded-xl">
            <div className="relative shrink-0 border-b border-gray-100 px-5 py-4">
                

                <Typography variant="h4" className="mt-2 text-2xl font-semibold text-gray-900">
                    Goal Library
                </Typography>

                <button
                    type="button"
                    className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
                    onClick={onClose}
                    aria-label="Close goal library"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="shrink-0 border-b border-gray-100 px-5 py-4">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[180px_minmax(0,1fr)_minmax(180px,380px)]">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                            defaultValue=""
                            placeholder="Search templates · 'design'"
                        />
                    </div>

                    <select className={selectClass} defaultValue="Design">
                        <option>Design</option>
                        <option>Engineering</option>
                        <option>Product</option>
                        <option>Marketing</option>
                    </select>

                    <select className={selectClass} defaultValue="L3 / L4">
                        <option>L3 / L4</option>
                        <option>L1 / L2</option>
                        <option>L5 / L6</option>
                        <option>Manager</option>
                    </select>
                </div>
            </div>

            <div className="flex shrink-0 gap-6 overflow-x-auto border-b border-gray-100 px-5">
                {tabs.map((tab) => (
                    <button
                        key={tab.label}
                        type="button"
                        className={`flex h-11 shrink-0 items-center gap-2 border-b-2 text-sm font-semibold transition ${tab.active
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <span>{tab.label}</span>
                        <span className={`rounded-md px-2 py-0.5 text-xs ${tab.active ? 'bg-blue-50 text-gray-500' : 'bg-gray-100 text-gray-500'}`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {templates.map((template) => (
                        <div
                            key={template.id}
                            className={`flex min-h-[124px] flex-col rounded-xl border bg-white p-4 transition hover:border-blue-200 hover:shadow-sm ${template.recommended
                                ? 'border-amber-400 bg-amber-50/30'
                                : 'border-gray-200'
                                }`}
                        >
                            <div className="mb-3 flex items-start justify-between gap-3">
                                <Typography variant="caption" className="text-gray-500">
                                    {template.scope}
                                </Typography>
                                {template.recommended ? (
                                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                                        * For you
                                    </span>
                                ) : null}
                            </div>

                            <Typography variant="bodyMedium" className="line-clamp-2 text-sm font-semibold leading-5 text-gray-900">
                                {template.title}
                            </Typography>

                            <div className="mt-auto flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
                                <Typography variant="caption" className="text-gray-500">
                                    Used {template.usedCount} times this cycle
                                </Typography>
                                <Button
                                    type="button"
                                    variant="contain"
                                    bgColor="primary"
                                    className="h-8 shrink-0 justify-center rounded-md bg-blue-600 px-3 text-xs text-white hover:bg-blue-700"
                                    onClick={() => onUseTemplate?.(template)}
                                >
                                    Use template
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="shrink-0 flex flex-col gap-3 border-t border-gray-100 bg-blue-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <Typography variant="caption" className="text-gray-500">
                    Can't find what you need?{' '}
                    <button type="button" className="font-semibold text-blue-600 hover:text-blue-700">
                        Suggest a template <ArrowRight className="inline h-3.5 w-3.5" />
                    </button>
                </Typography>

                <Button
                    type="button"
                    variant="outline"
                    bgColor="text"
                    className="h-9 justify-center rounded-lg border-gray-200 bg-white px-4 text-gray-700 hover:bg-gray-50"
                >
                    Browse all 506
                    <ArrowRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

export default GoalLibraryPopup;
