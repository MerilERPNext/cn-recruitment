import React, { useState } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import Button from '../../../shared/atoms/Button';
import { AsyncSelect } from '../../../shared/atoms/AsyncSelect';
import { Typography } from '../../../shared/atoms/Typography';
import { GoalTemplate, filterTemplates } from './goal-model/types';
import RecommendedTemplates, { recommendedTemplatesData } from './goal-model/RecommendedTemplates';
import AllOrgTemplates, { allOrgTemplatesData } from './goal-model/AllOrgTemplates';
import DepartmentTemplates, { departmentTemplatesData } from './goal-model/DepartmentTemplates';
import RoleBasedTemplates, { roleBasedTemplatesData } from './goal-model/RoleBasedTemplates';
import UsedByTeamTemplates, { usedByTeamTemplatesData } from './goal-model/UsedByTeamTemplates';
import { fetchDepartmentOptions, fetchDesignationOptions } from '../../../../hooks/usePerformance';
import { useCurrentEmployeeDetails } from '../../../../hooks/useEmployee';

interface GoalLibraryPopupProps {
    onClose?: () => void;
    onUseTemplate?: (template: GoalTemplate | GoalTemplate[], source?: string) => void;
}

type TabKey = 'recommended' | 'all-org' | 'department' | 'role-based' | 'used-by-team';

const GoalLibraryPopup = ({ onClose, onUseTemplate }: GoalLibraryPopupProps) => {
    const { data: currentEmployee } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
    const currentCompany = currentEmployee?.company;
    const [activeTab, setActiveTab] = useState<TabKey>('recommended');
    const [searchQuery, setSearchQuery] = useState('');

    const [selectedDepartment, setSelectedDepartment] = useState({ label: 'All Departments', value: 'All' });
    const [selectedLevel, setSelectedLevel] = useState({ label: 'All Designations', value: 'All' });
    const [selectedTemplates, setSelectedTemplates] = useState<GoalTemplate[]>([]);
    const [weightages, setWeightages] = useState<Record<string, number>>({});
    const handleToggleSelect = (template: GoalTemplate) => {
        setSelectedTemplates((prev) =>
            prev.some((t) => t.id === template.id)
                ? prev.filter((t) => t.id !== template.id)
                : [...prev, template]
        );
    };

    const handleSelectAll = (templatesToToggle: GoalTemplate[]) => {
        const toggleIds = new Set(templatesToToggle.map((t) => t.id));
        const allIncluded =
            templatesToToggle.length > 0 &&
            templatesToToggle.every((t) => selectedTemplates.some((st) => st.id === t.id));

        if (allIncluded) {
            setSelectedTemplates((prev) => prev.filter((t) => !toggleIds.has(t.id)));
        } else {
            setSelectedTemplates((prev) => {
                const existingIds = new Set(prev.map((t) => t.id));
                const newItems = templatesToToggle.filter((t) => !existingIds.has(t.id));
                return [...prev, ...newItems];
            });
        }
    };

    const handleWeightageChange = (template: GoalTemplate, weight: number) => {
        setWeightages((prev) => ({ ...prev, [template.id]: weight }));
    };

    const handleSubmitFooter = () => {
        if (selectedTemplates.length > 0) {
            onUseTemplate?.(selectedTemplates, activeTab);
        }
    };

    const recommendedCount = filterTemplates(
        recommendedTemplatesData,
        searchQuery,
        selectedDepartment.value,
        selectedLevel.value
    ).length;

    const allOrgCount = filterTemplates(
        allOrgTemplatesData,
        searchQuery,
        selectedDepartment.value,
        selectedLevel.value
    ).length;

    const departmentCount = filterTemplates(
        departmentTemplatesData,
        searchQuery,
        selectedDepartment.value,
        selectedLevel.value
    ).length;

    const roleBasedCount = filterTemplates(
        roleBasedTemplatesData,
        searchQuery,
        selectedDepartment.value,
        selectedLevel.value
    ).length;

    const usedByTeamCount = filterTemplates(
        usedByTeamTemplatesData,
        searchQuery,
        selectedDepartment.value,
        selectedLevel.value
    ).length;

    const tabs: { key: TabKey; label: string; count: number }[] = [
        { key: 'recommended', label: 'Recommended for you', count: recommendedCount },
        { key: 'all-org', label: 'All Org templates', count: allOrgCount },
        {
            key: 'department',
            label: selectedDepartment.value === 'All' ? 'Department' : `Department · ${selectedDepartment.label}`,
            count: departmentCount,
        },
        { key: 'role-based', label: 'Role-based', count: roleBasedCount },
        { key: 'used-by-team', label: 'Used by your team', count: usedByTeamCount },
    ];

    const renderTemplates = () => {
        const commonProps = {
            onUseTemplate: (t: GoalTemplate | GoalTemplate[]) => onUseTemplate?.(t, activeTab),
            searchQuery,
            selectedDepartment: selectedDepartment.value,
            selectedDesignation: selectedLevel.value,
            selectedTemplates,
            onToggleSelect: handleToggleSelect,
            onSelectAll: handleSelectAll,
            weightages,
            onWeightageChange: handleWeightageChange,
        };

        switch (activeTab) {
            case 'recommended': return <RecommendedTemplates {...commonProps} />;
            case 'all-org': return <AllOrgTemplates {...commonProps} />;
            case 'department': return <DepartmentTemplates {...commonProps} />;
            case 'role-based': return <RoleBasedTemplates {...commonProps} />;
            case 'used-by-team': return <UsedByTeamTemplates {...commonProps} />;
        }
    };

    return (
        <div className="flex h-[90vh] w-full max-w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:min-h-[580px] sm:rounded-xl sm:animate-slideUp">

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
                                className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-8 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:h-11"
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

