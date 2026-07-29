import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import Button from '../../../shared/atoms/Button';
import { AsyncSelect } from '../../../shared/atoms/AsyncSelect';
import { Typography } from '../../../shared/atoms/Typography';
import GoalItemCard from './GoalItemCard';
import { GoalTemplate } from './goal-model/types';
import { useCascadeMangerGoals, fetchDepartmentOptions, fetchDesignationOptions } from '../../../../hooks/usePerformance';
import { useCurrentEmployeeDetails } from '../../../../hooks/useEmployee';
import { CascadeGoal } from '../../../../types/goal';
import { useGoalModel } from '../../GoalModelContext';
import useDebounce from '../../../../hooks/useDebounce';

interface TeamGoalLibraryPopupProps {
    onClose?: () => void;
    onUseTemplate?: (template: GoalTemplate | GoalTemplate[], source?: string) => void;
}

const TeamGoalLibraryPopup: React.FC<TeamGoalLibraryPopupProps> = ({ onClose, onUseTemplate }) => {
    const { data: currentEmployee } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
    const currentCompany = currentEmployee?.company;
    const { setDraftGoals } = useGoalModel();
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [selectedDepartment, setSelectedDepartment] = useState({ label: 'All Departments', value: 'All' });
    const [selectedLevel, setSelectedLevel] = useState({ label: 'All Designations', value: 'All' });
    const [selectedTemplates, setSelectedTemplates] = useState<GoalTemplate[]>([]);

    const { data: teamGoals, isLoading: teamGoalsLoading, error } = useCascadeMangerGoals({
        search: debouncedSearchQuery || undefined,
        department: selectedDepartment.value !== 'All' ? selectedDepartment.value : undefined,
        designation: selectedLevel.value !== 'All' ? selectedLevel.value : undefined,
    });
    console.log(teamGoals, '=========================team goals');

    const filteredGoals = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const dept = selectedDepartment.value.toLowerCase();
        const desig = selectedLevel.value.toLowerCase();

        return teamGoals?.data?.goals?.filter((g) => {
            const matchesQuery =
                !query ||
                g.title.toLowerCase().includes(query) ||
                g?.owner_designation?.toLowerCase().includes(query) ||
                g?.performance_cycle?.toLowerCase().includes(query) ||
                g?.description?.toLowerCase().includes(query) ||
                (g.department ?? '').toLowerCase().includes(query);

            const matchesDept =
                dept === 'all' ||
                (g.department ?? '').toLowerCase() === dept;

            const matchesDesig =
                desig === 'all' ||
                (g?.owner_designation ?? '').toLowerCase().includes(desig);

            return matchesQuery && matchesDept && matchesDesig;
        });
    }, [searchQuery, teamGoals, selectedDepartment, selectedLevel]);

    const handleToggleSelect = (goal: CascadeGoal | GoalTemplate) => {
        const item: GoalTemplate = {
            id: (goal as any).goal || (goal as any).id,
            goal: (goal as any).goal || (goal as any).id,
            title: goal.title,
            description: (goal as any).description || '',
            category: (goal as any).category || '',
            department: goal.department || null,
            weightage: (goal as any).weightage || 30,
            scorecard_pillar: (goal as any).scorecard_pillar || null,
            performance_cycle: (goal as any).performance_cycle,
            owner_employee: (goal as any).owner_employee,
            designation: (goal as any).owner_designation || (goal as any).designation,
            usedCount: (goal as any).used_by_count || (goal as any).usedCount || 0,
            key_results: (goal as any).key_results || [],
        };
        const key = item.goal || item.id || item.title;
        setSelectedTemplates((prev) =>
            prev.some((t) => (t.goal || t.id || t.title) === key)
                ? prev.filter((t) => (t.goal || t.id || t.title) !== key)
                : [...prev, item]
        );
    };

    const handleSubmitFooter = () => {
        if (selectedTemplates.length > 0) {
            setDraftGoals(selectedTemplates as any);
            onUseTemplate?.(selectedTemplates, 'cascade');
        }
    };

    return (
        <div className="flex h-[90vh] w-full max-w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:min-h-[580px] sm:rounded-xl sm:animate-slideUp">
            {/* Header */}
            <div className="relative z-30 shrink-0 border-b border-gray-100 bg-white px-4 py-2.5 sm:px-5 sm:py-4">
                <div className="flex items-center gap-3 pr-11">
                    <Typography variant="h4" className="text-lg font-semibold leading-tight text-gray-900 sm:mt-2 sm:text-2xl">
                        Cascade Manager & Department Goals
                    </Typography>
                    <span className="hidden sm:inline-block rounded-md bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                        FY26 Cycle
                    </span>
                </div>
                <button
                    type="button"
                    className="absolute right-3 top-2 flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-700 sm:right-4 sm:top-4"
                    onClick={onClose}
                    aria-label="Close manager goals library"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* mobile: one scrollable wrapper; desktop (sm:contents): div vanishes, restoring sticky layout */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto sm:contents">
                {/* Filters */}
                <div className="shrink-0 border-b border-gray-100 bg-white px-4 py-2.5 sm:px-5 sm:py-4">
                    <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-[minmax(280px,1fr)_180px_minmax(180px,240px)]">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-8 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:h-11"
                                placeholder="Search manager goals or team OKRs..."
                                aria-label="Search goal templates"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    aria-label="Clear search"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <AsyncSelect
                            fetchOptions={async (search, skip) => {
                                const res = await fetchDepartmentOptions(currentCompany)(search, skip);
                                return skip === 0 ? [{ label: 'All Departments', value: 'All' }, ...res] : res;
                            }}
                            value={selectedDepartment}
                            onChange={(opt: any) => {
                                setSelectedDepartment(opt);
                                setSelectedLevel({ label: 'All Designations', value: 'All' });
                            }}
                            className="relative w-full min-w-0 [&>button]:h-9 [&>button]:min-w-0 [&>button]:px-3 [&>button]:text-sm [&>div]:!w-full sm:[&>button]:h-11"
                            placeholder="Search department..."
                        />
                        <AsyncSelect
                            fetchOptions={async (search, skip) => {
                                const res = await fetchDesignationOptions(selectedDepartment.value)(search, skip);
                                return skip === 0 ? [{ label: 'All Designations', value: 'All' }, ...res] : res;
                            }}
                            value={selectedLevel}
                            onChange={(opt: any) => setSelectedLevel(opt)}
                            className="relative w-full min-w-0 sm:col-span-2 lg:col-span-1 [&>button]:h-9 [&>button]:min-w-0 [&>button]:px-3 [&>button]:text-sm [&>div]:!w-full sm:[&>button]:h-11"
                            placeholder="Search designation..."
                        />
                    </div>
                </div>

                {/* Content Area: GoalItemCard List */}
                <div className="px-4 py-4 sm:min-h-0 sm:flex-1 sm:overflow-y-auto sm:px-5 space-y-3.5">
                    {filteredGoals?.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-6">
                            <Search className="h-8 w-8 text-gray-400 mb-2" />
                            <Typography variant="bodyMedium" className="font-semibold text-gray-700">
                                No matching manager or team goals found
                            </Typography>
                            <Typography variant="caption" className="text-gray-500 mt-1">
                                Try refining your search keyword or clearing department/designation filters.
                            </Typography>
                        </div>
                    ) : (
                            filteredGoals?.map((goal: CascadeGoal, index) => {
                            const isSelected = selectedTemplates.some((t) => t.goal === goal.goal || t.id === goal.goal);
                            return (
                                <GoalItemCard
                                    key={goal.goal}
                                    goal={goal}
                                    index={index}
                                    isSelected={isSelected}
                                    onToggleSelect={handleToggleSelect}
                                />
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="flex flex-col gap-3 border-t border-gray-100 bg-blue-50/50 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
                    <Typography variant="caption" className="block break-words leading-relaxed text-gray-500">
                        {selectedTemplates.length > 0
                            ? `${selectedTemplates.length} goal(s) selected for cascading`
                            : 'Select manager & team goals from the list above to cascade'}
                    </Typography>
                    <Button
                        type="button"
                        variant="contain"
                        bgColor="primary"
                        className="h-10 w-full justify-center rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700 sm:h-9 sm:w-auto disabled:opacity-50"
                        disabled={selectedTemplates.length === 0}
                        onClick={handleSubmitFooter}
                    >
                        Cascade Goals {selectedTemplates.length > 0 ? `(${selectedTemplates.length} Selected)` : ''}
                    </Button>
                </div>

            </div>
        </div>
    );
};

export default React.memo(TeamGoalLibraryPopup);
