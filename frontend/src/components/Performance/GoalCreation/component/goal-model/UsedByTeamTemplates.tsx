import React from 'react';
import { CheckSquare, Square, Search } from 'lucide-react';
import TemplateCard from './TemplateCard';
import { GoalTemplate, TemplateListProps, filterTemplates } from './types';
import Button from '../../../../shared/atoms/Button';
import { Typography } from '../../../../shared/atoms/Typography';

export const usedByTeamTemplatesData: GoalTemplate[] = [
    { id: 'team-01', scope: 'Design', title: 'Improve team design review velocity by 30%', usedCount: 9, recommended: true, department: 'Design', designation: 'L3 / L4' },
    { id: 'team-02', scope: 'Design', title: 'Adopt shared Figma component library across team', usedCount: 8, department: 'Design', designation: 'L1 / L2' },
    { id: 'team-03', scope: 'Design', title: 'Reduce rework cycles on design handoffs to zero', usedCount: 7, department: 'Engineering', designation: 'L3 / L4' },
    { id: 'team-04', scope: 'Design', title: 'Ship mobile-first redesign of the onboarding flow', usedCount: 6, department: 'Product', designation: 'Manager' },
    { id: 'team-05', scope: 'Design', title: 'Complete team accessibility audit on all active screens', usedCount: 5, department: 'Engineering', designation: 'L5 / L6' },
    { id: 'team-06', scope: 'Design', title: 'Hold monthly team retrospectives with action tracking', usedCount: 5, department: 'HR', designation: 'Manager' },
    { id: 'team-07', scope: 'Design', title: 'Achieve 100% on-time delivery of design assets', usedCount: 4, department: 'Marketing', designation: 'L3 / L4' },
    { id: 'team-08', scope: 'Design', title: 'Grow team skill score in motion design by EOY', usedCount: 3, department: 'Design', designation: 'L5 / L6' },
    { id: 'team-09', scope: 'Design', title: 'Establish peer feedback culture across design team', usedCount: 3, department: 'HR', designation: 'L1 / L2' },
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

    const selectedIds = selectedTemplates.map((t) => t.id);

    const isAllSelected =
        filteredTemplates.length > 0 &&
        filteredTemplates.every((t) => selectedIds.includes(t.id));

    const totalSelectedWeightage = selectedTemplates.reduce(
        (acc, item) => acc + (weightages[item.id] ?? 10),
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
                        key={template.id}
                        template={template}
                        hideUseTemplate={true}
                        isSelected={selectedIds.includes(template.id)}
                        onToggleSelect={onToggleSelect}
                        weightage={weightages[template.id] ?? 10}
                        onWeightageChange={onWeightageChange}
                    />
                ))}
            </div>
        </div>
    );
};

export default React.memo(UsedByTeamTemplates);

