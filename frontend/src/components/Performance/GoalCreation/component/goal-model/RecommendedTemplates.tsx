import React from 'react';
import { Search } from 'lucide-react';
import TemplateCard from './TemplateCard';
import { GoalTemplate, TemplateListProps, filterTemplates } from './types';
import { Typography } from '../../../../shared/atoms/Typography';

export const recommendedTemplatesData: GoalTemplate[] = [
    {
        id: 'product-release',
        scope: 'Org',
        title: 'Ship a major product release to all employees',
        usedCount: 142,
        recommended: true,
        department: 'Product',
        designation: 'Manager',
    },
    {
        id: 'handoff-time',
        scope: 'Function',
        title: 'Reduce handoff time between design and engineering',
        usedCount: 87,
        department: 'Design',
        designation: 'L3 / L4',
    },
    {
        id: 'mentor-juniors',
        scope: 'Org',
        title: 'Mentor 2 junior team members to next level',
        usedCount: 124,
        department: 'Engineering',
        designation: 'L5 / L6',
    },
    {
        id: 'csat',
        scope: 'Org',
        title: 'Maintain CSAT >= 4.5 across cross-functional partners',
        usedCount: 96,
        department: 'Marketing',
        designation: 'Manager',
    },
    {
        id: 'thought-leadership',
        scope: 'Function',
        title: 'Launch a thought leadership / content series',
        usedCount: 38,
        department: 'Marketing',
        designation: 'Director',
    },
    {
        id: 'service-incidents',
        scope: 'Function',
        title: 'Reduce service incidents in your area by 30%',
        usedCount: 64,
        department: 'Engineering',
        designation: 'L3 / L4',
    },
    {
        id: 'offer-conversion',
        scope: 'Function',
        title: 'Improve interview-to-offer conversion by 20%',
        usedCount: 24,
        department: 'HR',
        designation: 'L3 / L4',
    },
    {
        id: 'onboard-team',
        scope: 'Manager',
        title: 'Onboard X new team members successfully',
        usedCount: 52,
        department: 'HR',
        designation: 'Manager',
    },
    {
        id: 'design-ops',
        scope: 'BU',
        title: 'Establish design ops practice in your BU',
        usedCount: 18,
        recommended: true,
        department: 'Design',
        designation: 'L5 / L6',
    },
    {
        id: 'retention-score',
        scope: 'Org',
        title: 'Improve employee retention score by 15% YoY',
        usedCount: 76,
        department: 'HR',
        designation: 'Director',
    },
    {
        id: 'docs-coverage',
        scope: 'Function',
        title: 'Achieve 90% documentation coverage for all APIs',
        usedCount: 31,
        department: 'Engineering',
        designation: 'L1 / L2',
    },
    {
        id: 'feedback-loop',
        scope: 'Manager',
        title: 'Establish bi-weekly feedback loops across the team',
        usedCount: 45,
        department: 'Design',
        designation: 'Manager',
    },
];

const RecommendedTemplates = ({
    onUseTemplate,
    searchQuery = '',
    selectedDepartment = 'All',
    selectedDesignation = 'All',
}: TemplateListProps) => {
    const filteredTemplates = filterTemplates(
        recommendedTemplatesData,
        searchQuery,
        selectedDepartment,
        selectedDesignation
    );

    if (filteredTemplates.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-6">
                <Search className="h-8 w-8 text-gray-400 mb-2" />
                <Typography variant="bodyMedium" className="font-semibold text-gray-700">
                    No matching goals found
                </Typography>
                <Typography variant="caption" className="text-gray-500 mt-1">
                    Try refining your search keyword or clearing department/designation filters.
                </Typography>
            </div>
        );
    }

    return (
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {filteredTemplates.map((template) => (
                <TemplateCard
                    key={template.id}
                    template={template}
                    onUseTemplate={onUseTemplate}
                />
            ))}
        </div>
    );
};

export default React.memo(RecommendedTemplates);

