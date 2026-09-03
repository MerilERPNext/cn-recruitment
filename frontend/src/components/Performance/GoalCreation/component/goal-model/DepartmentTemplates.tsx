import React, { useMemo } from 'react';
import { CheckSquare, Square, Search } from 'lucide-react';
import TemplateCard from './TemplateCard';
import { GoalTemplate, TemplateListProps, getGoalKey } from './types';
import { Typography } from '../../../../shared/atoms/Typography';

export const departmentTemplatesData: GoalTemplate[] = [];

const DepartmentTemplates = ({
    searchQuery = '',
    selectedTemplates = [],
    onToggleSelect,
    onSelectAll,
    weightages = {},
    onWeightageChange,
    allOrgTemplatesData = []
}: TemplateListProps) => {
    const filteredTemplates = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return (allOrgTemplatesData || []).filter((t) => {
            const hasDept = Boolean(t.department || t.department_title);
            if (!hasDept) return false;

            if (query) {
                const titleMatch = (t.title || '').toLowerCase().includes(query);
                const descMatch = (t.description || '').toLowerCase().includes(query);
                return titleMatch || descMatch;
            }

            return true;
        });
    }, [allOrgTemplatesData, searchQuery]);

    const selectedSet = useMemo(() => {
        return new Set(selectedTemplates.map((t) => getGoalKey(t)));
    }, [selectedTemplates]);

    const isAllSelected = useMemo(() => {
        return (
            filteredTemplates.length > 0 &&
            filteredTemplates.every((t) => selectedSet.has(getGoalKey(t)))
        );
    }, [filteredTemplates, selectedSet]);

    const totalSelectedWeightage = useMemo(() => {
        return selectedTemplates.reduce(
            (acc, item) => acc + (weightages[getGoalKey(item)] ?? 10),
            0
        );
    }, [selectedTemplates, weightages]);

    if (filteredTemplates.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-border bg-card p-6">
                <Search className="h-8 w-8 text-text-body2 mb-2" />
                <Typography variant="bodyMedium" className="font-semibold text-text-title">
                    No matching goals found
                </Typography>
                <Typography variant="caption" className="text-text-body2 mt-1">
                    Try refining your search keyword or clearing department/designation filters.
                </Typography>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-primary/10 px-4 py-2.5 border border-primary/30">
                <div className="flex items-center gap-2 text-sm font-medium text-text-title">
                    <button
                        type="button"
                        onClick={() => onSelectAll?.(filteredTemplates)}
                        className="flex items-center gap-2 hover:text-primary font-semibold cursor-pointer"
                    >
                        {isAllSelected ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                            <Square className="h-4 w-4 text-text-body2" />
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
                {filteredTemplates.map((template) => (
                    <TemplateCard
                        key={getGoalKey(template)}
                        template={template}
                        hideUseTemplate={true}
                        isSelected={selectedSet.has(getGoalKey(template))}
                        onToggleSelect={onToggleSelect}
                        weightage={weightages[getGoalKey(template)] ?? 10}
                        onWeightageChange={onWeightageChange}
                    />
                ))}
            </div>
        </div>
    );
};

export default React.memo(DepartmentTemplates);

