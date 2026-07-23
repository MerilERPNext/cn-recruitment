import { FileText, GitBranch, Sparkles } from 'lucide-react';
import { GoalTemplate } from './component/goal-model/types';
import type {
    MetricType,
    CategoryType,
    MetricSelectOption,
    CategorySelectOption,
    KeyResult,
    AutoPullSource,
} from './Type';

export const recommendedTemplates: GoalTemplate[] = [
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
    {
        id: 'retention-score',
        scope: 'Org',
        title: 'Improve employee retention score by 15% YoY',
        usedCount: 76,
    },
    {
        id: 'docs-coverage',
        scope: 'Function',
        title: 'Achieve 90% documentation coverage for all APIs',
        usedCount: 31,
    },
    {
        id: 'feedback-loop',
        scope: 'Manager',
        title: 'Establish bi-weekly feedback loops across the team',
        usedCount: 45,
    },
];

export const allOrgTemplates: GoalTemplate[] = [
    { id: 'org-01', scope: 'Org', title: 'Drive company-wide Net Promoter Score above 60', usedCount: 312 },
    { id: 'org-02', scope: 'Org', title: 'Launch new employee onboarding program in Q2', usedCount: 278 },
    { id: 'org-03', scope: 'Org', title: 'Achieve 95% performance review completion rate', usedCount: 245, recommended: true },
    { id: 'org-04', scope: 'Org', title: 'Reduce overall operational costs by 10%', usedCount: 198 },
    { id: 'org-05', scope: 'Org', title: 'Launch quarterly all-hands knowledge sharing sessions', usedCount: 176 },
    { id: 'org-06', scope: 'Org', title: 'Increase internal mobility rate by 20% this FY', usedCount: 164 },
    { id: 'org-07', scope: 'Function', title: 'Improve cross-team collaboration index by 25%', usedCount: 153 },
    { id: 'org-08', scope: 'BU', title: 'Achieve BU-level profitability target of 18% margin', usedCount: 141 },
    { id: 'org-09', scope: 'Org', title: 'Standardise OKR process across all departments', usedCount: 139 },
    { id: 'org-10', scope: 'Org', title: 'Build and publish organisation capability framework', usedCount: 127 },
    { id: 'org-11', scope: 'Function', title: 'Deliver 3 cross-functional innovation sprints', usedCount: 115 },
    { id: 'org-12', scope: 'Org', title: 'Reduce voluntary attrition to below 12% annually', usedCount: 108 },
];

export const departmentTemplates: GoalTemplate[] = [
    { id: 'dep-01', scope: 'Design', title: 'Define and ship a unified design system v2.0', usedCount: 94, recommended: true },
    { id: 'dep-02', scope: 'Design', title: 'Reduce design-to-dev handoff time by 40%', usedCount: 87 },
    { id: 'dep-03', scope: 'Design', title: 'Conduct 12 user research sessions this quarter', usedCount: 76 },
    { id: 'dep-04', scope: 'Design', title: 'Achieve 90% accessibility compliance across all products', usedCount: 68 },
    { id: 'dep-05', scope: 'Design', title: 'Establish a reusable component library with 50+ components', usedCount: 61 },
    { id: 'dep-06', scope: 'Design', title: 'Run quarterly design critiques for all shipped features', usedCount: 55 },
    { id: 'dep-07', scope: 'Design', title: 'Improve designer satisfaction score to 4.2 / 5', usedCount: 48 },
    { id: 'dep-08', scope: 'Design', title: 'Publish a design principles document adopted org-wide', usedCount: 43 },
    { id: 'dep-09', scope: 'Design', title: 'Deliver end-to-end redesign of the core dashboard', usedCount: 39 },
];

export const roleBasedTemplates: GoalTemplate[] = [
    { id: 'role-01', scope: 'IC L3 / L4', title: 'Deliver 3 high-impact features with zero P1 bugs', usedCount: 88, recommended: true },
    { id: 'role-02', scope: 'IC L3 / L4', title: 'Complete 2 cross-functional projects this quarter', usedCount: 74 },
    { id: 'role-03', scope: 'IC L5 / L6', title: 'Lead architecture review for platform migration', usedCount: 66 },
    { id: 'role-04', scope: 'IC L5 / L6', title: 'Reduce system latency by 20% across critical paths', usedCount: 59 },
    { id: 'role-05', scope: 'Manager', title: 'Grow at least 2 team members to next level by year-end', usedCount: 52 },
    { id: 'role-06', scope: 'Manager', title: 'Achieve team engagement score >= 4.3 in bi-annual survey', usedCount: 47 },
    { id: 'role-07', scope: 'Director', title: 'Define and execute department roadmap for FY26', usedCount: 41 },
    { id: 'role-08', scope: 'Director', title: 'Build 3 strategic partnerships with external vendors', usedCount: 35 },
    { id: 'role-09', scope: 'VP', title: 'Drive BU revenue growth of 25% year-over-year', usedCount: 28 },
];

export const usedByTeamTemplates: GoalTemplate[] = [
    { id: 'team-01', scope: 'Design', title: 'Improve team design review velocity by 30%', usedCount: 9, recommended: true },
    { id: 'team-02', scope: 'Design', title: 'Adopt shared Figma component library across team', usedCount: 8 },
    { id: 'team-03', scope: 'Design', title: 'Reduce rework cycles on design handoffs to zero', usedCount: 7 },
    { id: 'team-04', scope: 'Design', title: 'Ship mobile-first redesign of the onboarding flow', usedCount: 6 },
    { id: 'team-05', scope: 'Design', title: 'Complete team accessibility audit on all active screens', usedCount: 5 },
    { id: 'team-06', scope: 'Design', title: 'Hold monthly team retrospectives with action tracking', usedCount: 5 },
    { id: 'team-07', scope: 'Design', title: 'Achieve 100% on-time delivery of design assets', usedCount: 4 },
    { id: 'team-08', scope: 'Design', title: 'Grow team skill score in motion design by EOY', usedCount: 3 },
    { id: 'team-09', scope: 'Design', title: 'Establish peer feedback culture across design team', usedCount: 3 },
];

export const tags = ['product', 'oxygen', 'rollout', 'fy26-q3'];

export const metricTypeOptions: MetricType[] = ['%', 'Number', 'Count', 'Currency', 'Boolean', 'Milestone'];

export const categoryOptions: CategoryType[] = [
    'Organisational',
    'Business',
    'Functional',
    'Team',
    'Individual',
    'Development',
];

export const metricSelectOptions: MetricSelectOption[] = metricTypeOptions.map((option) => ({
    label: option,
    value: option,
}));

export const categorySelectOptions: CategorySelectOption[] = categoryOptions.map((option) => ({
    label: option,
    value: option,
}));

export const autoPullSources: AutoPullSource[] = [
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

export const keyResults: KeyResult[] = [
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
