import React, { useCallback, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Search, X } from 'lucide-react';
import Button from '../../../shared/atoms/Button';
import { AsyncSelect, SelectOption } from '../../../shared/atoms/AsyncSelect';
import { Typography } from '../../../shared/atoms/Typography';
import { GoalTemplate, getGoalKey } from './goal-model/types';
import RecommendedTemplates from './goal-model/RecommendedTemplates';
import AllOrgTemplates from './goal-model/AllOrgTemplates';
import DepartmentTemplates from './goal-model/DepartmentTemplates';
import DesignationTemplates from './goal-model/DesignationTemplates';
import RoleBasedTemplates from './goal-model/RoleBasedTemplates';
import { useGoalRepository, useReferanceGoals } from '../../../../hooks/usePerformance';
import { performanceService } from '../../../../services/performanceService';
import { useCurrentEmployeeDetails } from '../../../../hooks/useEmployee';
import useDebounce from '../../../../hooks/useDebounce';
import LoadingAllOrgSkeleton from './LoadingAllOrgSkeleton';
import { KeyResult } from '../../../../types/goal';

interface GoalLibraryPopupProps {
    onClose?: () => void;
    onUseTemplate?: (template: GoalTemplate | GoalTemplate[], source?: string) => void;
}

type TabKey = 'recommended' | 'all-org' | 'department' | 'designation' | 'role-based';

