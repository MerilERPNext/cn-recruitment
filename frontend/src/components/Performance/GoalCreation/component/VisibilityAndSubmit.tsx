import { useState } from 'react';
import {
    ArrowRight,
    Building2,
    Check,
    Eye,
    FileCheck2,
    FileText,
    GitBranch,
    LockKeyhole,
    Sparkles,
    Users,
    type LucideIcon,
} from 'lucide-react';
import Badge from '../../../shared/Badge';
import Button from '../../../shared/atoms/Button';
import { Card } from '../../../shared/atoms/Card';
import { Typography } from '../../../shared/atoms/Typography';
import VisibleSettingCards from '../../../shared/VisibleSettingCards';

export type VisibilityOption = 'Private' | 'Manager-only' | 'Team' | 'Org-wide';

export interface VisibilitySetting {
    label: VisibilityOption;
    title: string;
    description: string;
    sees: string;
    icon: LucideIcon;
}

interface PreviewRow {
    label: string;
    value: string;
}

const visibilitySettings: VisibilitySetting[] = [
    {
        label: 'Private',
        title: 'Private',
        description: 'Only you. Manager still gets a read view for approval.',
        sees: 'Sees: You + Rohit (approval only)',
        icon: LockKeyhole,
    },
    {
        label: 'Manager-only',
        title: 'Manager-only',
        description: 'You and Rohit Khanna. Skip manager has read access.',
        sees: 'Sees: You + Rohit + Aditi',
        icon: Eye,
    },
    {
        label: 'Team',
        title: 'Team',
        description: 'Visible to your entire design team - peers can comment.',
        sees: 'Sees: You + 8 teammates',
        icon: GitBranch,
    },
    {
        label: 'Org-wide',
        title: 'Org-wide',
        description: 'Visible to all 2,140 PW employees. Drives cross-team alignment.',
        sees: 'Sees: All PW employees',
        icon: Building2,
    },
];

const workflowSteps = [
    {
        title: 'Submit',
        subtitle: 'You',
        icon: Sparkles,
        tone: 'bg-blue-500 text-white',
        ring: '',
    },
    {
        title: 'Manager review',
        subtitle: 'Rohit Khanna',
        icon: Eye,
        tone: 'bg-white text-blue-500',
        ring: 'border border-dashed border-blue-400',
    },
    {
        title: 'Approved -> Live',
        subtitle: 'Auto',
        icon: FileCheck2,
        tone: 'bg-gray-200 text-gray-500',
        ring: '',
    },
];

const checklist = [
    'Goal title is specific and outcome-oriented',
    'At least 3 measurable Key Results defined',
    'Aligned to parent goal (Rohit Khanna)',
    'Visibility setting confirmed',
    'Weightage and cycle are complete',
];

const previewBaseRows: PreviewRow[] = [
    { label: 'Weightage', value: '30%' },
    { label: 'Cycle', value: 'FY26 - Q1-Q3' },
    { label: 'Aligned to', value: "Rohit Khanna's goal" },
    { label: 'Contribution', value: '35% of parent' },
    { label: 'Co-owners', value: 'Karthik, Neha' },
    { label: 'Auto-pull', value: 'Jira + GitHub' },
];

const previewKeyResults = [
    { id: 'KR1', text: 'Design system v2 components shipped - 32' },
    { id: 'KR2', text: 'Dashboard usability score >= 4.4 / 5' },
    { id: 'KR3', text: 'WAU adoption >= 80% by Q3' },
];

interface VisibilityAndSubmitProps {
    onSubmitForApproval?: () => void;
}

