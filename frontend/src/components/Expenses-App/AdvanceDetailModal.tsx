// AdvanceDetailModal.tsx (Create a new file)

import React from "react";
import { X } from "lucide-react";
import { useExpenseAdvanceDetails } from "../../hooks/useEmployeeAdvances";
import { StatusBadge } from "../SalarySlip/Advances/StatusBadge";
import { formatCurrency } from "../../utils/currencyFormatter";
import formatToIndianDate from "../../utils/formatToIndianDate";

interface AdvanceDetailModalProps {
  id: string; // The name of the Employee Advance document
  onClose: () => void;
}

const AdvanceDetailModal: React.FC<AdvanceDetailModalProps> = ({
  id,
  onClose,
}) => {
  const { data, isLoading, error } = useExpenseAdvanceDetails(id);

  if (!id) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-lg shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b">
          <h2 className="font-semibold text-lg text-gray-800">
            Advance Details: {id}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
          >
            <X size={22} />
          </button>
        </div>

        <div className="p-5 max-h-[80vh] overflow-y-auto">
          {isLoading && <p className="text-center py-10">Loading details...</p>}
          {error && (
            <p className="text-red-500 text-center py-10">
              Error loading data: {error.message}
            </p>
          )}
          
          {data && (
            <div className="space-y-4">
              <p className="text-sm">
                <span className="font-medium text-gray-600">Employee:</span> {data.employee_name}
              </p>
              <p className="text-sm">
                <span className="font-medium text-gray-600">Posting Date:</span> {formatToIndianDate(data.posting_date)}
              </p>
              <p className="text-sm">
                <span className="font-medium text-gray-600">Amount:</span> {formatCurrency(data.advance_amount)} {data.currency}
              </p>
              <p className="text-sm">
                <span className="font-medium text-gray-600">Purpose:</span> {data.purpose}
              </p>
              <p className="flex items-center text-sm">
                <span className="font-medium text-gray-600 mr-2">Status:</span> 
                <StatusBadge status={data.status} />
              </p>

              {/* Breakup Section */}
              {data.expenses && data.expenses.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <h3 className="font-semibold text-md mb-3">Breakup Items ({data.expenses.length})</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto border p-2 rounded">
                    {data.expenses.map((expense: any, index: number) => (
                      <div key={index} className="bg-gray-50 p-3 rounded text-sm border">
                        <p><strong>Type:</strong> {expense.expense_type}</p>
                        <p><strong>Amount:</strong> {formatCurrency(expense.amount)}</p>
                        <p className="truncate"><strong>Description:</strong> {expense.description || '-'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvanceDetailModal;