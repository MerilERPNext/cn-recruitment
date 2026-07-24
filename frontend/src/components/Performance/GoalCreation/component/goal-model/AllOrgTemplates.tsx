import React from 'react';
import { CheckSquare, Square, Search } from 'lucide-react';
import TemplateCard from './TemplateCard';
import { GoalTemplate, TemplateListProps, filterTemplates } from './types';
import Button from '../../../../shared/atoms/Button';
import { Typography } from '../../../../shared/atoms/Typography';

export const allOrgTemplatesData: GoalTemplate[] = [
    { id: 'org-01', scope: 'Org', title: 'Drive company-wide Net Promoter Score above 60', usedCount: 312, department: 'Sales', designation: 'VP' },
    { id: 'org-02', scope: 'Org', title: 'Launch new employee onboarding program in Q2', usedCount: 278, department: 'HR', designation: 'Manager' },
    { id: 'org-03', scope: 'Org', title: 'Achieve 95% performance review completion rate', usedCount: 245, recommended: true, department: 'HR', designation: 'Director' },
    { id: 'org-04', scope: 'Org', title: 'Reduce overall operational costs by 10%', usedCount: 198, department: 'Finance', designation: 'VP' },
    { id: 'org-05', scope: 'Org', title: 'Launch quarterly all-hands knowledge sharing sessions', usedCount: 176, department: 'Engineering', designation: 'L5 / L6' },
    { id: 'org-06', scope: 'Org', title: 'Increase internal mobility rate by 20% this FY', usedCount: 164, department: 'HR', designation: 'Manager' },
    { id: 'org-07', scope: 'Function', title: 'Improve cross-team collaboration index by 25%', usedCount: 153, department: 'Product', designation: 'Director' },
    { id: 'org-08', scope: 'BU', title: 'Achieve BU-level profitability target of 18% margin', usedCount: 141, department: 'Finance', designation: 'Director' },
    { id: 'org-09', scope: 'Org', title: 'Standardise OKR process across all departments', usedCount: 139, department: 'Product', designation: 'Manager' },
    { id: 'org-10', scope: 'Org', title: 'Build and publish organisation capability framework', usedCount: 127, department: 'Engineering', designation: 'VP' },
    { id: 'org-11', scope: 'Function', title: 'Deliver 3 cross-functional innovation sprints', usedCount: 115, department: 'Design', designation: 'L3 / L4' },
    { id: 'org-12', scope: 'Org', title: 'Reduce voluntary attrition to below 12% annually', usedCount: 108, department: 'HR', designation: 'VP' },
];

const AllOrgTemplates = ({
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
        allOrgTemplatesData,
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

export default React.memo(AllOrgTemplates);

