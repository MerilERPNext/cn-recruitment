import React, { useState } from "react";
import { useCurrentEmployeeDetails } from "../../../hooks/useEmployee";
import { useReimbursementSummary } from "../../../hooks/useExpense";
import type {
  ReimbursementCategory,
  ReimbursementRecord,
} from "../../../types/expenseSummary";
import { Typography } from "../../shared/atoms/Typography";
import SideDrawer from "../../shared/SideDrawer";
import NoDataFound from "../../shared/atoms/NoDataFound";
import { Clock, CheckCircle, XCircle, Send, ClipboardCheck, Cog, HelpCircle } from "lucide-react";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { formatCurrency } from "../../../utils/currency";
import StatusBadge from "../../shared/atoms/statusBadge";

/* ───────────────────────── helpers ───────────────────────── */

const formatINR = (amount: number): string =>
  `INR ${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const padCount = (count: number): string => String(count).padStart(2, "0");

/* ───────────────────────── sub-components ────────────────── */

interface PendingItemProps {
  category: ReimbursementCategory;
  label: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  accentBorder: string;
  cardBg: string;
  onClick: () => void;
}

const PendingItem: React.FC<PendingItemProps> = ({
  category,
  label,
  icon: Icon,
  iconColor,
  iconBg,
  accentBorder,
  cardBg,
  onClick,
}) => (
  <div
    onClick={onClick}
    className={`flex flex-col justify-between p-4 sm:p-5 rounded-2xl ${cardBg} border ${accentBorder} shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer group`}
  >
    <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
      <div className={`p-2.5 rounded-xl ${iconBg} shrink-0 group-hover:scale-110 transition-transform duration-200`}>
        <Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={2} />
      </div>
      <span className="text-2xl sm:text-3xl font-bold text-[#111729] dark:text-[#F9FAFB] tracking-tight leading-none">
        {padCount(category.count)}
      </span>
    </div>
    <div>
      <span className="block text-base sm:text-lg font-semibold text-[#1F2937] dark:text-[#E5E7EB] mb-1">
        {formatCurrency(category.amount)}
      </span>
      <span className="block text-[10px] min-[400px]:text-xs sm:text-sm font-medium text-[#6B7280] dark:text-[#9CA3AF] leading-tight">
        {label}
      </span>
    </div>
  </div>
);

const RecordCard: React.FC<{ record: ReimbursementRecord }> = ({ record }) => {

  return (
    <div className="bg-white dark:bg-[#0B1724] rounded-xl border border-slate-200 dark:border-[#1E3A4C] p-5 mb-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <Typography variant="bodyMedium" color="title" className="block mb-3 font-semibold text-[#111729] dark:text-[#F9FAFB]">
        {record.name}
      </Typography>

      <div className="flex items-center gap-3 mb-5">
        <StatusBadge
          status={record.approval_status || "Unknown"}
          size="sm"
        />
        <span className="font-medium text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">
          Updated on {formatToIndianDate(record.request_date)}
        </span>
      </div>

      <div className="flex items-center flex-wrap gap-3">
        <div className="flex items-center gap-1.5 bg-[#F8FAFC] dark:bg-[#102030] border border-[#E2E8F0] dark:border-[#1E3A4C] rounded-lg px-3 py-1">
          <Clock className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8]" />
          <span className="font-medium text-xs text-[#334155] dark:text-[#CBD5E1]">
            {record.no_of_expenses} {record.no_of_expenses === 1 ? 'Expense' : 'Expenses'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#F0FDF4] dark:bg-[#0D281E] border border-[#BBF7D0] dark:border-[#14532D] rounded-lg px-3 py-1">
          <CheckCircle className="w-3.5 h-3.5 text-[#16A34A] dark:text-[#4ADE80]" />
          <span className="font-medium text-xs text-[#15803D] dark:text-[#86EFAC]">
            {formatINR(record.amount)}
          </span>
        </div>

        {record.rejected_count > 0 && (
          <div className="flex items-center gap-1.5 bg-[#FEF2F2] dark:bg-[#2F1517] border border-[#FECACA] dark:border-[#7F1D1D] rounded-lg px-3 py-1">
            <XCircle className="w-3.5 h-3.5 text-[#DC2626] dark:text-[#F87171]" />
            <span className="font-medium text-xs text-[#B91C1C] dark:text-[#FCA5A5]">
              {record.rejected_count} Rejected
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Skeleton ── */
const ShimmerBar: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div
    className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 bg-[length:200%_100%] animate-[shimmer_1.6s_ease-in-out_infinite] rounded-md ${className}`}
  />
);

