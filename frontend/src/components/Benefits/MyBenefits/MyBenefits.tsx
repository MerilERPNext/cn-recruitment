/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Wallet, TrendingUp, TriangleAlert, X, Eye } from "lucide-react";
import DataListView from "../../DataListView";
import CardTable from "../../shared/CardTable";
import { FetchParams } from "../../../services/customApiService";
import { FrappePageResponse } from "../../../types/frappe";
import {
  useCurrentEmployeeIdCard,
  useEmployee,
} from "../../../hooks/useEmployee";
import {
  SalaryComponent,
  SalaryComponentDetail,
  useGetAllAccruedReimbursements,
  useGetYearFilterOptions,
} from "../../../hooks/useBenefit";
import { SkeletonStat } from "./Skeletons";
import { AccrualItem, StatItem } from "./CommonItems";
import { CURRENCY_SYMBOL, formatCurrency } from "../../../utils/currency";
import CustomDropdown from "../../shared/CustomDropdown";
import { Typography } from "../../shared/atoms/Typography";
import { NoDataFound } from "../../shared/atoms/NoDataFound";
import Button from "../../shared/atoms/Button";
import { useTargetUser } from "../../../context/ViewedUserContext";
import { getCurrentPeriod } from "../shared/logic";
import { useScreenSize } from "../../../hooks/useScreenSize";

export const COLUMN_LAYOUT =
  "minmax(100px, 1.5fr) 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr";

