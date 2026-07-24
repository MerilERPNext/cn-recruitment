import React, { useState } from 'react';
import { CheckSquare, Square } from 'lucide-react';
import TemplateCard from './TemplateCard';
import { GoalTemplate, TemplateListProps } from './types';
import Button from '../../../../shared/atoms/Button';

const templates: GoalTemplate[] = [
    { id: 'role-01', scope: 'IC L3 / L4', title: 'Deliver 3 high-impact features with zero P1 bugs', usedCount: 88, recommended: true },
    { id: 'role-02', scope: 'IC L3 / L4', title: 'Complete 2 cross-functional projects this quarter', usedCount: 74 },
    { id: 'role-03', scope: 'IC L5 / L6', title: 'Lead architecture review for platform migration', usedCount: 66 },
    { id: 'role-04', scope: 'IC L5 / L6', title: 'Reduce system latency by 20% across critical paths', usedCount: 59 },
    { id: 'role-05', scope: 'Manager', title: 'Grow at least 2 team members to next level by year-end', usedCount: 52 },
    { id: 'role-06', scope: 'Manager', title: 'Achieve team engagement score >= 4.3 in bi-annual survey', usedCount: 47 },
    { id: 'role-07', scope: 'Director', title: 'Define and execute department roadmap for FY26', usedCount: 41 },
    { id: 'role-08', scope: 'Director', title: 'Build 3 strategic partnerships with external vendors', usedCount: 35 },
    { id: 'role-09', scope: 'VP', title: 'Drive BU revenue growth of 25% year-over-year', usedCount: 28 },
];

const RoleBasedTemplates = ({ onUseTemplate }: TemplateListProps) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [weightages, setWeightages] = useState<Record<string, number>>({});

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

    const handleSelectAll = () => {
        if (selectedIds.length === templates.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(templates.map((t) => t.id));
        }
    };

    const isAllSelected = selectedIds.length === templates.length;

    const totalSelectedWeightage = selectedIds.reduce(
        (acc, id) => acc + (weightages[id] ?? 10),
        0
    );

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
                                const selectedTemplates = templates.filter((t) => selectedIds.includes(t.id));
                                selectedTemplates.forEach((t) => onUseTemplate?.(t));
                            }}
                        >
                            Add {selectedIds.length} Selected Goal{selectedIds.length > 1 ? 's' : ''}
                        </Button>
                    </div>
                )}
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                {templates.map((template) => (
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

export default React.memo(RoleBasedTemplates);
