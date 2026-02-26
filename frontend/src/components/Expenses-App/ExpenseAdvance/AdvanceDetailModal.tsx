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
    <div className="overflow-x-auto border border-gray-200 rounded-lg whitespace-nowrap">
      <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="px-4 py-3 border-b">Advance Type</th>
            <th className="px-4 py-3 border-b">Date</th>

            <th className="px-4 py-3 border-b">Sanctioned Amount</th>
            <th className="px-4 py-3 border-b">Claimed Amount</th>
            <th className="px-4 py-3 border-b">Invoice No.</th>
            <th className="px-4 py-3 border-b">Merchant</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {Array.isArray(advanceDetails?.expenses) &&
          advanceDetails.expenses.length > 0 ? (
            advanceDetails.expenses.map((item: any, index: number) => {
              return (
                <tr
                  key={item.name || index}
                  className="even:bg-white odd:bg-gray-50 hover:bg-gray-100"
                >
                  <td className="px-4 py-3 align-top">
                    {item.expense_type ?? "—"}
                  </td>

                  <td className="px-4 py-3 align-top">
                    {formatToIndianDate(item.expense_date)}
                  </td>

                  <td className="px-4 py-3 align-top">
                    {formatCurrency(item.sanctioned_amount)}
                  </td>

                  <td className="px-4 py-3 align-top">
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {item.custom_invoice_number ?? "—"}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {item.custom_mercent ?? "—"}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td className="px-4 py-6 text-center text-gray-500" colSpan={4}>
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
            <div className="mb-3">
              <Typography variant="label" className="card-title">
                Breakup Entry {index + 1}
              </Typography>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel" className="block">
                  Advance Type
                </Typography>
                <Typography variant="mobileCardValue">
                  {item.expense_type ?? "—"}
                </Typography>
              </div>
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel" className="block">
                  Date
                </Typography>
                <Typography variant="mobileCardValue">
                  {formatToIndianDate(item.expense_date)}
                </Typography>
              </div>
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel" className="block">
                  Sanctioned Amount
                </Typography>
                <Typography variant="mobileCardValue">
                  {formatCurrency(item.sanctioned_amount)}
                </Typography>
              </div>
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel" className="block">
                  Claimed Amount
                </Typography>
                <Typography variant="mobileCardValue">
                  {formatCurrency(item.amount)}
                </Typography>
              </div>
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel" className="block">
                  Invoice No.
                </Typography>
                <Typography variant="mobileCardValue">
                  {item.custom_invoice_number ?? "—"}
                </Typography>
              </div>
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel" className="block">
                  Merchant
                </Typography>
                <Typography variant="mobileCardValue">
                  {item.custom_mercent ?? "—"}
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
                  Expense Breakup Items ({advanceDetails?.expenses?.length || 0}
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
