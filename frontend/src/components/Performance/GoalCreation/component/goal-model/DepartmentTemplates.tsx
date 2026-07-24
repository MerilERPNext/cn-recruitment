import React, { useState } from 'react';
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
}: TemplateListProps) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [weightages, setWeightages] = useState<Record<string, number>>({});

    const filteredTemplates = filterTemplates(
        departmentTemplatesData,
        searchQuery,
        selectedDepartment,
        selectedDesignation
    );

    const handleToggleSelect = (template: GoalTemplate) => {
        setSelectedIds((prev) =>
            prev.includes(template.id)
                ? prev.filter((id) => id !== template.id)
                : [...prev, template.id]
        );
    };

    const handleWeightageChange = (template: GoalTemplate, weight: number) => {
        setWeightages((prev) => ({
            ...prev,
            [template.id]: weight,
        }));
    };

    const isAllSelected =
        filteredTemplates.length > 0 &&
        filteredTemplates.every((t) => selectedIds.includes(t.id));

    const handleSelectAll = () => {
        if (isAllSelected) {
            const filteredIds = new Set(filteredTemplates.map((t) => t.id));
            setSelectedIds((prev) => prev.filter((id) => !filteredIds.has(id)));
        } else {
            const filteredIds = filteredTemplates.map((t) => t.id);
            setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
        }
    };

    const totalSelectedWeightage = selectedIds.reduce(
        (acc, id) => acc + (weightages[id] ?? 10),
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
                        onClick={handleSelectAll}
                        className="flex items-center gap-2 hover:text-blue-700 font-semibold"
                    >
                        {isAllSelected ? (
                            <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                            <Square className="h-4 w-4 text-gray-400" />
                        )}
                        <span>
                            {selectedIds.length > 0
                                ? `${selectedIds.length} Goals Selected (${totalSelectedWeightage}% Weightage)`
                                : 'Multi-select Goals'}
                        </span>
                    </button>
                </div>

                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-8 text-xs bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
                            onClick={() => setSelectedIds([])}
                        >
                            Clear
                        </Button>
                        <Button
                            type="button"
                            variant="contain"
                            bgColor="primary"
                            className="h-8 text-xs bg-blue-600 text-white hover:bg-blue-700"
                            onClick={() => {
                                const selectedTemplates = departmentTemplatesData.filter((t) => selectedIds.includes(t.id));
                                selectedTemplates.forEach((t) => onUseTemplate?.(t));
                            }}
                        >
                            Add {selectedIds.length} Selected Goal{selectedIds.length > 1 ? 's' : ''}
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
                        onToggleSelect={handleToggleSelect}
                        weightage={weightages[template.id] ?? 10}
                        onWeightageChange={handleWeightageChange}
                    />
                ))}
            </div>
        </div>
    );
};

export default React.memo(DepartmentTemplates);