const SummarySkeleton: React.FC = () => (
  <div className="bg-white dark:bg-[#0B1724] rounded-xl p-6 shadow-sm border border-slate-200 dark:border-[#1E3A4C] animate-pulse">
    <div className="flex items-center gap-2.5 mb-6">
      <ShimmerBar className="w-7 h-7" />
      <ShimmerBar className="w-44 h-[18px]" />
    </div>
    <div className="mb-7 pb-5 border-b border-slate-100 dark:border-[#1E3A4C]">
      <div className="flex items-center gap-2.5">
        <ShimmerBar className="w-16 h-8" />
        <ShimmerBar className="w-24 h-4" />
      </div>
      <ShimmerBar className="w-24 h-3.5 mt-2" />
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-[#102030] border border-slate-100 dark:border-[#1E3A4C]">
          <ShimmerBar className="w-20 h-5" />
          <ShimmerBar className="w-full h-3 mt-2" />
        </div>
      ))}
    </div>
  </div>
);

/* ── Error ── */
interface ErrorStateProps {
  onRetry: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ onRetry }) => (
  <div className="bg-white dark:bg-[#0B1724] rounded-xl p-6 shadow-sm border border-slate-200 dark:border-[#1E3A4C]">
    <div className="text-center py-8 px-4">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-50 dark:bg-[#2F1517] flex items-center justify-center">
        <svg
          className="w-6 h-6 text-red-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <span className="block text-sm text-slate-600 dark:text-slate-300">
        Unable to load reimbursement summary.
      </span>
      <button
        onClick={onRetry}
        className="mt-3 px-5 py-1.5 text-sm font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-[#102A3A] rounded-lg border-none cursor-pointer hover:bg-cyan-100 dark:hover:bg-[#1A3D54] transition-colors duration-150"
      >
        Try Again
      </button>
    </div>
  </div>
);

/* ───────────────────── main component ───────────────────── */

const ExpenseSummary: React.FC = () => {
  const { data: currentEmployee, isLoading: isLoadingEmployee, isError: isErrorEmployee, refetch: refetchEmployee } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });

  const employeeId = currentEmployee?.name;

  const {
    data: summary,
    isLoading,
    isError,
    refetch,
  } = useReimbursementSummary(employeeId);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{
    label: string;
    records: ReimbursementRecord[];
  } | null>(null);

  const handleCardClick = (
    label: string,
    category: ReimbursementCategory
  ) => {
    setSelectedCategory({ label, records: category.records || [] });
    setDrawerOpen(true);
  };

  /* Loading */
  if (isLoading || isLoadingEmployee) {
    return <SummarySkeleton />;
  }

  /* Error */
  if (isError || !summary || isErrorEmployee || !employeeId) {
    return <ErrorState onRetry={() => { refetch(); refetchEmployee(); }} />;
  }

  return (
    <>
      <div className="bg-white dark:bg-[#0B1724] rounded-xl p-6 shadow-sm border border-slate-200 dark:border-[#1E3A4C]">
        {/* ── Heading ── */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-cyan-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
          <span className="text-lg font-semibold text-[#111729] dark:text-[#F9FAFB]">
            Reimbursement Summary
          </span>
        </div>

        {/* ── Total Expenses ── */}
        <div
          className="mb-7 pb-6 border-b border-slate-100 dark:border-[#1E3A4C] cursor-pointer group"
          onClick={() => handleCardClick("Total Expenses", summary.total_expenses)}
        >
          <div className="flex items-center gap-4 rounded-2xl bg-[#F0F9FF] dark:bg-[#102A3A] border border-[#BAE6FD] dark:border-[#1E3A4C] p-4 sm:p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
            <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-600 to-cyan-500 dark:from-cyan-500 dark:to-cyan-400 shadow-sm shrink-0 group-hover:scale-110 transition-transform duration-200">
              <svg
                className="w-6 h-6 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-1">
                Total Expenses
              </span>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-2xl sm:text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight leading-none">
                  {padCount(summary.total_expenses.count)}
                </span>
                <span className="text-lg sm:text-xl font-semibold text-cyan-600 dark:text-cyan-400 leading-none">
                  {formatCurrency(summary.total_expenses.amount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Pending Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <PendingItem
            category={summary.pending_for_submission}
            label="Pending for Submission"
            icon={Send}
            iconColor="text-[#D97706] dark:text-[#FBBF24]"
            iconBg="bg-[#FEF3C7] dark:bg-[#38260B]"
            accentBorder="border-[#FDE68A] dark:border-[#543A10]"
            cardBg="bg-[#FFFBEB] dark:bg-[#1A150E]"
            onClick={() =>
              handleCardClick("Pending for Submission", summary.pending_for_submission)
            }
          />
          <PendingItem
            category={summary.pending_for_approval}
            label="Pending For Approval"
            icon={ClipboardCheck}
            iconColor="text-[#2563EB] dark:text-[#60A5FA]"
            iconBg="bg-[#DBEAFE] dark:bg-[#0F294A]"
            accentBorder="border-[#BFDBFE] dark:border-[#1E40AF]/60"
            cardBg="bg-[#EFF6FF] dark:bg-[#0B1728]"
            onClick={() =>
              handleCardClick("Pending For Approval", summary.pending_for_approval)
            }
          />
          <PendingItem
            category={summary.pending_for_processing}
            label="Pending For Processing"
            icon={Cog}
            iconColor="text-[#E11D48] dark:text-[#FB7185]"
            iconBg="bg-[#FFE4E6] dark:bg-[#3D141D]"
            accentBorder="border-[#FECDD3] dark:border-[#881337]/60"
            cardBg="bg-[#FFF1F2] dark:bg-[#1F0C10]"
            onClick={() =>
              handleCardClick("Pending For Processing", summary.pending_for_processing)
            }
          />
          <PendingItem
            category={summary.pending_for_clarification}
            label="Pending For Clarification"
            icon={HelpCircle}
            iconColor="text-[#7C3AED] dark:text-[#A78BFA]"
            iconBg="bg-[#EDE9FE] dark:bg-[#28154D]"
            accentBorder="border-[#DDD6FE] dark:border-[#5B21B6]/60"
            cardBg="bg-[#F5F3FF] dark:bg-[#140C24]"
            onClick={() =>
              handleCardClick("Pending For Clarification", summary.pending_for_clarification)
            }
          />
        </div>
      </div>

      {/* ── Details Drawer ── */}
      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedCategory?.label || "Details"}
        size="xl"
        side="right"
        className="bg-app"
      >
        <div className="p-4 min-h-full">
          {selectedCategory?.records.length === 0 ? (
            <div className="bg-white dark:bg-[#0B1724] rounded-xl border border-slate-200 dark:border-[#1E3A4C] shadow-sm py-12">
              <NoDataFound
                title="No Records Found"
                subtitle="There are currently no expenses in this category."
              />
            </div>
          ) : (
            <div className="space-y-4">
              {selectedCategory?.records.map((record) => (
                <RecordCard key={record.name} record={record} />
              ))}
            </div>
          )}
        </div>
      </SideDrawer>
    </>
  );
};

export default ExpenseSummary;
