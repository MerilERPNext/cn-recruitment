import React from 'react';
import TemplateCard from './TemplateCard';
import { GoalTemplate, TemplateListProps } from './types';

const templates: GoalTemplate[] = [
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

const DepartmentTemplates = ({ onUseTemplate }: TemplateListProps) => (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {templates.map((template) => (
            <TemplateCard key={template.id} template={template} onUseTemplate={onUseTemplate} />
        ))}
    </div>
);

export default React.memo(DepartmentTemplates);
