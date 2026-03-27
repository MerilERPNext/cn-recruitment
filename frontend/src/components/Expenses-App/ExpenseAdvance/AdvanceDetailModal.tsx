import { X } from "lucide-react";
import React from "react";
import { useFrappeDocument } from "../../../hooks/useFrappeQuery";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { ApprovalStage, Expense } from "../../../types/expenseAdvance";
import { formatCurrency } from "../../../utils/currencyFormatter";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import Button from "../../shared/atoms/Button";
import StatusBadge from "../../shared/atoms/statusBadge";
import { Typography } from "../../shared/atoms/Typography";
import ApprovalStagesProgress from "../ExpenseClaim/ApprovalStagesProgress";

interface AdvanceDetailModalProps {
  id: string;
  onClose: () => void;
  selectedStages: ApprovalStage[];
}

const AdvanceDetailModal: React.FC<AdvanceDetailModalProps> = ({
  id,
  onClose,
  selectedStages,
}) => {
  const raw = useFrappeDocument("Employee Advance", id as string);

  interface EmployeeAdvance {
    employee_name: string;
    employee: string;
    status: string;
    posting_date: string;
    advance_amount: number;
    company: string;
    department: string;
    expenses?: Expense[];
    custom_advance_policy?: string;
    custom_advance_type?: string;
  }

  const advanceDetails = raw.data as EmployeeAdvance | undefined;
  const isLoading = raw.isLoading;
  const error = raw.error;
  const { isDesktop } = useScreenSize();

  if (!id) return null;

  // Desktop table for expense breakup
  const DesktopBreakup = (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="min-w-full text-sm text-center">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Advance Type
            </th>
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Advance Date
            </th>
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Sanctioned Amount
            </th>
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Claimed Amount
            </th>
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Approval Status
            </th>
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Description
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {Array.isArray(advanceDetails?.expenses) &&
          advanceDetails.expenses.length > 0 ? (
            advanceDetails.expenses.map((item: any, index: number) => (
              <tr
                key={item.name || index}
                className="bg-white hover:bg-gray-50 transition-colors duration-150"
              >
                <td className="px-4 py-3 text-gray-800">{item.expense_type}</td>
                <td className="px-4 py-3 text-gray-800">
                  {formatToIndianDate(item.expense_date)}
                </td>
                <td className="px-4 py-3 text-gray-800">
                  {formatCurrency(item.sanctioned_amount)}
                </td>
                <td className="px-4 py-3 text-gray-800">
                  {formatCurrency(item.amount)}
                </td>
                <td className="px-4 py-3 text-gray-800">
                  {<StatusBadge status={item.custom_approval_staus} />}
                </td>
                <td className="px-4 py-3 text-gray-800">{item.description}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                className="px-4 py-8 text-center text-gray-400 italic"
                colSpan={6}
              >
                No specific breakup items found for this advance.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // Mobile card-based breakup
  const MobileBreakup = (
    <div className="grid grid-cols-1 gap-4">
      {Array.isArray(advanceDetails?.expenses) &&
      advanceDetails.expenses.length > 0 ? (
        advanceDetails.expenses.map((item: any, index: number) => (
          <div
            key={item.name || index}
            className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm"
          >
            {/* Header */}
            <div className="mb-3 flex justify-between items-center">
              <Typography variant="label" className="card-title">
                Breakup Entry {index + 1}
              </Typography>

              {/* Approval Status */}
              <StatusBadge status={item.custom_approval_staus} />
            </div>

            {/* Content */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {/* Advance Type */}
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">Advance Type</Typography>
                <Typography variant="mobileCardValue">
                  {item.expense_type ?? "—"}
                </Typography>
              </div>

              {/* Advance Date */}
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">Advance Date</Typography>
                <Typography variant="mobileCardValue">
                  {formatToIndianDate(item.expense_date)}
                </Typography>
              </div>

              {/* Sanctioned Amount */}
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">
                  Sanctioned Amount
                </Typography>
                <Typography variant="mobileCardValue">
                  {formatCurrency(item.sanctioned_amount)}
                </Typography>
              </div>

              {/* Claimed Amount */}
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel">
                  Claimed Amount
                </Typography>
                <Typography variant="mobileCardValue">
                  {formatCurrency(item.amount)}
                </Typography>
              </div>

              {/* Description (full width) */}
              <div className="col-span-2 flex flex-col gap-1">
                <Typography variant="mobileCardLabel">Description</Typography>
                <Typography variant="mobileCardValue">
                  {item.description || "—"}
                </Typography>
              </div>
            </div>
          </div>
        ))
      ) : (
        <Typography
          variant="mobileCardValue"
          className="text-center text-gray-500 py-4"
        >
          No specific breakup items found for this advance.
        </Typography>
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={onClose}
    >
      <div
        className="w-full h-full md:h-auto md:max-w-xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <Typography
            variant="bodyMedium"
            className="font-semibold text-gray-900 leading-tight"
          >
            Advance Details: {id}
          </Typography>

          <Button
            variant="subtle"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <p className="text-gray-500 text-center py-10">
              Loading details...
            </p>
          ) : error ? (
            <p className="text-red-600 text-center py-10">
              Failed to load advance details: {error.message || "Unknown error"}
            </p>
          ) : (
            <>
              {/* Employee + Status */}
              <div className="flex gap-2 justify-between p-1">
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel">
                    {advanceDetails?.employee_name
                      ? "Employee Name"
                      : "Employee ID"}
                  </Typography>{" "}
                  <Typography variant="mobileCardValue">
                    {advanceDetails?.employee_name || advanceDetails?.employee}
                  </Typography>
                </div>
                <div>
                  <StatusBadge status={advanceDetails?.status} />
                </div>
              </div>

              {/* Paired data rows */}
              <div className="flex flex-col items-start justify-between mt-2 rounded-md p-1 gap-4">
                <div className="flex justify-between w-full">
                  <div className="flex flex-col gap-2">
                    <Typography variant="mobileCardLabel" className="block">
                      Advance Policy
                    </Typography>
                    <Typography variant="mobileCardValue">
                      {advanceDetails?.custom_advance_policy}
                    </Typography>
                  </div>
                  <div className="flex flex-col gap-2 text-right">
                    <Typography variant="mobileCardLabel" className="block">
                      Posting Date
                    </Typography>
                    <Typography variant="mobileCardValue">
                      {formatToIndianDate(advanceDetails?.posting_date ?? "")}
                    </Typography>
                  </div>
                </div>
                <div className="flex justify-between w-full">
                  <div className="flex flex-col gap-2">
                    <Typography variant="mobileCardLabel" className="block">
                      Advance Category
                    </Typography>
                    <Typography variant="mobileCardValue">
                      {advanceDetails?.custom_advance_type}
                    </Typography>
                  </div>
                  <div className="flex flex-col gap-2 text-right">
                    <Typography variant="mobileCardLabel" className="block">
                      Amount
                    </Typography>
                    <Typography
                      variant="mobileCardValue"
                      className="font-bold text-blue-700"
                    >
                      {formatCurrency(advanceDetails?.advance_amount ?? 0)}
                    </Typography>
                  </div>
                </div>
              </div>

              {/* Approval Stages */}
              {Array.isArray(selectedStages) && selectedStages.length > 0 && (
                <div className="mb-4 pt-2">
                  <Typography
                    variant="bodySmall"
                    className="base-title mb-1 font-bold block"
                  >
                    Approval Stages
                  </Typography>
                  <ApprovalStagesProgress stages={selectedStages} />
                </div>
              )}

              {/* Expense Breakup */}
              <div className="mt-6 border-t pt-4">
                <Typography
                  variant="bodySmall"
                  className="base-title mb-1 font-bold block"
                >
                  Advance Breakup Items ({advanceDetails?.expenses?.length || 0}
                  )
                </Typography>

                {isDesktop ? DesktopBreakup : MobileBreakup}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvanceDetailModal;
