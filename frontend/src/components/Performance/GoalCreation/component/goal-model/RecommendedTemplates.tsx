import React from 'react';
import { Search } from 'lucide-react';
import TemplateCard from './TemplateCard';
import { GoalTemplate, TemplateListProps, filterTemplates, getGoalKey } from './types';
import { Typography } from '../../../../shared/atoms/Typography';

export const recommendedTemplatesData: GoalTemplate[] = [
    {
        goal: 'GOAL-26-03450',
        title: 'Ship a major product release to all employees',
        description: 'Deliver the major product release v3.0 with complete release notes',
        goal_type: 'OKR',
        category: 'Individual',
        department: 'Product',
        department_title: 'Product',
        weightage: 20,
        scorecard_pillar: null,
        performance_cycle: 'FY2026-ANNUAL',
        owner_employee: 'PW-00005',
        owner_employee_name: 'Ajay Jogdand',
        key_results: []
    },
    {
        goal: 'GOAL-26-03451',
        title: 'Reduce handoff time between design and engineering',
        description: 'Streamline design handoff workflows and component specs',
        goal_type: 'OKR',
        category: 'Individual',
        department: 'Design',
        department_title: 'Design',
        weightage: 15,
        scorecard_pillar: null,
        performance_cycle: 'FY2026-ANNUAL',
        owner_employee: 'PW-00005',
        owner_employee_name: 'Ajay Jogdand',
        key_results: []
    },
    {
        goal: 'GOAL-26-03452',
        title: 'Mentor 2 junior team members to next level',
        description: 'Conduct weekly 1-on-1 mentorship and career growth sessions',
        goal_type: 'MBO',
        category: 'Individual',
        department: 'Engineering',
        department_title: 'Engineering',
        weightage: 10,
        scorecard_pillar: null,
        performance_cycle: 'FY2026-ANNUAL',
        owner_employee: 'PW-00005',
        owner_employee_name: 'Ajay Jogdand',
        key_results: []
    },
    {
        goal: 'GOAL-26-03453',
        title: 'Maintain CSAT >= 4.5 across cross-functional partners',
        description: 'Gather quarterly CSAT feedback and resolve partner queries',
        goal_type: 'OKR',
        category: 'Individual',
        department: 'Marketing',
        department_title: 'Marketing',
        weightage: 15,
        scorecard_pillar: null,
        performance_cycle: 'FY2026-ANNUAL',
        owner_employee: 'PW-00005',
        owner_employee_name: 'Ajay Jogdand',
        key_results: []
    },
    {
        goal: 'GOAL-26-03454',
        title: 'Launch a thought leadership / content series',
        description: 'Publish 4 articles on industry best practices and tech trends',
        goal_type: 'OKR',
        category: 'Individual',
        department: 'Marketing',
        department_title: 'Marketing',
        weightage: 10,
        scorecard_pillar: null,
        performance_cycle: 'FY2026-ANNUAL',
        owner_employee: 'PW-00005',
        owner_employee_name: 'Ajay Jogdand',
        key_results: []
    },
    {
        goal: 'GOAL-26-03455',
        title: 'Reduce service incidents in your area by 30%',
        description: 'Implement automated monitoring and defensive error handling',
        goal_type: 'MBO',
        category: 'Individual',
        department: 'Engineering',
        department_title: 'Engineering',
        weightage: 15,
        scorecard_pillar: null,
        performance_cycle: 'FY2026-ANNUAL',
        owner_employee: 'PW-00005',
        owner_employee_name: 'Ajay Jogdand',
        key_results: []
    },
    {
        goal: 'GOAL-26-03456',
        title: 'Improve interview-to-offer conversion by 20%',
        description: 'Optimize recruitment candidate screening pipeline',
        goal_type: 'OKR',
        category: 'Individual',
        department: 'Human Resources',
        department_title: 'Human Resources',
        weightage: 15,
        scorecard_pillar: null,
        performance_cycle: 'FY2026-ANNUAL',
        owner_employee: 'PW-00005',
        owner_employee_name: 'Ajay Jogdand',
        key_results: []
    }
];

interface RecommendedTemplatesProps extends TemplateListProps {
    recommendedTemplatesData?: GoalTemplate[];
}

const RecommendedTemplates = ({
    onUseTemplate,
    searchQuery = '',
    selectedDepartment = 'All',
    selectedDesignation = 'All',
    recommendedTemplatesData,
}: RecommendedTemplatesProps) => {
    const templatesToUse = recommendedTemplatesData || [];
    const filteredTemplates = filterTemplates(
        templatesToUse,
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
                    key={getGoalKey(template)}
                    template={template}
                    onUseTemplate={(t) => {
                        const repoGoals = (t as any).repository_goals;
                        if (repoGoals) {
                            onUseTemplate?.(repoGoals);
                        }
                    }}
                />
            ))}
        </div>
    );
};

export default React.memo(RecommendedTemplates);