const GoalLibraryPopup = ({ onClose, onUseTemplate }: GoalLibraryPopupProps) => {
    const { data: currentEmployee } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
    const currentCompany = currentEmployee?.company;
    const [activeTab, setActiveTab] = useState<TabKey>('recommended');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState({ label: 'All Departments', value: 'All' });
    const [selectedLevel, setSelectedLevel] = useState({ label: 'All Designations', value: 'All' });
    const [selectedTemplates, setSelectedTemplates] = useState<GoalTemplate[]>([]);
    const [weightages, setWeightages] = useState<Record<string, number>>({});
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    const fetchDepartmentOptions = useCallback(
        async (search: string, skip: number) => {
            try {
                return await performanceService.getDepartmentOptions({
                    search_text: search,
                    skip,
                    company: currentCompany,
                });
            } catch (e) {
                console.error("Failed to fetch department options", e);
                return [];
            }
        },
        [currentCompany]
    );

    const fetchDesignationOptions = useCallback(
        (department: string) => async (search: string, skip: number) => {
            try {
                return await performanceService.getDesignationOptions({
                    search_text: search,
                    skip,
                    ...(department && department !== "All" ? { department } : {}),
                });
            } catch (e) {
                console.error("Failed to fetch designation options", e);
                return [];
            }
        },
        []
    );

    const { data: refGoalsData, isLoading, error, refetch: refetchRefGoals } = useReferanceGoals({
        search: debouncedSearchQuery || undefined,
        department: selectedDepartment.value !== 'All' ? selectedDepartment.value : undefined,
        designation: selectedLevel.value !== 'All' ? selectedLevel.value : undefined,
    });

    const { data: goalRepo, isLoading: goalRepoLoading, error: goalRepoErr, refetch: refetchGoalRepo } = useGoalRepository({
        search: debouncedSearchQuery || undefined,
        department: selectedDepartment.value !== 'All' ? selectedDepartment.value : undefined,
        designation: selectedLevel.value !== 'All' ? selectedLevel.value : undefined,
    });

    const goals = refGoalsData?.data?.goals || [];
    const recommendedGoals: GoalTemplate[]  = useMemo(() => {
        if (goalRepo?.data?.repositories && Array.isArray(goalRepo.data.repositories) && goalRepo.data.repositories.length > 0) {
            return goalRepo.data.repositories.map((repo) => {
                const mappedGoals = (repo.goals || []).map((g) => ({
                    id: g.goal_template,
                    goal: g.goal_template,
                    title: g.title,
                    description: g.description,
                    category: g.category,
                    designation: g.designation,
                    department: g.department,
                    locked:g.locked,
                    scorecard_pillar: g.scorecard_pillar,
                    weightage: g.weightage,
                    key_results: Array.isArray(g.key_results) ? g.key_results.map((kr: KeyResult) => ({
                        title: kr.title,
                        weightage: kr.weightage,
                        metric: kr.metric,
                        target: kr.target,
                        target_type: kr.target_type,
                    })) : []
                }));

                return {
                    id: repo.repository,
                    goal: repo.repository,
                    title: repo.title,
                    description: repo.description,
                    usedCount: repo.usage_count,
                    recommended: Boolean(repo.recommended),
                    goal_count: repo.goal_count,
                    total_weightage: repo.total_weightage,
                    repository_goals: mappedGoals,
                };
            });
        }
        return (goalRepoLoading || goalRepo?.data?.repositories?.length === 0) ? [] : [];
    }, [goalRepo, goalRepoLoading]);

    const handleToggleSelect = useCallback((template: GoalTemplate) => {
        const key = getGoalKey(template);
        setSelectedTemplates((prev) =>
            prev.some((t) => getGoalKey(t) === key)
                ? prev.filter((t) => getGoalKey(t) !== key)
                : [...prev, template]
        );
    }, []);

    const handleSelectAll = useCallback((templatesToToggle: GoalTemplate[]) => {
        if (!templatesToToggle || templatesToToggle.length === 0) return;
        const toggleKeys = new Set(templatesToToggle.map((t) => getGoalKey(t)).filter(Boolean));
        setSelectedTemplates((prev) => {
            const existingKeys = new Set(prev.map((t) => getGoalKey(t)));
            const allIncluded = templatesToToggle.every((t) => existingKeys.has(getGoalKey(t)));

            if (allIncluded) {
                return prev.filter((t) => !toggleKeys.has(getGoalKey(t)));
            } else {
                const newItems = templatesToToggle.filter((t) => !existingKeys.has(getGoalKey(t)));
                return [...prev, ...newItems];
            }
        });
    }, []);

    const handleWeightageChange = useCallback((template: GoalTemplate, weight: number) => {
        const key = getGoalKey(template);
        setWeightages((prev) => ({ ...prev, [key]: weight }));
    }, []);

    const handleSubmitFooter = () => {
        if (selectedTemplates.length > 0) {
            const allGoals = selectedTemplates.flatMap((t:GoalTemplate) =>
                t.repository_goals ? t.repository_goals : t
            );
            onUseTemplate?.(allGoals, activeTab);
        }
    };

    const counts = useMemo(() => ({
        recommended: recommendedGoals.length,
        allOrg: goals.length,
        department: goals.filter((g: GoalTemplate) => Boolean(g.department || g.department_title)).length,
        designation: goals.filter((g: GoalTemplate) => Boolean(g.designation || g.designation_title || g.designation_name)).length,
        roleBased: goals.filter((g: GoalTemplate) => Boolean(
            g?.role ||
            g?.role_title ||
            g?.role_name ||
            g?.job_role ||
            g?.role_based 
        )).length,
    }), [debouncedSearchQuery, selectedDepartment.value, selectedLevel.value, goals, recommendedGoals, refGoalsData?.data?.total, goalRepo?.data?.total]);

    const tabs: { key: TabKey; label: string; count: number }[] = useMemo(() => [
        { key: 'recommended', label: 'Recommended for you', count: counts.recommended },
        { key: 'all-org', label: 'Org templates', count: counts.allOrg },
        {
            key: 'department',
            label: selectedDepartment.value === 'All' ? 'Department' : `Department · ${selectedDepartment.label}`,
            count: counts.department,
        },
        {
            key: 'designation',
            label: selectedLevel.value === 'All' ? 'Designation' : `Designation · ${selectedLevel.label}`,
            count: counts.designation,
        },
        { key: 'role-based', label: 'Role-based', count: counts.roleBased },
    ], [counts, selectedDepartment.label, selectedDepartment.value, selectedLevel.label, selectedLevel.value]);

    const renderTemplates = () => {
        if (goalRepoLoading && activeTab === 'recommended') {
            return <LoadingAllOrgSkeleton />;
        }
        if (isLoading && activeTab !== 'recommended') {
            return <LoadingAllOrgSkeleton />;
        }
        if (goalRepoErr && activeTab === 'recommended') {
            return (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-red-200 bg-red-50/40 p-8 text-center sm:py-12">
                    <AlertCircle className="mb-2 h-8 w-8 text-red-500" />
                    <Typography variant="bodyMedium" className="font-semibold text-gray-800">
                        Failed to load recommended goals
                    </Typography>
                    <Typography variant="caption" className="mt-1 text-gray-500 max-w-sm">
                        {goalRepoErr?.message || 'Something went wrong while fetching recommended goals.'}
                    </Typography>
                    <Button
                        type="button"
                        variant="outline"
                        className="mt-4 text-xs font-medium"
                        onClick={() => refetchGoalRepo()}
                    >
                        Try Again
                    </Button>
                </div>
            );
        }
        if (error && activeTab !== 'recommended') {
            return (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-red-200 bg-red-50/40 p-8 text-center sm:py-12">
                    <AlertCircle className="mb-2 h-8 w-8 text-red-500" />
                    <Typography variant="bodyMedium" className="font-semibold text-gray-800">
                        Failed to load goals
                    </Typography>
                    <Typography variant="caption" className="mt-1 text-gray-500 max-w-sm">
                        {error?.message || 'Something went wrong while fetching reference goals from server.'}
                    </Typography>
                    <Button
                        type="button"
                        variant="outline"
                        className="mt-4 text-xs font-medium"
                        onClick={() => refetchRefGoals()}
                    >
                        Try Again
                    </Button>
                </div>
            );
        }

        const commonProps = {
            onUseTemplate: (t: GoalTemplate | GoalTemplate[]) => onUseTemplate?.(t, activeTab),
            searchQuery: debouncedSearchQuery,
            selectedDepartment: selectedDepartment.value,
            selectedDesignation: selectedLevel.value,
            selectedTemplates,
            onToggleSelect: handleToggleSelect,
            onSelectAll: handleSelectAll,
            weightages,
            onWeightageChange: handleWeightageChange,
            allOrgTemplatesData: goals,

        };

        switch (activeTab) {
            case 'recommended': return <RecommendedTemplates {...commonProps} recommendedTemplatesData={recommendedGoals} />;
            case 'all-org': return <AllOrgTemplates {...commonProps} />;
            case 'department': return <DepartmentTemplates {...commonProps} recommendedTemplatesData={recommendedGoals} />;
            case 'designation': return <DesignationTemplates {...commonProps} recommendedTemplatesData={recommendedGoals} />;
            case 'role-based': return <RoleBasedTemplates {...commonProps} />;
        }
    };

    return (
        <div className="flex h-[90vh] w-full max-w-full flex-col overflow-hidden bg-white shadow-2xl  sm:h-[90vh] sm:min-h-[580px] sm:rounded-xl sm:animate-slideUp">

            {/* Header */}
            <div className="relative z-30 shrink-0 border-b border-gray-100 bg-white px-4 py-2.5 sm:px-5 sm:py-4">
                <Typography variant="h4" className="pr-11 text-lg font-semibold leading-tight text-gray-900 sm:mt-2 sm:text-2xl">
                    Goal Library
                </Typography>
                <button
                    type="button"
                    className="absolute right-3 top-2 flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-700 sm:right-4 sm:top-4"
                    onClick={onClose}
                    aria-label="Close goal library"
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
                                className="h-full w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                                placeholder="Search templates · 'design'"
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
                                const res = await fetchDepartmentOptions(search, skip);
                                return skip === 0 ? [{ label: 'All Departments', value: 'All' }, ...res] : res;
                            }}
                            value={selectedDepartment}
                            onChange={(opt: SelectOption ) => {
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
                            onChange={(opt: SelectOption ) => setSelectedLevel(opt)}
                            className="relative w-full min-w-0 sm:col-span-2 lg:col-span-1 [&>button]:h-9 [&>button]:min-w-0 [&>button]:px-3 [&>button]:text-sm [&>div]:!w-full sm:[&>button]:h-11"
                            placeholder="Search designation..."
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex shrink-0 snap-x gap-3 overflow-x-auto border-b border-gray-100 px-4 sm:gap-6 sm:px-5">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                aria-label={`Show ${tab.label} templates`}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex h-9 shrink-0 snap-start items-center gap-2 border-b-2 text-sm font-semibold transition sm:h-11 ${isActive
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <span className="whitespace-nowrap">{tab.label}</span>
                                <span className={`rounded-md px-2 py-0.5 text-xs ${isActive ? 'bg-blue-50 text-gray-500' : 'bg-gray-100 text-gray-500'}`}>
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Template cards — on desktop only this section scrolls */}
                <div className="px-4 py-4 sm:min-h-0 sm:flex-1 sm:overflow-y-auto sm:px-5">
                    {renderTemplates()}
                </div>

                {/* Footer */}
                <div className="flex flex-col gap-3 border-t border-gray-100 bg-blue-50/50 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
                    <Typography variant="caption" className="block break-words leading-relaxed text-gray-500">
                        Can't find what you need?{' '}
                        <button type="button" className="font-semibold text-blue-600 hover:text-blue-700" aria-label="Suggest a goal template">
                            Suggest a template <ArrowRight className="inline h-3.5 w-3.5" />
                        </button>
                    </Typography>
                    <Button
                        type="button"
                        variant="contain"
                        disabled={selectedTemplates.length === 0 || activeTab === "recommended"}
                        bgColor="primary"
                        className="h-10 w-full justify-center rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700 sm:h-9 sm:w-auto"
                        onClick={handleSubmitFooter}
                    >
                        Submit {selectedTemplates.length > 0 ? `(${selectedTemplates.length} Selected)` : ''}
                    </Button>
                </div>

            </div>
        </div>
    );
};

export default React.memo(GoalLibraryPopup);

