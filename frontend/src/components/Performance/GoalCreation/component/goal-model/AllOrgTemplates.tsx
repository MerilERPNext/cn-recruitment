import React from 'react';
import { CheckSquare, Square, Search } from 'lucide-react';
import TemplateCard from './TemplateCard';
import { GoalTemplate, TemplateListProps, getGoalKey } from './types';
import Button from '../../../../shared/atoms/Button';
import { Typography } from '../../../../shared/atoms/Typography';

const AllOrgTemplates = ({
    onUseTemplate,
    selectedTemplates = [],
    onToggleSelect,
    onSelectAll,
    weightages = {},
    onWeightageChange,
    allOrgTemplatesData = []
}: TemplateListProps) => {

    const selectedIds = selectedTemplates.map((t) => getGoalKey(t));

    const isAllSelected =
        allOrgTemplatesData.length > 0 &&
        allOrgTemplatesData.every((t) => selectedIds.includes(getGoalKey(t)));

    const totalSelectedWeightage = selectedTemplates.reduce(
        (acc, item) => acc + (weightages[getGoalKey(item)] ?? 10),
        0
    );

    if (allOrgTemplatesData.length === 0) {
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
                        onClick={() => onSelectAll?.(allOrgTemplatesData)}
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

            </div>

            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                {allOrgTemplatesData.map((template: GoalTemplate) => (
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

export default React.memo(AllOrgTemplates);

