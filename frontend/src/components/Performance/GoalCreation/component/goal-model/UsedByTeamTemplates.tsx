import TemplateCard from './TemplateCard';
import { GoalTemplate, TemplateListProps } from './types';

const templates: GoalTemplate[] = [
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

const UsedByTeamTemplates = ({ onUseTemplate }: TemplateListProps) => (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {templates.map((template) => (
            <TemplateCard key={template.id} template={template} onUseTemplate={onUseTemplate} />
        ))}
    </div>
);

export default UsedByTeamTemplates;
