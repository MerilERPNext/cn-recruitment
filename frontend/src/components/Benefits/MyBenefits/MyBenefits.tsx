import React, { useMemo, useState } from 'react';
import {
    ChevronDown,
    Wallet,
    TrendingUp
} from 'lucide-react';
import DataListView from '../../DataListView';
import CardTable from '../../shared/CardTable';
import { FetchParams } from '../../../services/customApiService';
import { FrappePageResponse } from '../../../types/frappe';
import { useCurrentEmployeeIdCard } from '../../../hooks/useEmployee';
import { SalaryComponentDetail, useGetAllAccruedReimbursements } from '../../../hooks/useBenefit';
import { SkeletonStat } from './Skeletons';
import { AccrualItem, StatItem } from './CommonItems';


export const COLUMN_LAYOUT = "minmax(100px, 1.5fr) 1fr 1fr 1fr 1fr 1fr 1fr 1fr";

const MyBenefits: React.FC = () => {
    const { data: employee } = useCurrentEmployeeIdCard();

    const {
        data: allAccruedReimbursements,
        isLoading,
        isError,
        error,
        refetch
    } = useGetAllAccruedReimbursements(employee?.name || "", employee?.company || "");

    // Keep track of which benefit cards are expanded — map by component name
    const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

    const toggleExpanded = (key: string) =>
        setExpandedMap(prev => ({ ...prev, [key]: !prev[key] }));

    const yearInterval = useMemo(() => {
        const year = new Date().getFullYear();
        const yy = year % 100;
        const nextYy = (year + 1) % 100;
        return `${yy - 1}-${nextYy - 1}`;
    }, []);


    // Render error UI
    if (isError) {
        return (
            <div className="min-h-screen bg-gray-50 font-sans text-slate-800 pb-12">
                <header className="bg-white mx-8 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                    <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-between">
                            <h1 className="text-xl font-bold text-slate-900">My Benefits for FY {yearInterval}</h1>
                            <div className="flex gap-3 items-center">
                                <button className="p-2 rounded bg-slate-100 hover:bg-slate-200" onClick={() => refetch?.()}>
                                    Retry
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
                    <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-8">
                        <h2 className="text-lg font-bold mb-2">Failed to load benefits</h2>
                        <p className="text-sm text-gray-600 mb-4">We couldn't fetch your accrued reimbursements. {String((error as any)?.message ?? '')}</p>
                        <div className="flex gap-3">
                            <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={() => refetch?.()}>Try again</button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // Loading skeleton UI
    if (isLoading || !allAccruedReimbursements) {
        const skeletonCount = 4;
        return (
            <div className="min-h-screen bg-gray-50 font-sans text-slate-800 pb-12">

                <h1 className="text-xl mx-8 pl-2 sm:pt-2 pt-4  pb-4 font-bold  text-slate-900">My Benefits for FY {yearInterval}</h1>
                <main className="w-full px-4 sm:px-6 lg:px-8 pb-8">
                    <div className="space-y-6">
                        {Array.from({ length: skeletonCount }).map((_, i) => (
                            <div key={i} className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden p-6 md:p-8">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-gray-200 animate-pulse" />
                                            <div className="space-y-2">
                                                <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
                                                <div className="h-3 w-36 bg-gray-200 rounded animate-pulse" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-8">
                                    {Array.from({ length: 6 }).map((__, j) => (
                                        <SkeletonStat key={j} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        );
    }

    // At this point we have real data in allAccruedReimbursements.data
    const components = allAccruedReimbursements?.data ?? [];

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-slate-800 pb-12">
            <h1 className="text-xl mx-8 pl-2 sm:pt-2 pt-4  pb-4 font-bold  text-slate-900">My Benefits for FY {yearInterval}</h1>

            <main className="w-full px-4 sm:px-6 lg:px-8 pb-8 space-y-6">
                {components.map((component, compIdx) => {
                    // compute summary stats based on the SalaryComponent fields
                    const carryForward = component.carry_forward_amount ?? 0;
                    const totalAccrual = component.total_accrued_amount ?? 0;
                    const periodicAccrual = component.periodic_original_amount ?? 0;
                    const totalClaim = component.total_claimed_amount ?? 0;
                    const advancePeriods = component.advance_period ?? 0;
                    const totalBalance = component.total_balance_amount ?? 0;

                    const isExpanded = !!expandedMap[component.salary_component];

                    // DataListView fetch function uses the details already present in memory.
                    const fetchFunction = async (params: FetchParams) => {
                        const details = component.details ?? [];

                        // basic searchTerm filter
                        const filtered = !params.searchTerm
                            ? details
                            : details.filter(r => r.month.toLowerCase().includes(params.searchTerm!.toLowerCase()));

                        const response: FrappePageResponse = {
                            data: filtered,
                            totalCount: filtered.length,
                            nextCursor: null
                        } as unknown as FrappePageResponse;

                        return response;
                    };

                    return (
                        <div key={`${component.salary_component}-${compIdx}`} className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
                            {/* Header */}
                            <div
                                className="p-6 md:p-8 cursor-pointer hover:bg-blue-50/10 transition-colors duration-200 group"
                                onClick={() => toggleExpanded(component.salary_component)}
                            >
                                <div className="flex items-start justify-between mb-8">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
                                                <Wallet className="h-5 w-5 text-emerald-600" />
                                            </div>
                                            <h2 className="text-lg md:text-xl font-bold text-slate-800 leading-tight">
                                                {component.salary_component}
                                            </h2>
                                        </div>
                                    </div>
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-200 transition-all duration-300 ${isExpanded ? 'rotate-180 bg-gray-50' : ''}`}>
                                        <ChevronDown className="h-5 w-5 text-slate-500" />
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-8">
                                    <StatItem label="Carry Forward" value={carryForward} subLabel="Amount" />
                                    <StatItem label="Total Accrual" value={totalAccrual} subLabel="Amount" highlighted />
                                    <StatItem label="Periodic Accrual" value={periodicAccrual} subLabel="At Present" />
                                    <StatItem label="Total Claim" value={totalClaim} subLabel="Amount" />
                                    <StatItem label="Advance Periods" value={advancePeriods} isNumber subLabel="Months" />
                                    <StatItem label="Total Balance" value={totalBalance} subLabel="Amount" />
                                </div>
                            </div>

                            {/* Divider */}
                            {isExpanded && <div className="h-px w-full bg-gray-100"></div>}

                            {/* Expanded details (list) */}
                            {isExpanded && (
                                <div className="bg-gray-100 p-6 md:p-8 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <div className="flex items-center gap-2 mb-6">
                                        <TrendingUp className="h-4 w-4 text-slate-500" />
                                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Accrual Calculation</h3>
                                    </div>
                                    <CardTable
                                        titles={[
                                            "Period",
                                            "Work Days",
                                            "Payment Days",
                                            "Original Accrual",
                                            "Periodic Accrued",
                                            "Claimed Amt",
                                            "Paid Amt",
                                            "Closing Bal"
                                        ]}
                                        columnWidths={[COLUMN_LAYOUT]}
                                    >

                                        <DataListView<SalaryComponentDetail>
                                            queryKey={`accrualData-${component.salary_component}`}
                                            fetchFunction={fetchFunction}
                                            ItemComponent={AccrualItem}
                                            isSearch={false}
                                            showPagination={false}
                                            pageSize={20}
                                        />

                                    </CardTable>
                                </div>
                            )}
                        </div>
                    );
                })}
            </main>
        </div>
    );
};

export default MyBenefits;