const MyBenefits: React.FC = () => {
  const { data: employee, isLoading: EmployeeIdCardLoading } = useCurrentEmployeeIdCard();
  const { isDesktop } = useScreenSize();

  const { targetEmployeeId, isViewingOtherUser } = useTargetUser();
  const { data: targetEmployee } = useEmployee(targetEmployeeId);

  const effectiveEmployee = isViewingOtherUser ? targetEmployee : employee;
  const effectiveEmployeeId = isViewingOtherUser
    ? targetEmployee?.name
    : employee?.id;
  const {
    data: optionYearsData,
    isLoading: YearsLoading,
    isError,
    error,
    refetch,
  } = useGetYearFilterOptions(effectiveEmployee?.company || "");
  const optionYears = useMemo(() => {
    if (YearsLoading || !optionYearsData) return [];
    else
      return optionYearsData?.map((data) => ({
        label: data?.name,
        value: data?.name,
      }));
  }, [optionYearsData, YearsLoading]);

  const [selectedYear, setSelectedYear] = useState("");

  useEffect(() => {
    setSelectedYear(() => getCurrentPeriod(optionYears));
  }, [optionYears]);

  const { data: allAccruedReimbursements, isLoading: AllAccruedReimbursementsLoading } =
    useGetAllAccruedReimbursements(
      effectiveEmployeeId || "",
      effectiveEmployee?.company || "",
      selectedYear,
    );

  const isLoading = EmployeeIdCardLoading || YearsLoading || AllAccruedReimbursementsLoading;
  // Keep track of which benefit cards are expanded — map by component name
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  // Mobile: selected component for detail modal
  const [selectedComponent, setSelectedComponent] = useState<SalaryComponent | null>(null);

  const toggleExpanded = (key: string) =>
    setExpandedMap((prev) => ({ ...prev, [key]: !prev[key] }));

  // // Render error UI
  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans text-slate-800 pb-12">
        <header className="bg-white mx-8 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-slate-900">
                My Benefits for FY {selectedYear}
              </h1>
              <div className="flex gap-3 items-center">
                <Button onClick={() => refetch?.()}>Retry</Button>
              </div>
            </div>
          </div>
        </header>

        <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center rounded-xl bg-white shadow-sm border border-gray-200 p-8">
            <TriangleAlert className="w-10 h-10 text-red-700  " />
            <h2 className="text-lg font-bold mb-2">Failed to load benefits</h2>
            <p className="text-sm text-gray-600 mb-4">
              We couldn't fetch your accrued reimbursements.{" "}
              {String((error as any)?.message ?? "")}
            </p>
            <div className="flex gap-3">
              <Button
                size="md"
                className="px-4 py-2 rounded bg-blue-600 text-white"
                onClick={() => refetch?.()}
              >
                Try again
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Loading skeleton UI
  if (isLoading) {
    const skeletonCount = 4;
    return (
      <div className="min-h-screen font-sans text-slate-800 p-5">
        <div className="flex flex-col mb-2">
          <Typography variant="h4">
            My Benefits for FY {selectedYear}
          </Typography>
          <Typography variant="bodySmall" color="body2">
            Track your benefits
          </Typography>
        </div>
        <main className="w-full">
          <div className="space-y-6">
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden p-6 md:p-8"
              >
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
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0">
        <div className="px-1 md:px-6 py-1 md:py-4">
          <div className="flex items-center justify-between">
            {isDesktop ? (
              <div>
                <Typography variant="h4">
                  My Benefits for FY {selectedYear}
                </Typography>
                <Typography variant="bodySmall" color="body2">
                  Track and manage your benefits
                </Typography>
              </div>
            ) : (
              <div>
                <Typography variant="h4">
                  My Benefits for FY {selectedYear}
                </Typography>
              </div>
            )}
            <CustomDropdown
              position="bottom-left"
              value={selectedYear}
              onChange={(event) => setSelectedYear(event?.target.value)}
              options={optionYears}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto md:px-4 pb-5 md:pb-20">
        {!components || components.length === 0 ? (
          <NoDataFound title="No Benefits Found" subtitle="No benefit data is available for the selected period." />
        ) : null}

        <main className="w-full pb-10 md:pb-20 space-y-4">
          {components?.map((component, compIdx) => {
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
                : details.filter((r) =>
                  r.month
                    .toLowerCase()
                    .includes(params.searchTerm!.toLowerCase()),
                );

              const response: FrappePageResponse = {
                data: filtered,
                totalCount: filtered.length,
                nextCursor: null,
              } as unknown as FrappePageResponse;

              return response;
            };

            if (!isDesktop) {
              // Mobile: Compact card with key stats + View Details button
              return (
                <div
                  key={`${component.salary_component}-${compIdx}`}
                  className="cursor-pointer border-t-4 border-x-1 border-b-1 border-x-primary/20 border-b-primary/20 shadow-sm border-primary bg-white rounded-xl w-full"
                >
                  <div className="p-4 w-full">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-emerald-50 rounded-lg">
                        <Wallet className="h-5 w-5 text-emerald-600" />
                      </div>
                      <h2 className="text-base font-bold text-slate-800 leading-tight">
                        {component.salary_component}
                      </h2>
                    </div>

                    {/* Key Stats - 2 col grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-0.5 p-2.5 rounded-lg bg-gray-50">
                        <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-700">Total Accrual</span>
                        <span className="text-base font-bold text-blue-700">{CURRENCY_SYMBOL}{totalAccrual.toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col gap-0.5 p-2.5 rounded-lg bg-gray-50">
                        <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-700">Total Balance</span>
                        <span className="text-base font-bold text-slate-800">{CURRENCY_SYMBOL}{totalBalance.toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col gap-0.5 p-2.5 rounded-lg bg-gray-50">
                        <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-700">Total Claim</span>
                        <span className="text-base font-bold text-slate-800">{CURRENCY_SYMBOL}{totalClaim.toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col gap-0.5 p-2.5 rounded-lg bg-gray-50">
                        <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-700">Carry Forward</span>
                        <span className="text-base font-bold text-slate-800">{CURRENCY_SYMBOL}{carryForward.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* View Details button */}
                    <div className="mt-4 flex justify-end">
                      <button
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
                        onClick={() => setSelectedComponent(component)}
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={`${component.salary_component}-${compIdx}`}
                className="rounded-xl bg-white shadow-sm border border-gray-50 overflow-hidden"
              >
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
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-200 transition-all duration-300 ${isExpanded ? "rotate-180 bg-gray-50" : ""
                        }`}
                    >
                      <ChevronDown className="h-5 w-5 text-slate-500" />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-8">
                    <StatItem
                      label="Carry Forward"
                      value={carryForward}
                      subLabel="Amount"
                    />
                    <StatItem
                      label="Total Accrual"
                      value={totalAccrual}
                      subLabel="Amount"
                      highlighted
                    />
                    <StatItem
                      label="Periodic Accrual"
                      value={periodicAccrual}
                      subLabel="At Present"
                    />
                    <StatItem
                      label="Total Claim"
                      value={totalClaim}
                      subLabel="Amount"
                    />
                    <StatItem
                      label="Advance Periods"
                      value={advancePeriods}
                      isNumber
                      subLabel="Months"
                    />
                    <StatItem
                      label="Total Balance"
                      value={totalBalance}
                      subLabel="Amount"
                    />
                  </div>
                </div>

                {/* Divider */}
                {isExpanded && isDesktop && <div className="h-px w-full bg-gray-100"></div>}

                {/* Expanded details (list) */}
                {isExpanded && (
                  <div className="bg-slate-50 p-6 md:p-8 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-2 mb-6">
                      <TrendingUp className="h-4 w-4 text-slate-500" />
                      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                        Accrual Calculation
                      </h3>
                    </div>
                    <CardTable
                      titles={[
                        "Period",
                        "Work Days",
                        "Payment Days",
                        "Arrear Days",
                        "LOP Days",
                        "Original Accrual",
                        "Periodic Accrued",
                        "Claimed Amt",
                        "Paid Amt",
                        "Closing Bal",
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
                        isLoading={YearsLoading}
                      />
                    </CardTable>
                  </div>
                )}
              </div>
            );
          })}
        </main>
      </div>

      {/* Mobile: Accrual Detail Modal */}
      {selectedComponent && !isDesktop && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-emerald-50 rounded-lg shrink-0">
                <Wallet className="h-5 w-5 text-emerald-600" />
              </div>
              <h2 className="text-base font-bold text-slate-800 truncate">
                {selectedComponent.salary_component}
              </h2>
            </div>
            <button
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
              onClick={() => setSelectedComponent(null)}
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          {/* Stats Summary */}
          <div className="p-4 border-b border-gray-100">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-0.5 p-2.5 rounded-lg bg-blue-50/50 border border-blue-100">
                <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-700">Total Accrual</span>
                <span className="text-base font-bold text-blue-700">{CURRENCY_SYMBOL}{(selectedComponent.total_accrued_amount ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex flex-col gap-0.5 p-2.5 rounded-lg bg-gray-50">
                <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-700">Balance</span>
                <span className="text-base font-bold text-slate-800">{CURRENCY_SYMBOL}{(selectedComponent.total_balance_amount ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex flex-col gap-0.5 p-2.5 rounded-lg bg-gray-50">
                <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-700">Total Claim</span>
                <span className="text-base font-bold text-slate-800">{CURRENCY_SYMBOL}{(selectedComponent.total_claimed_amount ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex flex-col gap-0.5 p-2.5 rounded-lg bg-gray-50">
                <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-700">Periodic Accrual</span>
                <span className="text-base font-bold text-slate-800">{CURRENCY_SYMBOL}{(selectedComponent.periodic_original_amount ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex flex-col gap-0.5 p-2.5 rounded-lg bg-gray-50">
                <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-700">Carry Forward</span>
                <span className="text-base font-bold text-slate-800">{CURRENCY_SYMBOL}{(selectedComponent.carry_forward_amount ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex flex-col gap-0.5 p-2.5 rounded-lg bg-gray-50">
                <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-700">Advance Periods</span>
                <span className="text-base font-bold text-slate-800">{selectedComponent.advance_period ?? 0} Months</span>
              </div>
            </div>
          </div>

          {/* Accrual Detail List */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Accrual Calculation
              </h3>
            </div>
            <div className="space-y-3">
              {(selectedComponent.details ?? []).map((detail, idx) => (
                <MobileDetailCard key={detail.month ?? idx} data={detail} />
              ))}
              {(!selectedComponent.details || selectedComponent.details.length === 0) && (
                <NoDataFound title="No Details" subtitle="No accrual details available." />
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

/* Mobile detail card for accrual items inside modal */
const MobileDetailCard = ({ data }: { data: SalaryComponentDetail }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Card Header - Period + Closing Balance */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-gray-100">
        <span className="font-bold text-slate-800 text-sm">{data.month}</span>
        <div className="flex flex-col items-end">
          <span className="text-[9px] text-gray-600 uppercase tracking-wider">Closing Bal</span>
          <span className="text-sm font-bold text-emerald-700">
            {formatCurrency(data.closing_balance ?? 0)}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Days Section */}
        <div>
          <span className="text-[9px] uppercase tracking-wider font-semibold text-gray-600 mb-2 block">
            Days Breakdown
          </span>
          <div className="grid grid-cols-4 gap-2">
            <div className="flex flex-col items-center p-2 rounded-lg bg-gray-50">
              <span className="text-[9px] text-gray-600 uppercase">Work</span>
              <span className="text-sm font-bold text-slate-800">{data.working_days ?? 0}</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-gray-50">
              <span className="text-[9px] text-gray-600 uppercase">Payment</span>
              <span className="text-sm font-bold text-slate-800">{data.payment_days ?? 0}</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-gray-50">
              <span className="text-[9px] text-gray-600 uppercase">Arrear</span>
              <span className="text-sm font-bold text-slate-800">{data.arrear_days ?? 0}</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-gray-50">
              <span className="text-[9px] text-gray-600 uppercase">LOP</span>
              <span className="text-sm font-bold text-red-600">{data.lop_days ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Amounts Section */}
        <div>
          <span className="text-[9px] uppercase tracking-wider font-semibold text-gray-600 mb-2 block">
            Amounts
          </span>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600">Original Accrual</span>
              <span className="text-xs font-semibold text-slate-700">{formatCurrency(data?.periodic_original_amount ?? 0)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600">Periodic Accrued</span>
              <span className="text-xs font-semibold text-slate-700">{formatCurrency(data?.amount ?? 0)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600">Claimed</span>
              <span className="text-xs font-semibold text-slate-700">{formatCurrency(data?.claimed_amount ?? 0)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-600">Paid</span>
              <span className="text-xs font-semibold text-slate-700">{formatCurrency(data?.paid_amount ?? 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyBenefits;
