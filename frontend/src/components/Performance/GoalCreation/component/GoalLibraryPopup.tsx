import React, { useState } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import Button from '../../../shared/atoms/Button';
import { Select } from '../../../shared/atoms/Select';
import { Typography } from '../../../shared/atoms/Typography';
import { GoalTemplate } from './goal-model/types';
import RecommendedTemplates from './goal-model/RecommendedTemplates';
import AllOrgTemplates from './goal-model/AllOrgTemplates';
import DepartmentTemplates from './goal-model/DepartmentTemplates';
import RoleBasedTemplates from './goal-model/RoleBasedTemplates';
import UsedByTeamTemplates from './goal-model/UsedByTeamTemplates';

interface GoalLibraryPopupProps {
    onClose?: () => void;
    onUseTemplate?: (template: GoalTemplate) => void;
}

type TabKey = 'recommended' | 'all-org' | 'department' | 'role-based' | 'used-by-team';

const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'recommended',   label: 'Recommended for you', count: 12 },
    { key: 'all-org',       label: 'All Org templates',   count: 12 },
    { key: 'department',    label: 'Department · Design', count: 9  },
    { key: 'role-based',    label: 'Role-based',          count: 9  },
    { key: 'used-by-team',  label: 'Used by your team',   count: 9  },
];

const departmentOptions = [
    { label: 'Design',      value: 'Design'      },
    { label: 'Engineering', value: 'Engineering' },
    { label: 'Product',     value: 'Product'     },
    { label: 'Marketing',   value: 'Marketing'   },
];

const levelOptions = [
    { label: 'L3 / L4',  value: 'L3 / L4'  },
    { label: 'L1 / L2',  value: 'L1 / L2'  },
    { label: 'L5 / L6',  value: 'L5 / L6'  },
    { label: 'Manager',  value: 'Manager'   },
];

const GoalLibraryPopup = ({ onClose, onUseTemplate }: GoalLibraryPopupProps) => {
    const [activeTab, setActiveTab] = useState<TabKey>('recommended');
    const [selectedDepartment, setSelectedDepartment] = useState(departmentOptions[0]);
    const [selectedLevel, setSelectedLevel] = useState(levelOptions[0]);

    const renderTemplates = () => {
        switch (activeTab) {
            case 'recommended':  return <RecommendedTemplates onUseTemplate={onUseTemplate} />;
            case 'all-org':      return <AllOrgTemplates      onUseTemplate={onUseTemplate} />;
            case 'department':   return <DepartmentTemplates  onUseTemplate={onUseTemplate} />;
            case 'role-based':   return <RoleBasedTemplates   onUseTemplate={onUseTemplate} />;
            case 'used-by-team': return <UsedByTeamTemplates  onUseTemplate={onUseTemplate} />;
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
                                className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:h-11"
                                defaultValue=""
                                placeholder="Search templates · 'design'"
                                aria-label="Search goal templates"
                            />
                        </div>
                        <Select
                            options={departmentOptions}
                            value={selectedDepartment}
                            onChange={setSelectedDepartment}
                            className="relative w-full min-w-0 [&>button]:h-9 [&>button]:min-w-0 [&>button]:px-3 [&>button]:text-sm [&>div]:!w-full sm:[&>button]:h-11"
                        />
                        <Select
                            options={levelOptions}
                            value={selectedLevel}
                            onChange={setSelectedLevel}
                            className="relative w-full min-w-0 sm:col-span-2 lg:col-span-1 [&>button]:h-9 [&>button]:min-w-0 [&>button]:px-3 [&>button]:text-sm [&>div]:!w-full sm:[&>button]:h-11"
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
                                className={`flex h-9 shrink-0 snap-start items-center gap-2 border-b-2 text-sm font-semibold transition sm:h-11 ${
                                    isActive
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
                        variant="outline"
                        bgColor="text"
                        className="h-10 w-full justify-center rounded-lg border-gray-200 bg-white px-4 text-gray-700 hover:bg-gray-50 sm:h-9 sm:w-auto"
                    >
                        Submit
                    </Button>
                </div>

            </div>
        </div>
    );
};

export default React.memo(GoalLibraryPopup);
