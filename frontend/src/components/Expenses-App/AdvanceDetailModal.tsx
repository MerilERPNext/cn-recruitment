import React from "react";
import { X } from "lucide-react"; // Renamed XIcon to X for Lucide consistency
import { StatusBadge } from "../SalarySlip/Advances/StatusBadge";
import { formatCurrency } from "../../utils/currencyFormatter";
import formatToIndianDate from "../../utils/formatToIndianDate";
import { useFrappeDocument } from "../../hooks/useFrappeQuery"; // Assuming this is the correct hook


interface AdvanceDetailModalProps {
  id: string; // The name of the Employee Advance document
  onClose: () => void;
}

const AdvanceDetailModal: React.FC<AdvanceDetailModalProps> = ({
  id,
  onClose,
}) => {
  // Use the established hook pattern for fetching a single document
  const raw = useFrappeDocument("Employee Advance", id as string);

  // Safely extract data, loading, and error states
  const advanceDetails = raw.data as any | undefined;
  const isLoading = raw.isLoading;
  const error = raw.error;

  if (!id) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-4xl rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
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

        {/* Modal Content */}
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
              {/* === MAIN ADVANCE DETAILS (Grid View) === */}
              <h4 className="text-md font-semibold mb-3 border-b pb-2">
                Advance Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-6 mb-6 text-sm">
                {/* Row 1 */}
                <p>
                  <strong className="text-gray-600">Employee:</strong>{" "}
                  {`${advanceDetails.employee_name}: ${advanceDetails.employee}`}
                </p>
                <p>
                  <strong className="text-gray-600">Posting Date:</strong>{" "}
                  {formatToIndianDate(advanceDetails.posting_date)}
                </p>

                {/* Row 2 */}
                <p>
                  <strong className="text-gray-600">Company:</strong>{" "}
                  {advanceDetails.company}
                </p>
                <p>
                  <strong className="text-gray-600">Department:</strong>{" "}
                  {advanceDetails.department}
                </p>
                <p>
                  <strong className="text-gray-600">Designation:</strong>{" "}
                  {advanceDetails.custom_designation || "—"}
                </p>

                {/* Row 3 */}

                <p className="flex items-center gap-2">
                  <strong className="text-gray-600">Status:</strong>
                  <StatusBadge status={advanceDetails.status} />
                </p>

                {/* Row 4 (Financials) */}
                <p className="text-base font-bold text-blue-700">
                  <strong className="text-gray-600">Amount:</strong>{" "}
                  {formatCurrency(advanceDetails.advance_amount)}
                </p>
              </div>

              {/* === BREAKUP ITEMS (Table View) === */}
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
                        <th className="px-4 py-3 border-b">Merchant</th>
                        <th className="px-4 py-3 border-b">Invoice No.</th>

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

                                <td className="px-4 py-3 align-top">
                                  {item.custom_mercent || "—"}
                                </td>

                                <td className="px-4 py-3 align-top">
                                  {item.custom_invoice_number || "—"}
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
