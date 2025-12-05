import React from "react";
import { X } from "lucide-react";
import { StatusBadge } from "../../SalarySlip/Advances/StatusBadge";
import { formatCurrency } from "../../../utils/currencyFormatter";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import { useFrappeDocument } from "../../../hooks/useFrappeQuery";
import { ApprovalStage } from "../../../types/expenseAdvance";
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

  const advanceDetails = raw.data as any | undefined;
  const isLoading = raw.isLoading;
  const error = raw.error;

  if (!id) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b">
          <h3 className="text-lg font-semibold text-gray-800">
            Advance Details: {id}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 p-2 rounded-full hover:bg-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-6 mb-6 text-sm">
                <p>
                  <strong className="text-gray-600">Employee:</strong>{" "}
                  {`${advanceDetails.employee_name}: ${advanceDetails.employee}`}
                </p>
                <p>
                  <strong className="text-gray-600">Posting Date:</strong>{" "}
                  {formatToIndianDate(advanceDetails.posting_date)}
                </p>

                <p>
                  <strong className="text-gray-600">Company:</strong>{" "}
                  {advanceDetails.company}
                </p>
                <p>
                  <strong className="text-gray-600">Department:</strong>{" "}
                  {advanceDetails.department}
                </p>

                <p className="flex items-center gap-2">
                  <strong className="text-gray-600">Status:</strong>
                  <StatusBadge status={advanceDetails.status} />
                </p>

                <p className="text-base font-bold text-blue-700">
                  <strong className="text-gray-600">Amount:</strong>{" "}
                  {formatCurrency(advanceDetails.advance_amount)}
                </p>
              </div>

              {Array.isArray(selectedStages) && selectedStages.length > 0 && (
                <div className="mb-4 pt-2">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Approval Stages
                  </h4>
                  <ApprovalStagesProgress stages={selectedStages} />
                </div>
              )}

              <div className="mt-6 border-t pt-4">
                <h4 className="text-md font-semibold mb-3">
                  Expense Breakup Items ({advanceDetails.expenses?.length || 0})
                </h4>

                <div className="overflow-x-auto border border-gray-200 rounded-lg whitespace-nowrap">
                  <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="px-4 py-3 border-b">Advance Type</th>
                        <th className="px-4 py-3 border-b">Date</th>
                        <th className="px-4 py-3 border-b text-right">
                          Sanctioned Amount
                        </th>
                        <th className="px-4 py-3 border-b text-right">
                          Claimed Amount
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {Array.isArray(advanceDetails.expenses) &&
                      advanceDetails.expenses.length > 0 ? (
                        advanceDetails.expenses.map(
                          (item: any, index: number) => {
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

                                <td className="px-4 py-3 text-right align-top font-medium">
                                  {formatCurrency(item.sanctioned_amount)}
                                </td>

                                <td className="px-4 py-3 text-right align-top font-medium">
                                  {formatCurrency(item.amount)}
                                </td>
                              </tr>
                            );
                          }
                        )
                      ) : (
                        <tr>
                          <td
                            className="px-4 py-6 text-center text-gray-500"
                            colSpan={5}
                          >
                            No specific breakup items found for this advance.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvanceDetailModal;
