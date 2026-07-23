import React from 'react';
import TemplateCard from './TemplateCard';
import { GoalTemplate, TemplateListProps } from './types';

const templates: GoalTemplate[] = [
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

const AllOrgTemplates = ({ onUseTemplate }: TemplateListProps) => (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {templates.map((template) => (
            <TemplateCard key={template.id} template={template} onUseTemplate={onUseTemplate} />
        ))}
    </div>
);

export default React.memo(AllOrgTemplates);
