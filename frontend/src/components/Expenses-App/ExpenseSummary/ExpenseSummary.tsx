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
  onClick: () => void;
}

const PendingItem: React.FC<PendingItemProps> = ({
  category,
  label,
  icon: Icon,
  iconColor,
  iconBg,
  accentBorder,
  onClick,
}) => (
  <div
    onClick={onClick}
    className={`flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white border ${accentBorder} shadow-[0_2px_10px_-3px_rgba(6,81,237,0.08)] hover:shadow-[0_8px_20px_-6px_rgba(6,81,237,0.15)] hover:-translate-y-1 transition-all duration-300 cursor-pointer group`}
  >
    <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
      <div className={`p-2.5 rounded-xl ${iconBg} shrink-0 group-hover:scale-110 transition-transform duration-200`}>
        <Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={2} />
      </div>
      <Typography
        variant="h2"
        component="span"
        className="text-2xl sm:text-3xl font-bold text-gray-800 tracking-tight leading-none"
      >
        {padCount(category.count)}
      </Typography>
    </div>
    <div>
      <Typography
        variant="bodySmall"
        component="span"
        className="block text-base sm:text-lg font-semibold text-gray-700 mb-1"
      >
        {formatCurrency(category.amount)}
      </Typography>
      <Typography
        variant="caption"
        component="span"
        className="block text-[10px] min-[400px]:text-xs sm:text-sm font-medium text-gray-500 leading-tight"
      >
        {label}
      </Typography>
    </div>
  </div>
);

const RecordCard: React.FC<{ record: ReimbursementRecord }> = ({ record }) => {

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <Typography variant="bodyMedium" color="title" className="block mb-3 font-semibold">
        {record.name}
      </Typography>

      <div className="flex items-center gap-3 mb-5">
        <StatusBadge
          status={record.approval_status || "Unknown"}
          size="sm"
        />
        <Typography variant="caption" color="body2" className="font-medium text-[13px]">
          Updated on {formatToIndianDate(record.request_date)}
        </Typography>
      </div>

      <div className="flex items-center flex-wrap gap-3">
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1">
          <Clock className="w-3.5 h-3.5 text-gray-500" />
          <Typography variant="caption" className="font-medium text-gray-700">
            {record.no_of_expenses} {record.no_of_expenses === 1 ? 'Expense' : 'Expenses'}
          </Typography>
        </div>

        <div className="flex items-center gap-1.5 bg-success-50 border border-success-100 rounded-lg px-3 py-1">
          <CheckCircle className="w-3.5 h-3.5 text-success-600" />
          <Typography variant="caption" className="font-medium text-success-700">
            {formatINR(record.amount)}
          </Typography>
        </div>

        {record.rejected_count > 0 && (
          <div className="flex items-center gap-1.5 bg-error-50 border border-error-100 rounded-lg px-3 py-1">
            <XCircle className="w-3.5 h-3.5 text-error-600" />
            <Typography variant="caption" className="font-medium text-error-700">
              {record.rejected_count} Rejected
            </Typography>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Skeleton ── */
const ShimmerBar: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div
    className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.6s_ease-in-out_infinite] rounded-md ${className}`}
  />
);

const SummarySkeleton: React.FC = () => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-pulse">
    <div className="flex items-center gap-2.5 mb-6">
      <ShimmerBar className="w-7 h-7" />
      <ShimmerBar className="w-44 h-[18px]" />
    </div>
    <div className="mb-7 pb-5 border-b border-gray-100">
      <div className="flex items-center gap-2.5">
        <ShimmerBar className="w-16 h-8" />
        <ShimmerBar className="w-24 h-4" />
      </div>
      <ShimmerBar className="w-24 h-3.5 mt-2" />
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
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
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
    <div className="text-center py-8 px-4">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-error-50 flex items-center justify-center">
        <svg
          className="w-6 h-6 text-error"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <Typography variant="bodySmall" color="body2">
        Unable to load reimbursement summary.
      </Typography>
      <button
        onClick={onRetry}
        className="mt-3 px-5 py-1.5 text-sm font-semibold text-primary-600 bg-primary-50 rounded-lg border-none cursor-pointer hover:bg-primary-100 transition-colors duration-150"
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
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        {/* ── Heading ── */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center flex-shrink-0">
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
          <Typography variant="subheading" color="title">
            Reimbursement Summary
          </Typography>
        </div>

        {/* ── Total Expenses ── */}
        <div
          className="mb-7 pb-6 border-b border-gray-100 cursor-pointer group"
          onClick={() => handleCardClick("Total Expenses", summary.total_expenses)}
        >
          <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-primary-50/80 to-white border border-primary-100 p-4 sm:p-5 hover:shadow-[0_8px_20px_-6px_rgba(6,81,237,0.15)] hover:-translate-y-0.5 transition-all duration-300">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary-600 to-primary-500 shadow-sm shadow-primary-200 shrink-0 group-hover:scale-110 transition-transform duration-200">
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
              <Typography variant="caption" className="block text-xs font-semibold uppercase text-gray-400 tracking-wider mb-1">
                Total Expenses
              </Typography>
              <div className="flex items-baseline gap-3 flex-wrap">
                <Typography
                  variant="h2"
                  component="span"
                  className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight leading-none"
                >
                  {padCount(summary.total_expenses.count)}
                </Typography>
                <Typography
                  variant="h2"
                  component="span"
                  className="text-lg sm:text-xl font-semibold text-primary-600 leading-none"
                >
                  {formatCurrency(summary.total_expenses.amount)}
                </Typography>
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
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
            accentBorder="border-amber-100"
            onClick={() =>
              handleCardClick("Pending for Submission", summary.pending_for_submission)
            }
          />
          <PendingItem
            category={summary.pending_for_approval}
            label="Pending For Approval"
            icon={ClipboardCheck}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
            accentBorder="border-blue-100"
            onClick={() =>
              handleCardClick("Pending For Approval", summary.pending_for_approval)
            }
          />
          <PendingItem
            category={summary.pending_for_processing}
            label="Pending For Processing"
            icon={Cog}
            iconColor="text-rose-600"
            iconBg="bg-rose-50"
            accentBorder="border-rose-100"
            onClick={() =>
              handleCardClick("Pending For Processing", summary.pending_for_processing)
            }
          />
          <PendingItem
            category={summary.pending_for_clarification}
            label="Pending For Clarification"
            icon={HelpCircle}
            iconColor="text-violet-600"
            iconBg="bg-violet-50"
            accentBorder="border-violet-100"
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
        className="bg-gray-50/50"
      >
        <div className="p-4 min-h-full">
          {selectedCategory?.records.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12">
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
