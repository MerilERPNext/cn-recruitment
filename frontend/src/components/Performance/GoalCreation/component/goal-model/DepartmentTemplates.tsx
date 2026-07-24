import React from 'react';
import { CheckSquare, Square, Search } from 'lucide-react';
import TemplateCard from './TemplateCard';
import { GoalTemplate, TemplateListProps, filterTemplates } from './types';
import Button from '../../../../shared/atoms/Button';
import { Typography } from '../../../../shared/atoms/Typography';

export const departmentTemplatesData: GoalTemplate[] = [
    { id: 'dep-01', scope: 'Design', title: 'Define and ship a unified design system v2.0', usedCount: 94, recommended: true, department: 'Design', designation: 'L3 / L4' },
    { id: 'dep-02', scope: 'Design', title: 'Reduce design-to-dev handoff time by 40%', usedCount: 87, department: 'Design', designation: 'L3 / L4' },
    { id: 'dep-03', scope: 'Design', title: 'Conduct 12 user research sessions this quarter', usedCount: 76, department: 'Design', designation: 'L1 / L2' },
    { id: 'dep-04', scope: 'Design', title: 'Achieve 90% accessibility compliance across all products', usedCount: 68, department: 'Design', designation: 'L5 / L6' },
    { id: 'dep-05', scope: 'Design', title: 'Establish a reusable component library with 50+ components', usedCount: 61, department: 'Design', designation: 'L3 / L4' },
    { id: 'dep-06', scope: 'Design', title: 'Run quarterly design critiques for all shipped features', usedCount: 55, department: 'Design', designation: 'Manager' },
    { id: 'dep-07', scope: 'Engineering', title: 'Refactor monolith services into scalable microservices', usedCount: 48, department: 'Engineering', designation: 'L5 / L6' },
    { id: 'dep-08', scope: 'Product', title: 'Publish product roadmap & quarterly OKR milestones', usedCount: 43, department: 'Product', designation: 'Manager' },
    { id: 'dep-09', scope: 'Marketing', title: 'Deliver end-to-end rebranding campaign across touchpoints', usedCount: 39, department: 'Marketing', designation: 'Director' },
];

const DepartmentTemplates = ({
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
        departmentTemplatesData,
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

export default React.memo(DepartmentTemplates);

