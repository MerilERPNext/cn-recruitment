import React from 'react';
import { CheckSquare, Square, Search } from 'lucide-react';
import TemplateCard from './TemplateCard';
import { GoalTemplate, TemplateListProps, filterTemplates } from './types';
import Button from '../../../../shared/atoms/Button';
import { Typography } from '../../../../shared/atoms/Typography';

export const roleBasedTemplatesData: GoalTemplate[] = [
    { id: 'role-01', scope: 'IC L3 / L4', title: 'Deliver 3 high-impact features with zero P1 bugs', usedCount: 88, recommended: true, department: 'Engineering', designation: 'L3 / L4' },
    { id: 'role-02', scope: 'IC L3 / L4', title: 'Complete 2 cross-functional projects this quarter', usedCount: 74, department: 'Design', designation: 'L3 / L4' },
    { id: 'role-03', scope: 'IC L5 / L6', title: 'Lead architecture review for platform migration', usedCount: 66, department: 'Engineering', designation: 'L5 / L6' },
    { id: 'role-04', scope: 'IC L5 / L6', title: 'Reduce system latency by 20% across critical paths', usedCount: 59, department: 'Product', designation: 'L5 / L6' },
    { id: 'role-05', scope: 'Manager', title: 'Grow at least 2 team members to next level by year-end', usedCount: 52, department: 'HR', designation: 'Manager' },
    { id: 'role-06', scope: 'Manager', title: 'Achieve team engagement score >= 4.3 in bi-annual survey', usedCount: 47, department: 'Design', designation: 'Manager' },
    { id: 'role-07', scope: 'Director', title: 'Define and execute department roadmap for FY26', usedCount: 41, department: 'Product', designation: 'Director' },
    { id: 'role-08', scope: 'Director', title: 'Build 3 strategic partnerships with external vendors', usedCount: 35, department: 'Engineering', designation: 'Director' },
    { id: 'role-09', scope: 'VP', title: 'Drive BU revenue growth of 25% year-over-year', usedCount: 28, department: 'Sales', designation: 'VP' },
];

const RoleBasedTemplates = ({
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
        roleBasedTemplatesData,
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

export default React.memo(RoleBasedTemplates);