const VisibilityAndSubmit = ({ onSubmitForApproval }: VisibilityAndSubmitProps) => {
    const [selectedVisibility, setSelectedVisibility] = useState<VisibilityOption>('Manager-only');
    const previewRows: PreviewRow[] = [
        ...previewBaseRows.slice(0, 4),
        { label: 'Visibility', value: selectedVisibility },
        ...previewBaseRows.slice(4),
    ];

    return (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
                <Card className="border border-gray-200 bg-white p-5 shadow-sm" radius="xl" padding="none">
                    <div className="mb-4">
                        <Typography variant="subheading" className="text-gray-900">
                            Who can see this goal?
                        </Typography>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {visibilitySettings.map((setting: VisibilitySetting) => {
                            return (
                                <VisibleSettingCards selectedVisibility={selectedVisibility} setSelectedVisibility={setSelectedVisibility} setting={setting} key={setting.label} />
                            );
                        })}
                    </div>
                </Card>

                <Card className="border border-gray-200 bg-white p-5 shadow-sm" radius="xl" padding="none">
                    <div className="mb-4">
                        <Typography variant="subheading" className="text-gray-900">
                            Approval workflow
                        </Typography>
                        <Typography variant="caption" className="mt-1 block text-gray-500">
                            Single-level approval - auto-approves in 2 days if no action
                        </Typography>
                    </div>

                    <div className="rounded-xl bg-blue-50 p-5">
                        <div className="grid grid-cols-1 mx-auto w-fit  gap-6 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
                            {workflowSteps.map((step, index) => {
                                const Icon = step.icon;

                                return (
                                    <div key={step.title} className="contents">
                                        <div className="flex flex-col items-center text-center">
                                            <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-full ${step.tone} ${step.ring}`}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <Typography variant="caption" className="font-semibold text-gray-800">
                                                {step.title}
                                            </Typography>
                                            <Typography variant="caption" className="mt-1 block text-gray-500">
                                                {step.subtitle}
                                            </Typography>
                                        </div>
                                        {index < workflowSteps.length - 1 ? (
                                            <ArrowRight className="mx-auto hidden h-4 w-4 text-gray-300 md:block" />
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-5 rounded-lg bg-white px-4 py-3 text-xs text-gray-600">
                            <span className="font-semibold text-gray-700">SLA:</span> Rohit has 2 days to approve - escalates to Aditi Sharma (skip) after 5 days - <span className="font-semibold text-gray-700">Smart nudge</span> kicks in at 24h.
                        </div>
                    </div>
                </Card>

                <Card className="border border-gray-200 bg-white p-5 shadow-sm" radius="xl" padding="none">
                    <Typography variant="subheading" className="text-gray-900">
                        Pre-submit checklist
                    </Typography>

                    <div className="mt-4 space-y-2">
                        {checklist.map((item, index) => (
                            <div
                                key={item}
                                className={`flex items-center gap-3 rounded-lg px-3 py-3 ${index % 2 === 1 ? 'bg-blue-50/60' : 'bg-white'}`}
                            >
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                                    <Check className="h-3 w-3" />
                                </span>
                                <Typography variant="caption" className="text-gray-700">
                                    {item}
                                </Typography>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            <aside className="space-y-4">
                <Card className="overflow-hidden border border-blue-300 bg-white p-0 shadow-sm" radius="xl" padding="none">
                    <div className="border-b border-blue-200 bg-blue-50 px-4 py-4">
                        <Typography variant="caption" className="font-semibold uppercase tracking-wide text-blue-600">
                            Ready to submit
                        </Typography>
                        <Typography variant="bodyMedium" className="font-semibold text-gray-900">
                            Goal Preview
                        </Typography>
                    </div>

                    <div className="p-4">
                        <div className="mb-4 flex flex-wrap gap-2">
                            <Badge label="OKR - Individual" variant="purple" size="sm" />
                            <Badge label="Draft" variant="default" size="sm" />
                        </div>

                        <Typography variant="bodyMedium" className="text-base font-semibold leading-6 text-gray-900">
                            Ship Oxygen 2.0 dashboard to 100% of PW employees
                        </Typography>

                        <div className="mt-4 space-y-2">
                            {previewRows.map((row) => (
                                <div key={row.label} className="grid grid-cols-[110px_minmax(0,1fr)] gap-2 text-xs">
                                    <span className="text-gray-500">{row.label}</span>
                                    <span className="text-right font-medium text-gray-700">{row.value}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 border-t border-gray-100 pt-4">
                            <Typography variant="caption" className="font-semibold uppercase tracking-wide text-gray-500">
                                Key Results - 3
                            </Typography>
                            <div className="mt-3 space-y-2">
                                {previewKeyResults.map((result) => (
                                    <div key={result.id} className="grid grid-cols-[32px_minmax(0,1fr)] gap-2 text-xs">
                                        <span className="font-semibold text-blue-600">{result.id}</span>
                                        <span className="text-gray-600">{result.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 bg-gray-50 p-4">
                        <Button
                            type="button"
                            variant="contain"
                            bgColor="primary"
                            fullWidth
                            className="h-10 justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                            onClick={onSubmitForApproval}
                        >
                            Submit for Approval
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            bgColor="text"
                            fullWidth
                            className="mt-3 h-9 justify-center rounded-lg border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        >
                            Save as Draft
                        </Button>
                    </div>
                </Card>

                <Card className="border border-gray-200 bg-white p-4 shadow-sm" radius="xl" padding="none">
                    <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                            <FileText className="h-4 w-4" />
                        </div>
                        <div>
                            <Typography variant="bodyMedium" className="font-semibold text-gray-900">
                                Submission notes
                            </Typography>
                            <Typography variant="caption" className="mt-1 block text-gray-500">
                                Rohit receives the approval request with your alignment, KRs, owners, and visibility setting.
                            </Typography>
                        </div>
                    </div>
                </Card>

                <Card className="border border-blue-200 bg-blue-50 p-4 shadow-sm" radius="xl" padding="none">
                    <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600">
                            <Users className="h-4 w-4" />
                        </div>
                        <div>
                            <Typography variant="bodyMedium" className="font-semibold text-blue-800">
                                Visibility selected
                            </Typography>
                            <Typography variant="caption" className="mt-1 block text-blue-700">
                                {selectedVisibility} keeps this OKR visible to the right audience before it goes live.
                            </Typography>
                        </div>
                    </div>
                </Card>
            </aside>
        </div>
    );
};

export default VisibilityAndSubmit;
