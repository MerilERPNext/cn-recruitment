import React, { useState } from "react";
import { ChevronDown, ChevronUp, Wallet } from "lucide-react";
import { SalaryComponent } from "../../../hooks/useBenefit";


interface SalaryComponentCardProps {
    component: SalaryComponent;
}

const SalaryComponentCard: React.FC<SalaryComponentCardProps> = ({ component }) => {
    const [open, setOpen] = useState(false);

    return (
        <div>
            {/* Main Card Section */}
            <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">

                {/* Collapsible Header */}
                <div
                    className="p-6 md:p-8 cursor-pointer hover:bg-blue-50/10 transition-colors duration-200 group"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-start justify-between mb-8">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
                                    <Wallet className="h-5 w-5 text-emerald-600" />
                                </div>
                                <h2 className="text-lg md:text-xl font-bold text-slate-800 leading-tight">
                                    {selectedComponent?.salary_component ?? 'Benefit'}
                                </h2>
                            </div>
                            <div className="ml-12">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-600 border border-emerald-100">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    ACTIVE
                                </span>
                            </div>
                        </div>
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-200 transition-all duration-300 ${isExpanded ? 'rotate-180 bg-gray-50' : ''}`}>
                            <ChevronDown className="h-5 w-5 text-slate-500" />
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-8">
                        {accruedLoading || employeeLoading ? (
                            <>
                                <SkeletonStat />
                                <SkeletonStat />
                                <SkeletonStat />
                                <SkeletonStat />
                                <SkeletonStat />
                                <SkeletonStat />
                            </>
                        ) : (
                            <>
                                <StatItem label="Carry Forward" value={summary?.carryForward} subLabel="Amount" />
                                <StatItem label="Total Accrual" value={summary?.totalAccrual} subLabel="Amount" highlighted />
                                <StatItem label="Periodic Accrual" value={summary?.periodicAccrual} subLabel="At Present" />
                                <StatItem label="Total Claim" value={summary?.totalClaim} subLabel="Amount" />
                                <StatItem label="Advance Periods" value={summary?.advancePeriods} isNumber subLabel="Months" />
                                <StatItem label="Total Balance" value={summary?.totalBalance} subLabel="Amount" />
                            </>
                        )}
                    </div>
                </div>

                {isExpanded && <div className="h-px w-full bg-gray-100"></div>}

                {/* Accrual list / error / loading states */}
                {isExpanded && (
                    <div className="bg-gray-50/50 p-6 md:p-8 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center gap-2 mb-6">
                            <TrendingUp className="h-4 w-4 text-slate-500" />
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Accrual Calculation</h3>
                        </div>

                        {/* error handling */}
                        {accruedError && (
                            <div className="p-4 rounded-md bg-red-50 border border-red-100 text-red-700 mb-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="font-semibold">Failed to load accruals</div>
                                        <div className="text-sm text-red-600 mt-1">{(accruedErrorObj as any)?.message ?? 'Unknown error'}</div>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <button onClick={() => refetchAccrued?.()} className="px-3 py-1 rounded bg-red-600 text-white text-sm">Retry</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* List header */}
                        <ListHeader />

                        {/* Rows or skeletons */}
                        {accruedLoading ? (
                            // show a few placeholder rows while loading
                            <>
                                {[...Array(6)].map((_, i) => (
                                    <SkeletonRow key={i} isDesktop={isDesktop} />
                                ))}
                            </>
                        ) : rows.length === 0 ? (
                            <div className="p-8 text-center text-sm text-gray-500">No accrual data available for this benefit.</div>
                        ) : (
                            rows.map(r => <AccrualItem key={r.id} item={r} />)
                        )}

                    </div>
                )}
            </div>
        </div>
    );
};

export default SalaryComponentCard;
