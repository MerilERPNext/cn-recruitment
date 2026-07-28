import React from 'react';
import { CheckSquare, Square, Search } from 'lucide-react';
import TemplateCard from './TemplateCard';
import { GoalTemplate, TemplateListProps, filterTemplates, getGoalKey } from './types';
import Button from '../../../../shared/atoms/Button';
import { Typography } from '../../../../shared/atoms/Typography';

export const usedByTeamTemplatesData: GoalTemplate[] = [
    {
        goal: 'GOAL-26-03465',
        title: 'Improve team design review velocity by 30%',
        description: 'Accelerate design critique turns and sign-off SLA',
        goal_type: 'OKR',
        category: 'Individual',
        department: 'Design',
        department_title: 'Design',
        weightage: 20,
        scorecard_pillar: null,
        performance_cycle: 'FY2026-ANNUAL',
        owner_employee: 'PW-00005',
        owner_employee_name: 'Ajay Jogdand',
        key_results: []
    },
    {
        goal: 'GOAL-26-03466',
        title: 'Adopt shared Figma component library across team',
        description: 'Unify design assets across team projects',
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
        goal: 'GOAL-26-03467',
        title: 'Reduce rework cycles on design handoffs to zero',
        description: 'Clear documentation and dev specs for smooth engineering handoff',
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
        goal: 'GOAL-26-03468',
        title: 'Ship mobile-first redesign of the onboarding flow',
        description: 'Redesign initial sign-up and onboarding user journey',
        goal_type: 'OKR',
        category: 'Individual',
        department: 'Product',
        department_title: 'Product',
        weightage: 25,
        scorecard_pillar: null,
        performance_cycle: 'FY2026-ANNUAL',
        owner_employee: 'PW-00005',
        owner_employee_name: 'Ajay Jogdand',
        key_results: []
    }
];

const UsedByTeamTemplates = ({
    onUseTemplate,
    searchQuery = '',
    selectedDepartment = 'All',
    selectedDesignation = 'All',
    selectedTemplates = [],
    onToggleSelect,
    onSelectAll,
    weightages = {},
    onWeightageChange,
}: TemplateListProps) => {
    const filteredTemplates = filterTemplates(
        usedByTeamTemplatesData,
        searchQuery,
        selectedDepartment,
        selectedDesignation
    );

    const selectedIds = selectedTemplates.map((t) => getGoalKey(t));

    const isAllSelected =
        filteredTemplates.length > 0 &&
        filteredTemplates.every((t) => selectedIds.includes(getGoalKey(t)));

    const totalSelectedWeightage = selectedTemplates.reduce(
        (acc, item) => acc + (weightages[getGoalKey(item)] ?? 10),
        0
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
        <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-blue-50/60 px-4 py-2.5 border border-blue-100">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
                    <button
                        type="button"
                        onClick={() => onSelectAll?.(filteredTemplates)}
                        className="flex items-center gap-2 hover:text-blue-700 font-semibold"
                    >
                        {isAllSelected ? (
                            <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                            <Square className="h-4 w-4 text-gray-400" />
                        )}
                        <span>
                            {selectedTemplates.length > 0
                                ? `${selectedTemplates.length} Goals Selected (${totalSelectedWeightage}% Weightage)`
                                : 'Multi-select Goals'}
                        </span>
                    </button>
                </div>

                {selectedTemplates.length > 0 && (
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="contain"
                            bgColor="primary"
                            className="h-8 text-xs bg-blue-600 text-white hover:bg-blue-700"
                            onClick={() => onUseTemplate?.(selectedTemplates)}
                        >
                            Add {selectedTemplates.length} Selected Goal{selectedTemplates.length > 1 ? 's' : ''}
                        </Button>
                    </div>
                )}
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                {filteredTemplates.map((template) => (
                    <TemplateCard
                        key={getGoalKey(template)}
                        template={template}
                        hideUseTemplate={true}
                        isSelected={selectedIds.includes(getGoalKey(template))}
                        onToggleSelect={onToggleSelect}
                        weightage={weightages[getGoalKey(template)] ?? 10}
                        onWeightageChange={onWeightageChange}
                    />
                ))}
            </div>
        </div>
    );
};

export default React.memo(UsedByTeamTemplates);

