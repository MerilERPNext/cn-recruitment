import TemplateCard from './TemplateCard';
import { GoalTemplate, TemplateListProps } from './types';

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

const RoleBasedTemplates = ({ onUseTemplate }: TemplateListProps) => (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {roleBasedTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} onUseTemplate={onUseTemplate} />
        ))}
    </div>
);

export default RoleBasedTemplates;
